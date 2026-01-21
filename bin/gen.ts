#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Board } from "../src/lib/chess";
import { parsePGN } from "../src/lib/pgn";
import { parseSAN } from "../src/lib/san";
import type { ParsedMove } from "../src/lib/types";

type OpeningRow = {
  eco: string;
  name: string;
  pgn: string;
};

type OpeningOutput = OpeningRow & {
  moves: ParsedMove[];
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

async function fetchLichess(fen: string): Promise<LichessResponse> {
  if (typeof fetch !== "function") {
    throw new Error("fetch is not available in this Node runtime");
  }
  const url = `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Lichess request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as LichessResponse;
}

// Build a trie from all openings
function buildTrie(rows: OpeningRow[]): TrieNode {
  const root: TrieNode = { children: new Map(), openings: [] };

  for (const row of rows) {
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
async function walkTree(root: TrieNode): Promise<OpeningOutput[]> {
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

      const response = await fetchLichess(fen);

      // Populate all child openings from this single response
      for (const [san, child] of childrenWithOpenings) {
        const match = response.moves.find((m) => m.san === san);
        if (!match) {
          // Log warning but continue - some rare moves might not be in masters DB
          console.warn(`\nSAN "${san}" not found for path: ${movePath.join(" ")} ${san}`);
          continue;
        }

        for (const { row, parsed } of child.openings) {
          output.push({
            eco: row.eco,
            name: row.name,
            pgn: row.pgn,
            moves: parsed,
            white: match.white,
            draws: match.draws,
            black: match.black,
          });
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

  return output;
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

  // Build trie from openings
  const root = buildTrie(rows);
  const totalRequests = countRequests(root);
  console.log(`Tree built. Need ${totalRequests} requests to Lichess`);

  // Walk tree and fetch data
  const output = await walkTree(root);

  const file =
    `// Generated by bin/gen.ts. Do not edit by hand.\n` +
    `import type { ParsedMove } from "./types";\n\n` +
    `export type Opening = {\n` +
    `  eco: string;\n` +
    `  name: string;\n` +
    `  pgn: string;\n` +
    `  moves: ParsedMove[];\n` +
    `  white: number;\n` +
    `  draws: number;\n` +
    `  black: number;\n` +
    `};\n\n` +
    `export const openings: Opening[] = ${JSON.stringify(output, null, 2)};\n`;

  fs.writeFileSync(outPath, file, "utf8");
  console.log(`Generated ${output.length} openings -> ${outPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
