import React from "react";
import type { PieceInfo } from "../lib/types";
import { KING, QUEEN, BISHOP, KNIGHT, ROOK, PAWN } from "../lib/constants";
import { ChessBishop, ChessKing, ChessKnight, ChessPawn, ChessQueen, ChessRook } from "lucide-react";
import cn from "classnames";

type PieceProps = {
  piece: PieceInfo;
  pieceFont?: string;
  pieceIcon: boolean;
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

const PIECE_ICON_MAP: Record<number, React.ComponentType<{ size?: number | string; className?: string; color?: string }>> = {
  [KING]: ChessKing,
  [QUEEN]: ChessQueen,
  [BISHOP]: ChessBishop,
  [KNIGHT]: ChessKnight,
  [ROOK]: ChessRook,
  [PAWN]: ChessPawn,
};

function getOpenChessFontChar(piece: PieceInfo): string {
  const mapping = OPEN_CHESS_FONT_MAP[piece.piece];
  if (!mapping) return piece.symbol;
  return piece.isBlack ? mapping[1] : mapping[0];
}

export function Piece({ piece, pieceFont, pieceIcon }: PieceProps) {
  if (piece.isEmpty) return null;

  let symbol = piece.symbol;

  let classes = ["piece", piece.name, piece.isBlack ? "black" : "white"];

  if (pieceFont == "open-chess") {
    symbol = getOpenChessFontChar(piece);
  } else if (pieceFont.startsWith("chessvetica")) {
    symbol = piece.letter.toUpperCase();
    classes.push('chessvetica');
  }

  let icon = null;
  if (pieceIcon) {
    const iconColor = piece?.isBlack ? "#1b1b1b" : "#f8f5f0";
    const IconComponent = PIECE_ICON_MAP[piece.piece];
    icon = <IconComponent
          className={cn("piece", piece.name, piece.isBlack ? "black" : "white", "lucide")}
          size="30"
          strokeWidth={2}
          fill={piece.isBlack ? "black" : "none"}
          color="#1b1b1b"
        />;
  }

  return (
    <span className={cn(classes)}>
      {icon || symbol}
    </span>
  );
}
