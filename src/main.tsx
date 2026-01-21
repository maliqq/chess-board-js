import "./index.css";
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Copy, RotateCcw, FlipVertical2 } from "lucide-react";
import { Board as ChessBoard } from "./lib/chess";
import { parseSAN } from "./lib/san";
import { parsePGN } from "./lib/pgn";
import { Board } from "./components/Board";
import { MoveList } from "./components/MoveList";
import { OpeningsBar } from "./components/OpeningsBar";
import { sansToPgn, searchOpenings } from "./lib/chess/Opening";

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
  const [copied, setCopied] = useState(false);

  const fen = useMemo(() => computeFen(moves, viewIndex), [moves, viewIndex]);
  const pgn = useMemo(() => sansToPgn(moves), [moves]);
  const activeColor = fen.split(" ")[1] === "b" ? "b" : "w";
  const visibleMoves = useMemo(() => moves.slice(0, viewIndex), [moves, viewIndex]);
  const openingMatches = useMemo(
    () => searchOpenings(visibleMoves, activeColor),
    [visibleMoves, activeColor]
  );

  const openingsWithContinuations = useMemo(() => {
    return openingMatches.map((opening) => {
      const { sans } = parsePGN(opening.pgn);
      const nextSan = sans[visibleMoves.length];
      return { opening, nextSan };
    });
  }, [openingMatches, visibleMoves.length]);
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

  const handleCopyFen = async () => {
    await navigator.clipboard.writeText(fen);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex gap-5 p-5 min-h-screen bg-gray-100">
      {/* LEFT: Moves List */}
      <MoveList moves={moves} currentIndex={viewIndex} onNavigate={handleNavigate} />

      {/* CENTER: Board + Controls + PGN/FEN */}
      <div className="flex flex-col gap-4">
        <Board fen={fen} swapped={flipped} onMove={handleMove} />

        {/* Controls */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50"
          >
            <FlipVertical2 size={14} />
            Flip
          </button>
        </div>

        {/* PGN */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">PGN</label>
          <textarea
            value={pgn}
            readOnly
            className="w-full h-16 px-2 py-1.5 text-xs font-mono border border-gray-300 rounded bg-white resize-none"
          />
        </div>

        {/* FEN */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">FEN</label>
          <div className="flex gap-1">
            <input
              type="text"
              value={fen}
              readOnly
              className="flex-1 px-2 py-1.5 text-xs font-mono border border-gray-300 rounded bg-white"
            />
            <button
              type="button"
              onClick={handleCopyFen}
              className="px-2 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50"
              title="Copy FEN"
            >
              <Copy size={14} className={copied ? "text-green-500" : "text-gray-600"} />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Openings Bar */}
      <OpeningsBar openings={openingsWithContinuations} />
    </div>
  );
}

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
