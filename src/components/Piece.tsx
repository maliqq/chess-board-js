import React from "react";
import type { PieceInfo } from "../lib/types";
import { KING, QUEEN, BISHOP, KNIGHT, ROOK, PAWN } from "../lib/constants";

type PieceProps = {
  piece: PieceInfo;
  pieceFont?: string;
};

// Open Chess Font character mapping: [whitePiece, blackPiece]
const OPEN_CHESS_FONT_MAP: Record<number, [string, string]> = {
  [KING]:   ["K", "L"],
  [QUEEN]:  ["Q", "W"],
  [BISHOP]: ["B", "V"],
  [KNIGHT]: ["N", "M"],
  [ROOK]:   ["R", "T"],
  [PAWN]:   ["P", "O"],
};

function getOpenChessFontChar(piece: PieceInfo): string {
  const mapping = OPEN_CHESS_FONT_MAP[piece.piece];
  if (!mapping) return piece.symbol;
  return piece.isBlack ? mapping[1] : mapping[0];
}

export function Piece({ piece, pieceFont }: PieceProps) {
  if (piece.isEmpty) return null;

  const isOpenChessFont = pieceFont === "Open-Chess-Font";
  const symbol = isOpenChessFont
    ? getOpenChessFontChar(piece)
    : piece.symbol;

  return (
    <span className={`piece ${piece.name} ${piece.isBlack ? "black" : "white"}`}>
      {symbol}
    </span>
  );
}
