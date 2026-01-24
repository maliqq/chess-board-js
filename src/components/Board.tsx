import React, { useEffect, useMemo, useState } from "react";
import { FILES, PAWN, KING, PIECE_LETTERS, RANKS } from "../lib/constants";
import { Board as ChessBoard, Piece } from "../lib/chess";
import { FileLetter } from "./FileLetter";
import { RankNumber } from "./RankNumber";
import { Square } from "./Square";
import type { PieceInfo } from "../lib/types";

type BoardProps = {
  fen: string;
  swapped?: boolean;
  onMove?: (san: string, newFen: string) => void;
  previewMove?: { from: [number, number]; to: [number, number] } | null;
  pieceFont?: string;
  pieceTheme?: string;
  showPinned?: boolean;
  showUndefended?: boolean;
};

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

function moveKey(x: number, y: number) {
  return `${x}:${y}`;
}

export function Board({
  fen,
  swapped = false,
  onMove,
  previewMove,
  pieceFont,
  pieceTheme,
  showPinned = true,
  showUndefended = true,
}: BoardProps) {
  const [boardModel, setBoardModel] = useState(() => {
    try {
      return new ChessBoard(fen || DEFAULT_FEN);
    } catch {
      return new ChessBoard(DEFAULT_FEN);
    }
  });

  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [dragFrom, setDragFrom] = useState<[number, number] | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<number[][]>([]);

  const possibleMoveSet = useMemo(
    () => new Set(possibleMoves.map((m) => moveKey(m[0], m[1]))),
    [possibleMoves]
  );
  const possibleCaptureSet = useMemo(
    () => new Set(possibleMoves.filter((m) => m[2] === "capture").map((m) => moveKey(m[0], m[1]))),
    [possibleMoves]
  );
  const checkState = useMemo(() => boardModel.getCheckState(), [boardModel]);

  const files = swapped ? FILES.split("").reverse() : FILES.split("");
  const ranks = swapped ? RANKS.split("").reverse() : RANKS.split("");

  const attemptMove = (fromX: number, fromY: number, toX: number, toY: number) => {
    const movedPiece = Piece.fromCode(boardModel.get(fromX, fromY));
    if (movedPiece.isEmpty) return false;

    const possible = boardModel.possibleMoves(fromX, fromY);
    const matchingMove = possible.find((m) => m[0] === toX && m[1] === toY);
    if (!matchingMove) return false;

    const clickedPiece = Piece.fromCode(boardModel.get(toX, toY));
    const isCapture = !clickedPiece.isEmpty || matchingMove[2] === "capture";

    const toSquare = FILES[toY] + RANKS[toX];
    let san = "";
    if (movedPiece.piece === KING && Math.abs(toY - fromY) === 2) {
      san = toY > fromY ? "O-O" : "O-O-O";
    } else if (movedPiece.piece === PAWN) {
      san = isCapture ? FILES[fromY] + "x" + toSquare : toSquare;
    } else {
      const pieceLetter = PIECE_LETTERS[movedPiece.piece] || "";
      san = pieceLetter + (isCapture ? "x" : "") + toSquare;
    }

    boardModel.move(fromX, fromY, toX, toY, san);
    boardModel.switchTurn();
    const checkStateAfterMove = boardModel.getCheckState();
    if (checkStateAfterMove.isCheckmate && !san.endsWith("#")) {
      san += "#";
    } else if (checkStateAfterMove.isCheck && !san.endsWith("+")) {
      san += "+";
    }

    if (onMove) {
      onMove(san, boardModel.toFen());
    }

    setBoardModel(boardModel);
    setSelected(null);
    setPossibleMoves([]);
    return true;
  };

  const handleSquareClick = (x: number, y: number) => {
    const clickedPiece = Piece.fromCode(boardModel.get(x, y));

    // If clicked on the already selected piece, deselect it
    if (selected && selected[0] === x && selected[1] === y) {
      setSelected(null);
      setPossibleMoves([]);
      return;
    }

    // If we have a selected piece and clicked on a valid move target
    if (selected) {
      const [fromX, fromY] = selected;
      if (attemptMove(fromX, fromY, x, y)) return;
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

  const handleDragStart = (x: number, y: number) => {
    const piece = Piece.fromCode(boardModel.get(x, y));
    if (piece.isEmpty || piece.isBlack !== boardModel.isBlack) return;
    setDragFrom([x, y]);
    setSelected([x, y]);
    setPossibleMoves(boardModel.possibleMoves(x, y));
  };

  const handleDragEnd = () => {
    setDragFrom(null);
    setSelected(null);
    setPossibleMoves([]);
  };

  const handleDrop = (x: number, y: number) => {
    if (!dragFrom) return;
    attemptMove(dragFrom[0], dragFrom[1], x, y);
    setDragFrom(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!dragFrom) return;
    event.preventDefault();
  };

  // Reset board when fen prop changes
  useEffect(() => {
    try {
      setBoardModel(new ChessBoard(fen || DEFAULT_FEN));
    } catch {
      setBoardModel(new ChessBoard(DEFAULT_FEN));
    }
    setSelected(null);
    setDragFrom(null);
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
              const isPossibleCapture = possibleCaptureSet.has(moveKey(boardRowIndex, boardColIndex));
              const isPreviewFrom =
                previewMove?.from[0] === boardRowIndex && previewMove?.from[1] === boardColIndex;
              const isPreviewTo =
                previewMove?.to[0] === boardRowIndex && previewMove?.to[1] === boardColIndex;
              const isKingSquare =
                checkState.kingPos?.[0] === boardRowIndex && checkState.kingPos?.[1] === boardColIndex;
              const isUndefended = piece.isEmpty
                ? false
                : showUndefended &&
                  piece.isBlack === boardModel.isBlack &&
                  boardModel.isSquareAttackedBy(boardRowIndex, boardColIndex, !piece.isBlack) &&
                  !boardModel.isSquareAttackedBy(boardRowIndex, boardColIndex, piece.isBlack);
              const isPinned = piece.isEmpty ? false : showPinned && boardModel.isPinnedPiece(boardRowIndex, boardColIndex);
              return (
                <Square
                  key={`${file}${rankChar}`}
                  file={file}
                  rank={rank}
                  isMoveFrom={isPreviewFrom}
                  isMoveTo={isPreviewTo}
                  isSelected={isSelected}
                  isPossibleMoveTo={isPossibleMoveTo}
                  isCheck={isKingSquare && checkState.isCheck && !checkState.isCheckmate}
                  isCheckmate={isKingSquare && checkState.isCheckmate}
                  isAttacked={isPossibleCapture}
                  isUndefended={isUndefended}
                  isPinned={isPinned}
                  piece={piece.isEmpty ? undefined : piece}
                  pieceFont={pieceFont}
                  pieceTheme={pieceTheme}
                  canDrag={!piece.isEmpty && piece.isBlack === boardModel.isBlack}
                  onDragStart={() => handleDragStart(boardRowIndex, boardColIndex)}
                  onDragEnd={handleDragEnd}
                  onDrop={() => handleDrop(boardRowIndex, boardColIndex)}
                  onDragOver={handleDragOver}
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
