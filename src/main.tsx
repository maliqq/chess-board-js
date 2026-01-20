import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Board } from "./components/Board";

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

function App() {
  const [fenInput, setFenInput] = useState(DEFAULT_FEN);
  const fen = useMemo(() => fenInput.trim() || DEFAULT_FEN, [fenInput]);

  return (
    <div className="app">
      <Board fen={fen} />

      <div className="side">
        <h4>FEN</h4>
        <textarea
          id="fen"
          value={fenInput}
          onChange={(e) => setFenInput(e.target.value)}
        ></textarea>
        <div>
          <button type="button" onClick={() => setFenInput(DEFAULT_FEN)}>
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
