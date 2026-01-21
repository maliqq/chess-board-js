import "./App.css";
import { useMemo, useState } from "react";
import { Copy, RotateCcw, FlipVertical2 } from "lucide-react";
import { Board as ChessBoard } from "./lib/chess";
import { parseSAN } from "./lib/san";
import { parsePGN } from "./lib/pgn";
import { Board } from "./components/Board";
import { MoveList } from "./components/MoveList";
import { OpeningsBar } from "./components/OpeningsBar";
import { sansToPgn, searchOpenings } from "./lib/chess/Opening";

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
const TOP_OPENINGS = 20;

function computeFen(moves: string[], upToIndex: number): string {
  if (upToIndex === 0) return DEFAULT_FEN;

  const board = new ChessBoard(DEFAULT_FEN);
  for (let i = 0; i < upToIndex && i < moves.length; i++) {
    board.applySAN(parseSAN(moves[i]));
  }
  return board.toFen();
}

export function App() {
  const [moves, setMoves] = useState<string[]>([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  const fen = useMemo(() => computeFen(moves, viewIndex), [moves, viewIndex]);
  const pgn = useMemo(() => sansToPgn(moves), [moves]);
  const activeColor = fen.split(" ")[1] === "b" ? "b" : "w";
  const visibleMoves = useMemo(() => moves.slice(0, viewIndex), [moves, viewIndex]);

  const openingsWithContinuations = useMemo(() => {
    const matches = searchOpenings(visibleMoves, activeColor).slice(0, TOP_OPENINGS);
    return matches.map((opening) => {
      const { sans } = parsePGN(opening.pgn);
      const nextSan = sans[visibleMoves.length];
      return { opening, nextSan };
    });
  }, [visibleMoves, activeColor]);

  const isAtEnd = viewIndex === moves.length;

  const handleMove = (san: string, _newFen: string) => {
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
    <div className="app">
      <MoveList moves={moves} currentIndex={viewIndex} onNavigate={handleNavigate} />

      <div className="center-panel">
        <Board fen={fen} swapped={flipped} onMove={handleMove} />

        <div className="controls">
          <button type="button" onClick={handleReset} className="btn">
            <RotateCcw size={14} />
            Reset
          </button>
          <button type="button" onClick={() => setFlipped((f) => !f)} className="btn">
            <FlipVertical2 size={14} />
            Flip
          </button>
        </div>

        <div className="field">
          <label>PGN</label>
          <textarea value={pgn} readOnly />
        </div>

        <div className="field">
          <label>FEN</label>
          <div className="fen-row">
            <input type="text" value={fen} readOnly />
            <button type="button" onClick={handleCopyFen} className="copy-btn" title="Copy FEN">
              <Copy size={14} className={copied ? "copied" : ""} />
            </button>
          </div>
        </div>
      </div>

      <OpeningsBar openings={openingsWithContinuations} />
    </div>
  );
}
