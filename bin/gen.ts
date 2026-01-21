#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Board } from "../src/lib/chess";
import { parsePGN } from "../src/lib/pgn";
import { parseSAN } from "../src/lib/san";
import type { ParsedMove } from "../src/lib/types";

// Config: include parsed moves in output (increases file size ~3x)
const INCLUDE_MOVES = false;

type OpeningRow = {
  eco: string;
  name: string;
  pgn: string;
};

type OpeningOutput = OpeningRow & {
  moves?: ParsedMove[];
  white: number;
  draws: number;
  black: number;
};

type LichessMove = {
  san: string;
  white: number;
  draws: number;
  black: number;
};

type LichessResponse = {
  white: number;
  draws: number;
  black: number;
  moves: LichessMove[];
};

// Trie node representing a position after a sequence of moves
type TrieNode = {
  children: Map<string, TrieNode>;
  // Openings that end at this exact position
  openings: Array<{ row: OpeningRow; parsed: ParsedMove[] }>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");
const datDir = path.join(projectRoot, "dat");
const outPath = path.join(projectRoot, "src", "lib", "openings.ts");

function parseTsv(content: string) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [] as OpeningRow[];
  const headers = lines[0].split("\t");
  const ecoIdx = headers.indexOf("eco");
  const nameIdx = headers.indexOf("name");
  const pgnIdx = headers.indexOf("pgn");

  const rows: OpeningRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const eco = cols[ecoIdx] || "";
    const name = cols[nameIdx] || "";
    const pgn = cols[pgnIdx] || "";
    if (eco && name && pgn) {
      rows.push({ eco, name, pgn });
    }
  }
  return rows;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function progress(current: number, total: number, populated: number) {
  const width = 24;
  const ratio = total === 0 ? 1 : current / total;
  const filled = Math.round(ratio * width);
  const bar = `${"#".repeat(filled)}${"-".repeat(Math.max(0, width - filled))}`;
  process.stdout.write(`\r[${bar}] ${current}/${total} reqs, ${populated} openings`);
  if (current === total) process.stdout.write("\n");
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

async function fetchLichess(fen: string): Promise<LichessResponse> {
  if (typeof fetch !== "function") {
    throw new Error("fetch is not available in this Node runtime");
  }
  const url = `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}`;

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Lichess request failed: ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as LichessResponse;
    } catch (err) {
      lastError = err as Error;
      const isRetryable =
        lastError.message.includes("ECONNRESET") ||
        lastError.message.includes("ETIMEDOUT") ||
        lastError.message.includes("ENOTFOUND") ||
        lastError.message.includes("fetch failed");

      if (isRetryable && attempt < MAX_RETRIES) {
        console.warn(`\nRetry ${attempt}/${MAX_RETRIES} after error: ${lastError.message}`);
        await sleep(RETRY_DELAY * attempt);
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

// Load existing openings from output file (for retry support)
function loadExistingOpenings(): Map<string, OpeningOutput> {
  const existing = new Map<string, OpeningOutput>();
  if (!fs.existsSync(outPath)) return existing;

  try {
    const content = fs.readFileSync(outPath, "utf8");
    // Extract JSON array from the file
    const match = content.match(/export const openings: Opening\[\] = (\[[\s\S]*\]);/);
    if (match) {
      const openings = JSON.parse(match[1]) as OpeningOutput[];
      for (const opening of openings) {
        const hasStats =
          typeof opening.white === "number" &&
          typeof opening.draws === "number" &&
          typeof opening.black === "number";
        if (hasStats) existing.set(opening.pgn, opening);
      }
    }
  } catch {
    // Ignore parse errors, start fresh
  }
  return existing;
}

// Build a trie from all openings, excluding already-fetched ones
function buildTrie(rows: OpeningRow[], existing: Map<string, OpeningOutput>): TrieNode {
  const root: TrieNode = { children: new Map(), openings: [] };

  for (const row of rows) {
    // Skip if already fetched
    if (existing.has(row.pgn)) continue;

    const { parsed, sans } = parsePGN(row.pgn);
    let node = root;

    // Traverse/create path for each move
    for (const san of sans) {
      if (!node.children.has(san)) {
        node.children.set(san, { children: new Map(), openings: [] });
      }
      node = node.children.get(san)!;
    }

    // Mark this node as an opening endpoint
    node.openings.push({ row, parsed });
  }

  return root;
}

// Count total requests needed (nodes with children that have openings)
function countRequests(node: TrieNode): number {
  let count = 0;

  // We need a request at this node if any child has openings or descendants with openings
  const hasOpeningsInSubtree = (n: TrieNode): boolean => {
    if (n.openings.length > 0) return true;
    for (const child of n.children.values()) {
      if (hasOpeningsInSubtree(child)) return true;
    }
    return false;
  };

  // Check if any child needs data
  for (const child of node.children.values()) {
    if (hasOpeningsInSubtree(child)) {
      count++; // We need a request at this node
      break;
    }
  }

  // Recurse into children
  for (const child of node.children.values()) {
    count += countRequests(child);
  }

  return count;
}

// Walk the trie and fetch data from Lichess
// Returns { output, error } - output contains all successfully fetched openings
async function walkTree(root: TrieNode): Promise<{ output: OpeningOutput[]; error: Error | null }> {
  const output: OpeningOutput[] = [];
  const totalRequests = countRequests(root);
  let requestCount = 0;

  // BFS queue: [node, moves path to reach this node]
  const queue: Array<{ node: TrieNode; movePath: string[] }> = [];
  queue.push({ node: root, movePath: [] });

  while (queue.length > 0) {
    const { node, movePath } = queue.shift()!;

    // Check if we need to make a request (any child has openings)
    const childrenWithOpenings: Array<[string, TrieNode]> = [];
    const childrenToTraverse: Array<[string, TrieNode]> = [];

    for (const [san, child] of node.children) {
      if (child.openings.length > 0) {
        childrenWithOpenings.push([san, child]);
      }
      if (child.children.size > 0) {
        childrenToTraverse.push([san, child]);
      }
    }

    // Make request if there are children with openings
    if (childrenWithOpenings.length > 0) {
      // Build board state by replaying moves
      const board = new Board();
      for (const san of movePath) {
        board.applySAN(parseSAN(san));
      }
      const fen = board.toFen();

      requestCount++;
      progress(requestCount, totalRequests, output.length);

      let response: LichessResponse;
      try {
        response = await fetchLichess(fen);
      } catch (err) {
        // Return partial results on error
        return { output, error: err as Error };
      }

      // Populate all child openings from this single response
      for (const [san, child] of childrenWithOpenings) {
        const match = response.moves.find((m) => m.san === san);
        if (!match) {
          // Log warning but continue - some rare moves might not be in masters DB
          console.warn(`\nSAN "${san}" not found for path: ${movePath.join(" ")} ${san}`);
          continue;
        }

        for (const { row, parsed } of child.openings) {
          const entry: OpeningOutput = {
            ...row,
            white: match.white,
            draws: match.draws,
            black: match.black,
          };
          if (INCLUDE_MOVES) {
            entry.moves = parsed;
          }
          output.push(entry);
        }
      }

      if (requestCount < totalRequests) {
        await sleep(1000);
      }
    }

    // Add children that need traversal to queue
    for (const [san, child] of childrenToTraverse) {
      queue.push({ node: child, movePath: [...movePath, san] });
    }
  }

  return { output, error: null };
}

function saveOutput(output: OpeningOutput[]) {
  const movesField = INCLUDE_MOVES ? `  moves: ParsedMove[];\n` : "";
  const importLine = INCLUDE_MOVES ? `import type { ParsedMove } from "./types";\n\n` : "";

  const file =
    `// Generated by bin/gen.ts. Do not edit by hand.\n` +
    importLine +
    `export type Opening = import(\"./chess/Opening\").Opening & {\n` +
    movesField +
    `};\n\n` +
    `export const openings: Opening[] = ${JSON.stringify(output, null, 2)};\n`;

  fs.writeFileSync(outPath, file, "utf8");
}

async function run() {
  const tsvFiles = fs
    .readdirSync(datDir)
    .filter((file) => file.endsWith(".tsv"))
    .map((file) => path.join(datDir, file));

  const rows: OpeningRow[] = [];
  for (const file of tsvFiles) {
    const content = fs.readFileSync(file, "utf8");
    rows.push(...parseTsv(content));
  }

  console.log(`Loaded ${rows.length} openings from TSV files`);

  // Load existing openings for retry support
  const existing = loadExistingOpenings();
  if (existing.size > 0) {
    console.log(`Found ${existing.size} already-fetched openings, skipping them`);
  }

  // Build trie from openings (excluding already-fetched)
  const root = buildTrie(rows, existing);
  const totalRequests = countRequests(root);

  if (totalRequests === 0) {
    console.log("All openings already fetched, nothing to do");
    return;
  }

  console.log(`Tree built. Need ${totalRequests} requests to Lichess`);

  // Walk tree and fetch data
  const { output: newOpenings, error } = await walkTree(root);

  if (error) {
    console.error(`\nError during fetch: ${error.message}`);
    console.log("Saving partial output...");
  }

  // Merge existing + new openings
  const allOpenings = [...existing.values(), ...newOpenings];
  saveOutput(allOpenings);
  console.log(`Saved ${allOpenings.length} openings (${newOpenings.length} new) -> ${outPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
