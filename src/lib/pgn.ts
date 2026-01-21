import type { ParsedMove } from "./types";
import { parseSAN } from "./san";

export function parsePGN(data: string): ParsedMove[] {
  const moves: ParsedMove[] = [];
  const start = data.indexOf("1.");
  if (start === -1) return moves;

  data = data.slice(start);
  const movePairs = data.split(/\s?\d+\./);
  movePairs.shift();
  for (let i = 0; i < movePairs.length; i++) {
    const pair = movePairs[i].split(" {")[0];
    const mm = pair.split(/\s+/).filter(Boolean);
    if (mm[0]) moves.push(parseSAN(mm[0]));
    if (mm[1]) moves.push(parseSAN(mm[1]));
  }
  return moves;
}
