import type { ParsedMove } from "./types";
import { parseSAN } from "./san";

export type ParsedPGN = {
  parsed: ParsedMove[];
  sans: string[];
};

export function parsePGN(data: string): ParsedPGN {
  const parsed: ParsedMove[] = [];
  const sans: string[] = [];
  const start = data.indexOf("1.");
  if (start === -1) return { parsed, sans };

  data = data.slice(start);
  const movePairs = data.split(/\s?\d+\./);
  movePairs.shift();
  for (let i = 0; i < movePairs.length; i++) {
    const pair = movePairs[i].split(" {")[0];
    const mm = pair.split(/\s+/).filter(Boolean);
    if (mm[0]) {
      sans.push(mm[0]);
      parsed.push(parseSAN(mm[0]));
    }
    if (mm[1]) {
      sans.push(mm[1]);
      parsed.push(parseSAN(mm[1]));
    }
  }
  return { parsed, sans };
}
