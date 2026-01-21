import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Board } from "./components/Board";
import { sansToPgn } from "./lib/openings-search";

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

function App() {
  const [fenInput, setFenInput] = useState(DEFAULT_FEN);
  const [moves, setMoves] = useState<string[]>([]);
  const fen = useMemo(() => fenInput.trim() || DEFAULT_FEN, [fenInput]);
  const pgn = useMemo(() => sansToPgn(moves), [moves]);

  const handleMove = (san: string, newFen: string) => {
    setMoves((prev) => [...prev, san]);
    setFenInput(newFen);
  };

  const handleReset = () => {
    setFenInput(DEFAULT_FEN);
    setMoves([]);
  };

  return (
    <div className="app">
      <Board fen={fen} onMove={handleMove} />

      <div className="side">
        <h4>PGN</h4>
        <textarea id="pgn" value={pgn} readOnly></textarea>

        <h4>FEN</h4>
        <textarea
          id="fen"
          value={fenInput}
          onChange={(e) => setFenInput(e.target.value)}
        ></textarea>
        <div>
          <button type="button" onClick={handleReset}>
            Reset
          </button>
        </div>
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
