import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Board as ChessBoard } from "./lib/chess";
import { parseSAN } from "./lib/san";
import { Board } from "./components/Board";
import { MoveList } from "./components/MoveList";
import { sansToPgn } from "./lib/openings-search";

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

// Compute FEN after playing moves up to a given index
function computeFen(moves: string[], upToIndex: number): string {
  if (upToIndex === 0) return DEFAULT_FEN;

  const board = new ChessBoard(DEFAULT_FEN);
  for (let i = 0; i < upToIndex && i < moves.length; i++) {
    board.applySAN(parseSAN(moves[i]));
  }
  return board.toFen();
}

function App() {
  const [moves, setMoves] = useState<string[]>([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const fen = useMemo(() => computeFen(moves, viewIndex), [moves, viewIndex]);
  const pgn = useMemo(() => sansToPgn(moves), [moves]);
  const isAtEnd = viewIndex === moves.length;

  const handleMove = (san: string, newFen: string) => {
    // Only allow moves when viewing the latest position
    if (!isAtEnd) return;

    setMoves((prev) => [...prev, san]);
    setViewIndex((prev) => prev + 1);
  };

  const handleNavigate = (index: number) => {
    const clamped = Math.max(0, Math.min(index, moves.length));
    setViewIndex(clamped);
  };

  const handleReset = () => {
    setMoves([]);
    setViewIndex(0);
  };

  return (
    <div className="app">
      <MoveList moves={moves} currentIndex={viewIndex} onNavigate={handleNavigate} />

      <Board fen={fen} swapped={flipped} onMove={handleMove} />

      <div className="side">
        <div className="buttons">
          <button type="button" onClick={handleReset}>
            Reset
          </button>
          <button type="button" onClick={() => setFlipped((f) => !f)}>
            Flip Board
          </button>
        </div>

        <h4>PGN</h4>
        <textarea id="pgn" value={pgn} readOnly></textarea>

        <h4>FEN</h4>
        <textarea id="fen" value={fen} readOnly></textarea>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
