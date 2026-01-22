import "./App.css";

import React, { useEffect, useMemo, useState } from "react";
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

function computeFen(baseFen: string, moves: string[], upToIndex: number): string {
  if (upToIndex === 0) return baseFen;

  const board = new ChessBoard(baseFen);
  for (let i = 0; i < upToIndex && i < moves.length; i++) {
    board.applySAN(parseSAN(moves[i]));
  }
  return board.toFen();
}

function isValidFen(fen: string): boolean {
  try {
    new ChessBoard(fen);
    return true;
  } catch {
    return false;
  }
}

const moveSound = new Audio("/sounds/Move.ogg");

const PIECE_FONTS = [
  { value: "Chess-Master", label: "Chess Master", offsetX: "14px", offsetY: "2px" },
  { value: "Open-Chess-Font", label: "Open Chess Font", offsetX: "7px", offsetY: "-1px" },
];

const COLOR_SCHEMES = [
  { id: "standard", label: "Standard", light: "#F0D9B5", dark: "#B58864" },
  { id: "green", label: "Chess.com Green", light: "#EEEED2", dark: "#779656" },
  { id: "blue", label: "Chess.com Blue", light: "#EAE9D2", dark: "#4B7399" },
];

export function App() {
  const [baseFen, setBaseFen] = useState(DEFAULT_FEN);
  const [moves, setMoves] = useState<string[]>([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [copiedField, setCopiedField] = useState<"fen" | "pgn" | null>(null);
  const [previewSan, setPreviewSan] = useState<string | null>(null);
  const [pieceFont, setPieceFont] = useState("Chess-Master");
  const [colorScheme, setColorScheme] = useState("standard");

  useEffect(() => {
    const storedFont = localStorage.getItem("pieceFont");
    const storedScheme = localStorage.getItem("colorScheme");
    if (storedFont) setPieceFont(storedFont);
    if (storedScheme) setColorScheme(storedScheme);
  }, []);

  useEffect(() => {
    localStorage.setItem("pieceFont", pieceFont);
  }, [pieceFont]);

  useEffect(() => {
    localStorage.setItem("colorScheme", colorScheme);
  }, [colorScheme]);

  const fen = useMemo(() => computeFen(baseFen, moves, viewIndex), [baseFen, moves, viewIndex]);
  const pgn = useMemo(() => sansToPgn(moves), [moves]);
  const activeColor = fen.split(" ")[1] === "b" ? "b" : "w";
  const visibleMoves = useMemo(() => moves.slice(0, viewIndex), [moves, viewIndex]);

  // Compute preview move coordinates from SAN
  const previewMove = useMemo(() => {
    if (!previewSan) return null;
    try {
      const board = new ChessBoard(fen);
      return board.getMoveCoords(parseSAN(previewSan));
    } catch {
      return null;
    }
  }, [fen, previewSan]);

  //console.log('visibleMoves=', visibleMoves, 'activeColor=', activeColor);

  const { completedOpenings, continuationOpenings, moreCount } = useMemo(() => {
    const matches = searchOpenings(visibleMoves, activeColor);
    const completed: Array<{ opening: typeof matches[0]; nextSan?: string }> = [];
    const continuations: Array<{ opening: typeof matches[0]; nextSan?: string }> = [];

    for (const opening of matches) {
      const { sans } = parsePGN(opening.pgn);
      if (sans.length <= visibleMoves.length) {
        // Completed: we've played all moves of this opening
        completed.push({ opening, nextSan: undefined });
      } else {
        // Continuation: has more moves to play
        continuations.push({ opening, nextSan: sans[visibleMoves.length] });
      }
      // Stop once we have enough
      if (completed.length + continuations.length >= TOP_OPENINGS) break;
    }

    const shown = completed.length + continuations.length;
    return { completedOpenings: completed, continuationOpenings: continuations, moreCount: matches.length - shown };
  }, [visibleMoves, activeColor]);

  const isAtEnd = viewIndex === moves.length;

  const handleMove = (san: string, _newFen: string) => {
    if (!isAtEnd) return;
    setMoves((prev) => [...prev, san]);
    setViewIndex((prev) => prev + 1);
    moveSound.currentTime = 0;
    moveSound.play();
  };

  const handleNavigate = (index: number) => {
    const clamped = Math.max(0, Math.min(index, moves.length));
    setViewIndex(clamped);
  };

  const handleReset = () => {
    setBaseFen(DEFAULT_FEN);
    setMoves([]);
    setViewIndex(0);
  };

  const handleFenChange = (newFen: string) => {
    if (isValidFen(newFen)) {
      setBaseFen(newFen);
      setMoves([]);
      setViewIndex(0);
    }
  };

  const handleCopy = async (text: string, field: "fen" | "pgn") => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleOpeningClick = (san: string) => {
    if (!isAtEnd) return;
    setMoves((prev) => [...prev, san]);
    setViewIndex((prev) => prev + 1);
    setPreviewSan(null);
    moveSound.currentTime = 0;
    moveSound.play();
  };

  const handleOpeningHover = (san: string | null) => {
    setPreviewSan(san);
  };

  return (
    <div className="app" style={{
      "--piece-font": `'${pieceFont}'`,
      "--piece-offset-x": PIECE_FONTS.find(f => f.value === pieceFont)?.offsetX ?? "0px",
      "--piece-offset-y": PIECE_FONTS.find(f => f.value === pieceFont)?.offsetY ?? "0px",
      "--square-light": COLOR_SCHEMES.find(c => c.id === colorScheme)?.light ?? "#F0D9B5",
      "--square-dark": COLOR_SCHEMES.find(c => c.id === colorScheme)?.dark ?? "#B58864",
    } as React.CSSProperties}>
      <MoveList moves={moves} currentIndex={viewIndex} onNavigate={handleNavigate} />

      <div className="center-panel">
        <Board fen={fen} swapped={flipped} onMove={handleMove} previewMove={previewMove} pieceFont={pieceFont} />

        <div className="controls">
          <button type="button" onClick={handleReset} className="btn">
            <RotateCcw size={14} />
            Reset
          </button>
          <button type="button" onClick={() => setFlipped((f) => !f)} className="btn">
            <FlipVertical2 size={14} />
            Flip
          </button>
          <select
            value={pieceFont}
            onChange={(e) => setPieceFont(e.target.value)}
            className="font-select"
          >
            {PIECE_FONTS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
          <div className="scheme-picker">
            {COLOR_SCHEMES.map((scheme) => (
              <button
                key={scheme.id}
                type="button"
                className={`scheme-switch ${scheme.id === colorScheme ? "active" : ""}`}
                style={{
                  background: `linear-gradient(180deg, ${scheme.light} 50%, ${scheme.dark} 50%)`,
                }}
                title={scheme.label}
                onClick={() => setColorScheme(scheme.id)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <label>PGN</label>
          <div className="field-row">
            <textarea value={pgn} readOnly />
            <button type="button" onClick={() => handleCopy(pgn, "pgn")} className="copy-btn" title="Copy PGN">
              <Copy size={14} className={copiedField === "pgn" ? "copied" : ""} />
            </button>
          </div>
        </div>

        <div className="field">
          <label>FEN</label>
          <div className="field-row">
            <input
              type="text"
              value={fen}
              onChange={(e) => handleFenChange(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                const pasted = e.clipboardData.getData("text");
                handleFenChange(pasted.trim());
              }}
            />
            <button type="button" onClick={() => handleCopy(fen, "fen")} className="copy-btn" title="Copy FEN">
              <Copy size={14} className={copiedField === "fen" ? "copied" : ""} />
            </button>
          </div>
        </div>
      </div>

      <OpeningsBar
        completed={completedOpenings}
        continuations={continuationOpenings}
        moreCount={moreCount}
        onMoveClick={handleOpeningClick}
        onMoveHover={handleOpeningHover}
      />
    </div>
  );
}
