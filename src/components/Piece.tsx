import React from "react";
import type { PieceInfo } from "../lib/types";

type PieceProps = {
  piece: PieceInfo;
};

export function Piece({ piece }: PieceProps) {
  if (piece.isEmpty) return null;

  return (
    <span className={`piece ${piece.name} ${piece.isBlack ? "black" : "white"}`}>
      {piece.symbol}
    </span>
  );
}
