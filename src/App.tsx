import "./App.css";

import React, { useEffect, useMemo, useState } from "react";
import { Copy, RotateCcw, FlipVertical2, Link } from "lucide-react";
import { Board as ChessBoard } from "./lib/chess";
import { parseSAN } from "./lib/san";
import { Board } from "./components/Board";
import { MoveList } from "./components/MoveList";
import { OpeningsBar } from "./components/OpeningsBar";
import { parsePGN } from "./lib/pgn";
import { sansToPgn, searchOpenings, searchOpeningsByQuery } from "./lib/chess/Opening";
import cn from "classnames";

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

const PIECE_THEME = [
  { value: "open-chess", label: "Open Chess Font", font: "open-chess", offsetX: "7px", offsetY: "0px", fontSize: "37px" },
  { value: "chess-master", label: "Chess Master", font: "chess-master", offsetX: "10px", offsetY: "3px" },
  { value: "chessvetica", label: "Chessvetica", font: "chessvetica", offsetX: "16px", offsetY: "5px", fontSize: "37px" },
  { value: "lucide", label: "Lucide", offsetX: "5px", offsetY: "5px" },
];

const COLOR_SCHEMES = [
  { id: "standard", label: "Standard", light: "#F0D9B5", dark: "#B58864" },
  { id: "green", label: "Chess.com Green", light: "#EEEED2", dark: "#779656" },
  { id: "blue", label: "Chess.com Blue", light: "#EAE9D2", dark: "#4B7399" },
];

function safeGetStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function resolvePieceFont(value: string | null): string {
  const fallback = "open-chess";
  if (!value) return fallback;
  return PIECE_THEME.some((theme) => theme.value === value) ? value : fallback;
}

function resolveBooleanSetting(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  return value === "true";
}

function resolveColorScheme(value: string | null): string {
  const fallback = "standard";
  if (!value) return fallback;
  return COLOR_SCHEMES.some((scheme) => scheme.id === value) ? value : fallback;
}

export function App() {
  const [baseFen, setBaseFen] = useState(DEFAULT_FEN);
  const [moves, setMoves] = useState<string[]>([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [copiedField, setCopiedField] = useState<"fen" | "pgn" | null>(null);
  const [previewSan, setPreviewSan] = useState<string | null>(null);
  const [pieceFont, setPieceFont] = useState(() =>
    resolvePieceFont(safeGetStorage("pieceFont"))
  );
  const [openingQuery, setOpeningQuery] = useState("");
  const [showPinned, setShowPinned] = useState(() =>
    resolveBooleanSetting(safeGetStorage("showPinned"), true)
  );
  const [showUndefended, setShowUndefended] = useState(() =>
    resolveBooleanSetting(safeGetStorage("showUndefended"), true)
  );
  const [colorScheme, setColorScheme] = useState(() =>
    resolveColorScheme(safeGetStorage("colorScheme"))
  );

  useEffect(() => {
    localStorage.setItem("pieceFont", pieceFont);
  }, [pieceFont]);

  useEffect(() => {
    localStorage.setItem("showPinned", String(showPinned));
  }, [showPinned]);

  useEffect(() => {
    localStorage.setItem("showUndefended", String(showUndefended));
  }, [showUndefended]);

  useEffect(() => {
    localStorage.setItem("colorScheme", colorScheme);
  }, [colorScheme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fenParam = params.get("fen");
    if (!fenParam) return;
    if (isValidFen(fenParam)) {
      setBaseFen(fenParam);
      setMoves([]);
      setViewIndex(0);
    }
  }, []);

  const fen = useMemo(() => computeFen(baseFen, moves, viewIndex), [baseFen, moves, viewIndex]);
  const pgn = useMemo(() => sansToPgn(moves), [moves]);
  const activeColor = fen.split(" ")[1] === "b" ? "b" : "w";
  const visibleMoves = useMemo(() => moves.slice(0, viewIndex), [moves, viewIndex]);
  const openingSearchResults = useMemo(() => {
    if (!openingQuery.trim()) return [];
    return searchOpeningsByQuery(openingQuery).slice(0, 50);
  }, [openingQuery]);

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

  const handleOpeningSearchSelect = (opening: { pgn: string }) => {
    if (!isAtEnd) return;
    const openingSans = parsePGN(opening.pgn).sans;
    if (openingSans.length === 0) return;
    setOpeningQuery("");

    const board = new ChessBoard(DEFAULT_FEN);
    let matchIndex = -1;
    if (board.toFen() === fen) {
      matchIndex = -1;
    }

    for (let i = 0; i < openingSans.length; i++) {
      board.applySAN(parseSAN(openingSans[i]));
      if (board.toFen() === fen) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex >= 0) {
      const remaining = openingSans.slice(matchIndex + 1);
      if (remaining.length === 0) return;
      setMoves((prev) => [...prev, ...remaining]);
      setViewIndex((prev) => prev + remaining.length);
      return;
    }

    setBaseFen(DEFAULT_FEN);
    setMoves(openingSans);
    setViewIndex(openingSans.length);
  };

  const handleOpeningHover = (san: string | null) => {
    setPreviewSan(san);
  };

  const handleShare = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("fen", fen);
    await navigator.clipboard.writeText(url.toString());
    setCopiedField("fen");
    setTimeout(() => setCopiedField(null), 1500);
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    if (fen === DEFAULT_FEN && moves.length === 0 && viewIndex === 0) {
      url.searchParams.delete("fen");
    } else {
      url.searchParams.set("fen", fen);
    }
    window.history.replaceState({}, "", url.toString());
  }, [fen]);

  const pieceTheme = PIECE_THEME.find((theme) => theme.value === pieceFont);
  const pieceThemeFont = pieceTheme?.font ?? "open-chess";

  const buttonClass =
    "inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50";

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900">
      <main
        className="flex flex-1 items-start justify-center gap-9 p-5"
        style={{
          "--piece-font": `'${pieceThemeFont}'`,
          "--piece-offset-x": pieceTheme?.offsetX,
          "--piece-offset-y": pieceTheme?.offsetY,
          "--piece-font-size": pieceTheme?.fontSize,
          "--square-light": COLOR_SCHEMES.find(c => c.id === colorScheme)?.light,
          "--square-dark": COLOR_SCHEMES.find(c => c.id === colorScheme)?.dark,
        } as React.CSSProperties}
      >
        <MoveList moves={moves} currentIndex={viewIndex} onNavigate={handleNavigate} />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col self-center">
            <div className={cn(
              "self-center rounded-full mb-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700",
              activeColor === "b" ? "bg-black" : "bg-white",
              activeColor === "b" ? "text-white" : "text-black"
            )}>
              {activeColor === "b" ? "Black to move" : "White to move"}
            </div>
            <Board
              fen={fen}
              swapped={flipped}
              onMove={handleMove}
              previewMove={previewMove}
              pieceFont={pieceFont}
              pieceTheme={pieceTheme?.value}
              showPinned={showPinned}
              showUndefended={showUndefended}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleReset} className={buttonClass}>
              <RotateCcw size={14} />
              Reset
            </button>
            <button type="button" onClick={() => setFlipped((f) => !f)} className={buttonClass}>
              <FlipVertical2 size={14} />
              Flip
            </button>
            <select
              value={pieceFont}
              onChange={(e) => setPieceFont(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              {PIECE_THEME.map((theme) => (
                <option key={theme.value} value={theme.value}>
                  {theme.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              {COLOR_SCHEMES.map((scheme) => (
                <button
                  key={scheme.id}
                  type="button"
                  className={`h-6 w-6 rounded-md border border-slate-300 ${scheme.id === colorScheme ? "outline outline-2 outline-slate-900 outline-offset-2" : ""}`}
                  style={{
                    background: `linear-gradient(180deg, ${scheme.light} 50%, ${scheme.dark} 50%)`,
                  }}
                  title={scheme.label}
                  onClick={() => setColorScheme(scheme.id)}
                />
              ))}
            </div>
            <button type="button" onClick={handleShare} className={buttonClass} title="Copy shareable link">
              <Link size={14} className={copiedField === "fen" ? "text-green-500" : ""} />
            </button>
          </div>
          <div className="flex gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showPinned}
                onChange={(e) => setShowPinned(e.target.checked)}
                className="accent-slate-900"
              />
              Show pinned
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showUndefended}
                onChange={(e) => setShowUndefended(e.target.checked)}
                className="accent-slate-900"
              />
              Show undefended
            </label>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">PGN</label>
            <div className="flex gap-1">
              <textarea
                value={pgn}
                readOnly
                className="h-16 flex-1 resize-none rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => handleCopy(pgn, "pgn")}
                className="inline-flex items-start rounded border border-slate-300 bg-white px-2 py-1.5 text-slate-600 hover:bg-slate-50"
                title="Copy PGN"
              >
                <Copy size={14} className={copiedField === "pgn" ? "text-green-500" : ""} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">FEN</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={fen}
                onChange={(e) => handleFenChange(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData("text");
                  handleFenChange(pasted.trim());
                }}
                className="flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => handleCopy(fen, "fen")}
                className="inline-flex items-start rounded border border-slate-300 bg-white px-2 py-1.5 text-slate-600 hover:bg-slate-50"
                title="Copy FEN"
              >
                <Copy size={14} className={copiedField === "fen" ? "text-green-500" : ""} />
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
          searchQuery={openingQuery}
          searchResults={openingSearchResults}
          onSearchChange={setOpeningQuery}
          onSearchSelect={handleOpeningSearchSelect}
        />
      </main>

      <footer className="mt-auto bg-white px-5 py-2 text-right text-xs text-slate-500">
        &copy; 2026 @maliqq
      </footer>
    </div>
  );
}
