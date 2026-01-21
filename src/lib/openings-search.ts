import { openings, type Opening } from "./openings";

/**
 * Convert array of SAN moves to PGN string
 * ["e4", "e5", "Nf3"] -> "1. e4 e5 2. Nf3"
 */
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

/**
 * Find openings that match the given moves
 * Returns openings where the PGN starts with the user's moves
 */
export function searchOpenings(sans: string[]): Opening[] {
  if (sans.length === 0) return [];

  const pgn = sansToPgn(sans);
  return openings.filter((o) => o.pgn.startsWith(pgn));
}

/**
 * Find the exact opening for the given moves (if any)
 */
export function findExactOpening(sans: string[]): Opening | undefined {
  if (sans.length === 0) return undefined;

  const pgn = sansToPgn(sans);
  return openings.find((o) => o.pgn === pgn);
}

/**
 * Find the current opening name for a position
 * Returns the longest matching opening (most specific)
 */
export function currentOpening(sans: string[]): Opening | undefined {
  if (sans.length === 0) return undefined;

  const pgn = sansToPgn(sans);

  // Find all openings that are a prefix of user's moves
  const matches = openings.filter((o) => pgn.startsWith(o.pgn));

  if (matches.length === 0) return undefined;

  // Return the longest (most specific) match
  return matches.reduce((longest, o) =>
    o.pgn.length > longest.pgn.length ? o : longest
  );
}
