import React, { useEffect, useMemo, useState } from "react";
import { FILES, RANKS } from "../lib/constants";
import { Board as ChessBoard, Piece } from "../lib/chess";
import { FileLetter } from "./FileLetter";
import { RankNumber } from "./RankNumber";
import { Square } from "./Square";
import type { PieceInfo } from "../lib/types";

type BoardProps = {
  fen: string;
};

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

function moveKey(x: number, y: number) {
  return `${x}:${y}`;
}

export function Board({ fen }: BoardProps) {
  const boardModel = useMemo(() => {
    try {
      return new ChessBoard(fen || DEFAULT_FEN);
    } catch {
      return new ChessBoard(DEFAULT_FEN);
    }
  }, [fen]);

  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);

  const possibleMoveSet = useMemo(() => new Set(possibleMoves), [possibleMoves]);

  const files = FILES.split("");
  const ranks = RANKS.split("");

  const handleSquareClick = (x: number, y: number) => {
    const piece = Piece.fromCode(boardModel.get(x, y));
    if (piece.isEmpty) {
      setSelected(null);
      setPossibleMoves([]);
      return;
    }

    setSelected([x, y]);
    const moves = boardModel.possibleMoves(x, y);
    setPossibleMoves(moves.map((move) => moveKey(move[0], move[1])));
  };

  useEffect(() => {
    setSelected(null);
    setPossibleMoves([]);
  }, [fen]);

  return (
    <div className="board">
      {ranks.map((rankChar, rowIndex) => {
        const rank = parseInt(rankChar, 10);
        return (
          <div className="row" key={`${rankChar}-${rowIndex}`}>
            <RankNumber value={rankChar} />
            {files.map((file, fileIndex) => {
              const pieceCode = boardModel.get(rowIndex, fileIndex);
              const piece = Piece.fromCode(pieceCode) as PieceInfo;
              const isSelected = selected?.[0] === rowIndex && selected?.[1] === fileIndex;
              const isPossibleMoveTo = possibleMoveSet.has(moveKey(rowIndex, fileIndex));
              return (
                <Square
                  key={`${file}${rankChar}`}
                  file={file}
                  rank={rank}
                  isMoveFrom={false}
                  isMoveTo={false}
                  isSelected={isSelected}
                  isPossibleMoveTo={isPossibleMoveTo}
                  piece={piece.isEmpty ? undefined : piece}
                  onClick={() => handleSquareClick(rowIndex, fileIndex)}
                />
              );
            })}
          </div>
        );
      })}
      <div className="files">
        <div className="corner"></div>
        {files.map((file, index) => (
          <FileLetter key={`${file}-${index}`} value={file} />
        ))}
      </div>
    </div>
  );
}
