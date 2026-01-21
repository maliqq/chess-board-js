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

export function searchOpenings(sans: string[], activeColor: "w" | "b" = "w"): OpeningData[] {
  if (sans.length === 0) return [];

  const pgn = sansToPgn(sans);
  const matches = openings.filter((o) => o.pgn.startsWith(pgn));

  return matches.sort((a, b) => {
    const aScore = activeColor === "b" ? a.black ?? 0 : a.white ?? 0;
    const bScore = activeColor === "b" ? b.black ?? 0 : b.white ?? 0;
    if (aScore !== bScore) return bScore - aScore;
    return a.name.localeCompare(b.name);
  });
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
