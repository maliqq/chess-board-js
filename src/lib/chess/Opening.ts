import { openings, type Opening as OpeningData } from "../openings";

export type Opening = {
  eco: string;
  name: string;
  pgn: string;
  white: number;
  draws: number;
  black: number;
};

export function sansToPgn(sans: string[]): string {
  if (sans.length === 0) return "";

  let pgn = "";
  for (let i = 0; i < sans.length; i++) {
    const moveNum = Math.floor(i / 2) + 1;
    if (i % 2 === 0) {
      pgn += (i === 0 ? "" : " ") + moveNum + ". " + sans[i];
    } else {
      pgn += " " + sans[i];
    }
  }
  return pgn;
}

function matchesPrefix(pgn: string, prefix: string): boolean {
  if (!pgn.startsWith(prefix)) return false;
  // Must be exact match or continue with space (next move)
  return pgn.length === prefix.length || pgn[prefix.length] === " ";
}

export function searchOpenings(sans: string[], activeColor: "w" | "b" = "w"): OpeningData[] {
  const prefix = sansToPgn(sans);
  //console.log('searching prefix', prefix);
  const matches = sans.length === 0 ? openings : openings.filter((o) => matchesPrefix(o.pgn, prefix));

  return matches.sort((a, b) => {
    const aScore = activeColor === "b" ? a.black ?? 0 : a.white ?? 0;
    const bScore = activeColor === "b" ? b.black ?? 0 : b.white ?? 0;
    if (aScore !== bScore) return bScore - aScore;
    return a.name.localeCompare(b.name);
  });
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function searchOpeningsByQuery(query: string): OpeningData[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(" ");

  const scored = openings.map((opening) => {
    const name = normalize(opening.name);
    const eco = normalize(opening.eco);
    const pgn = normalize(opening.pgn);
    let score = 0;

    if (eco === q) score += 300;
    else if (eco.startsWith(q)) score += 220;
    else if (eco.includes(q)) score += 120;

    if (name === q) score += 260;
    else if (name.startsWith(q)) score += 200;
    else if (name.includes(q)) score += 140;

    if (pgn.includes(q)) score += 60;

    const tokenHits = tokens.filter((t) => name.includes(t)).length;
    if (tokenHits === tokens.length) score += 120;
    else score += tokenHits * 25;

    return { opening, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.opening.name.localeCompare(b.opening.name);
    })
    .map((entry) => entry.opening);
}

export function findExactOpening(sans: string[]): OpeningData | undefined {
  if (sans.length === 0) return undefined;

  const pgn = sansToPgn(sans);
  return openings.find((o) => o.pgn === pgn);
}

export function currentOpening(sans: string[]): OpeningData | undefined {
  if (sans.length === 0) return undefined;

  const pgn = sansToPgn(sans);
  const matches = openings.filter((o) => pgn.startsWith(o.pgn));
  if (matches.length === 0) return undefined;

  return matches.reduce((longest, o) => (o.pgn.length > longest.pgn.length ? o : longest));
}
