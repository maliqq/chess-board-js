import React, { useEffect, useMemo, useState } from "react";
import { FILES, PAWN, RANKS } from "../lib/constants";
import { Board as ChessBoard, Piece } from "../lib/chess";
import { FileLetter } from "./FileLetter";
import { RankNumber } from "./RankNumber";
import { Square } from "./Square";
import type { PieceInfo } from "../lib/types";

const PIECE_LETTERS: Record<number, string> = {
  2: "B", // BISHOP
  3: "N", // KNIGHT
  4: "R", // ROOK
  5: "Q", // QUEEN
  6: "K", // KING
};

type BoardProps = {
  fen: string;
  swapped?: boolean;
  onMove?: (san: string, newFen: string) => void;
};

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

function moveKey(x: number, y: number) {
  return `${x}:${y}`;
}

export function Board({ fen, swapped = false, onMove }: BoardProps) {
  const [boardModel, setBoardModel] = useState(() => {
    try {
      return new ChessBoard(fen || DEFAULT_FEN);
    } catch {
      return new ChessBoard(DEFAULT_FEN);
    }
  });

  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<number[][]>([]);

  const possibleMoveSet = useMemo(
    () => new Set(possibleMoves.map((m) => moveKey(m[0], m[1]))),
    [possibleMoves]
  );

  const files = swapped ? FILES.split("").reverse() : FILES.split("");
  const ranks = swapped ? RANKS.split("").reverse() : RANKS.split("");

  const handleSquareClick = (x: number, y: number) => {
    const clickedPiece = Piece.fromCode(boardModel.get(x, y));

    // If we have a selected piece and clicked on a valid move target
    if (selected) {
      const isValidMove = possibleMoves.some((m) => m[0] === x && m[1] === y);

      if (isValidMove) {
        const [fromX, fromY] = selected;
        const movedPiece = Piece.fromCode(boardModel.get(fromX, fromY));
        const isCapture = !clickedPiece.isEmpty;

        // Build SAN notation
        const toSquare = FILES[y] + RANKS[x];
        let san = "";
        if (movedPiece.piece === PAWN) {
          san = isCapture ? FILES[fromY] + "x" + toSquare : toSquare;
        } else {
          const pieceLetter = PIECE_LETTERS[movedPiece.piece] || "";
          san = pieceLetter + (isCapture ? "x" : "") + toSquare;
        }

        // Apply the move
        boardModel.move(fromX, fromY, x, y);
        boardModel.switchTurn();

        // Notify parent with SAN and new FEN
        if (onMove) {
          onMove(san, boardModel.toFen());
        }

        // Force re-render with updated board
        setBoardModel(boardModel);
        setSelected(null);
        setPossibleMoves([]);
        return;
      }
    }

    // If clicked on empty square without valid move, clear selection
    if (clickedPiece.isEmpty) {
      setSelected(null);
      setPossibleMoves([]);
      return;
    }

    // Only allow selecting pieces of the current turn
    if (clickedPiece.isBlack !== boardModel.isBlack) {
      return;
    }

    // Select the piece and show possible moves
    setSelected([x, y]);
    const moves = boardModel.possibleMoves(x, y);
    setPossibleMoves(moves);
  };

  // Reset board when fen prop changes
  useEffect(() => {
    try {
      setBoardModel(new ChessBoard(fen || DEFAULT_FEN));
    } catch {
      setBoardModel(new ChessBoard(DEFAULT_FEN));
    }
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
            {files.map((file) => {
              const boardRowIndex = RANKS.indexOf(rankChar);
              const boardColIndex = FILES.indexOf(file);
              const pieceCode = boardModel.get(boardRowIndex, boardColIndex);
              const piece = Piece.fromCode(pieceCode) as PieceInfo;
              const isSelected =
                selected?.[0] === boardRowIndex && selected?.[1] === boardColIndex;
              const isPossibleMoveTo = possibleMoveSet.has(moveKey(boardRowIndex, boardColIndex));
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
                  onClick={() => handleSquareClick(boardRowIndex, boardColIndex)}
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
