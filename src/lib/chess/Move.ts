import { FILES, RANKS } from "../constants";

export class Move {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  toString(): string {
    return FILES.charAt(this.y) + RANKS.charAt(this.x);
  }

  static from(x: number, y: number): Move {
    return new Move(x, y);
  }

  static fromTuple(pos: [number, number]): Move {
    return new Move(pos[0], pos[1]);
  }
}
