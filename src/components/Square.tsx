import React from "react";
import { FILES, RANKS } from "../lib/constants";
import type { PieceInfo } from "../lib/types";
import { Piece } from "./Piece";

type SquareProps = {
  isMoveFrom: boolean;
  isMoveTo: boolean;
  isSelected: boolean;
  isPossibleMoveTo: boolean;
  piece?: PieceInfo;
  file: string;
  rank: number;
};

export function Square({
  isMoveFrom,
  isMoveTo,
  isSelected,
  isPossibleMoveTo,
  piece,
  file,
  rank,
}: SquareProps) {
  const fileIndex = FILES.indexOf(file);
  const rankIndex = RANKS.indexOf(String(rank));
  const isOdd = fileIndex !== -1 && rankIndex !== -1 ? (fileIndex + rankIndex) % 2 === 0 : true;

  const classes = ["cell", isOdd ? "odd" : "even"];
  if (isSelected) classes.push("selected");
  if (isPossibleMoveTo) classes.push("suggested");
  if (isMoveFrom) classes.push("move-from");
  if (isMoveTo) classes.push("move-to");

  return (
    <div className={classes.join(" ")} data-file={file} data-rank={rank}>
      {piece ? <Piece piece={piece} /> : null}
    </div>
  );
}
