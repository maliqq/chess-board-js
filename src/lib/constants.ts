import type { PieceInfo } from "./types";

export const EMPTY = 0;
export const PAWN = 1;
export const BISHOP = 2;
export const KNIGHT = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;
export const B = 4;

export enum MoveType {
  OUT_OF_BOARD = 0,
  POSSIBLE = 1,
  OURS = 2,
  CAPTURE = 3,
  CHECK_ON_KING = 4,
  SHADOWED = 5,
}

export const BOARD_SIZE = 8;
export const FILES = "abcdefgh";
export const RANKS = "87654321";

export const SYMBOLS: Record<string, Record<number, string>> = {
  false: {
    [KING]: "♔",
    [QUEEN]: "♕",
    [ROOK]: "♖",
    [BISHOP]: "♗",
    [KNIGHT]: "♘",
    [PAWN]: "♙",
  },
  true: {
    [KING]: "♚",
    [QUEEN]: "♛",
    [ROOK]: "♜",
    [BISHOP]: "♝",
    [KNIGHT]: "♞",
    [PAWN]: "♟",
  },
};

export const Pieces = {
  byCode: {} as Record<number, PieceInfo>,
  black: {
    Queen: QUEEN << B,
    King: KING << B,
    Rook: ROOK << B,
    Bishop: BISHOP << B,
    Knight: KNIGHT << B,
    Pawn: PAWN << B,
  },
  white: {
    Queen: QUEEN,
    King: KING,
    Rook: ROOK,
    Bishop: BISHOP,
    Knight: KNIGHT,
    Pawn: PAWN,
  },
};

export function parsePiece(piece: string): number {
  switch (piece) {
    case "R":
      return ROOK;
    case "N":
      return KNIGHT;
    case "B":
      return BISHOP;
    case "K":
      return KING;
    case "Q":
      return QUEEN;
    case "P":
      return PAWN;
    default:
      throw new Error(`unknown piece: ${piece.toString()}`);
  }
}
