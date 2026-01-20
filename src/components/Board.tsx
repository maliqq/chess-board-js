import React, { useMemo } from "react";
import { FILES, RANKS } from "../lib/constants";
import { FEN } from "../lib/fen";
import { Piece } from "../lib/chess";
import { FileNumber } from "./FileNumber";
import { RankLetter } from "./RankLetter";
import { Square } from "./Square";
import type { PieceInfo } from "../lib/types";

type BoardProps = {
  fen: string;
};

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

export function Board({ fen }: BoardProps) {
  const board = useMemo(() => {
    try {
      return FEN(fen || DEFAULT_FEN);
    } catch {
      return FEN(DEFAULT_FEN);
    }
  }, [fen]);

  const files = FILES.split("");
  const ranks = RANKS.split("");

  return (
    <div className="board">
      {ranks.map((rankChar, rowIndex) => {
        const rank = parseInt(rankChar, 10);
        const row = board[rowIndex] || [];
        return (
          <div className="row" key={`${rankChar}-${rowIndex}`}>
            <RankLetter value={rankChar} />
            {files.map((file, fileIndex) => {
              const pieceCode = row[fileIndex] ?? 0;
              const piece = Piece.fromCode(pieceCode) as PieceInfo;
              return (
                <Square
                  key={`${file}${rankChar}`}
                  file={file}
                  rank={rank}
                  isMoveFrom={false}
                  isMoveTo={false}
                  isSelected={false}
                  isPossibleMoveTo={false}
                  piece={piece.isEmpty ? undefined : piece}
                />
              );
            })}
          </div>
        );
      })}
      <div className="files">
        <div className="corner"></div>
        {files.map((file, index) => (
          <FileNumber key={`${file}-${index}`} value={file} />
        ))}
      </div>
    </div>
  );
}
