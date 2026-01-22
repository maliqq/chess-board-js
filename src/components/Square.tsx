import React from "react";
import { PAWN, FILES, RANKS } from "../lib/constants";
import type { PieceInfo } from "../lib/types";
import cn from 'classnames';
import { Piece } from "./Piece";

type SquareProps = {
  isMoveFrom: boolean;
  isMoveTo: boolean;
  isSelected: boolean;
  isPossibleMoveTo: boolean;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isAttacked?: boolean;
  isUndefended?: boolean;
  isPinned?: boolean;
  isCheckable?: boolean;
  piece?: PieceInfo;
  file: string;
  rank: number;
  pieceFont?: string;
  onClick?: () => void;
};

export function Square({
  isMoveFrom,
  isMoveTo,
  isSelected,
  isPossibleMoveTo,
  isCheck,
  isCheckmate,
  isAttacked,
  isUndefended,
  isPinned,
  isCheckable,
  piece,
  file,
  rank,
  pieceFont,
  onClick,
}: SquareProps) {
  const fileIndex = FILES.indexOf(file);
  const rankIndex = RANKS.indexOf(String(rank));
  const isLightSquare = fileIndex !== -1 && rankIndex !== -1 ? (fileIndex + rankIndex) % 2 === 0 : true;
  const isPawn = piece == PAWN;

  const classes = ["square", isLightSquare ? "odd" : "even"];
  if (isPawn) classes.push("pawn");
  if (isSelected) classes.push("selected");
  if (isPossibleMoveTo) classes.push("suggested");
  if (isMoveFrom) classes.push("move-from");
  if (isMoveTo) classes.push("move-to");
  if (isCheck) classes.push("check");
  if (isCheckmate) classes.push("checkmate");
  if (isAttacked) classes.push("attacked");
  if (isUndefended) classes.push("undefended");
  if (isPinned) classes.push("pinned");
  if (isCheckable) classes.push("checkable");

  return (
    <div className={cn(classes)} data-file={file} data-rank={rank} onClick={onClick}>
      {piece ? <Piece piece={piece} pieceFont={pieceFont} /> : null}
    </div>
  );
}
