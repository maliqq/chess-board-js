import rawOpenings from "../../dat/gen.json";
import { PGN } from "./pgn";
import type { ParsedMove } from "./types";

type RawOpening = {
  eco: string;
  name: string;
  pgn: string;
};

export type Opening = RawOpening & {
  parsed_pgn: ParsedMove[];
};

export const openings: Opening[] = (rawOpenings as RawOpening[]).map((opening) => ({
  eco: opening.eco,
  name: opening.name,
  pgn: opening.pgn,
  parsed_pgn: PGN(opening.pgn),
}));
