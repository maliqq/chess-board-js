import type { Coord } from "./chess/Coord";

export type Arrow = {
  from: Coord;
  to: Coord;
  ord: number;
};

// Draft for future PixiJS arrow rendering.
export function arrow(from: Coord, to: Coord, ord: number): Arrow {
  return { from, to, ord };
}
