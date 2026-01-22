import React from "react";
import type { PieceInfo } from "../lib/types";
import { KING, QUEEN, BISHOP, KNIGHT, ROOK, PAWN } from "../lib/constants";

type PieceProps = {
  piece: PieceInfo;
  isLightSquare?: boolean;
  pieceFont?: string;
};

// Open Chess Font character mapping
// Format: [whitePieceWhiteSquare, whitePieceBlackSquare, blackPieceWhiteSquare, blackPieceBlackSquare]
const OPEN_CHESS_FONT_MAP: Record<number, [string, string, string, string]> = {
  [KING]:   ["K", "k", "L", "l"],
  [QUEEN]:  ["Q", "q", "W", "w"],
  [BISHOP]: ["B", "b", "V", "v"],
  [KNIGHT]: ["N", "n", "M", "m"],
  [ROOK]:   ["R", "r", "T", "t"],
  [PAWN]:   ["P", "p", "O", "o"],
};

function getOpenChessFontChar(piece: PieceInfo, isLightSquare: boolean): string {
  const mapping = OPEN_CHESS_FONT_MAP[piece.piece];
  if (!mapping) return piece.symbol;

  const isWhitePiece = !piece.isBlack;
  if (isWhitePiece) {
    return isLightSquare ? mapping[0] : mapping[1];
  } else {
    return isLightSquare ? mapping[2] : mapping[3];
  }
}

export function Piece({ piece, isLightSquare = true, pieceFont }: PieceProps) {
  if (piece.isEmpty) return null;

  const isOpenChessFont = pieceFont === "Open-Chess-Font";
  const symbol = isOpenChessFont
    ? getOpenChessFontChar(piece, isLightSquare)
    : piece.symbol;

  return (
    <span className={`piece ${piece.name} ${piece.isBlack ? "black" : "white"}`}>
      {symbol}
    </span>
  );
}
