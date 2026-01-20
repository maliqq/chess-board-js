import $ from "jquery";
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Board as BoardComponent } from "./components/Board";
import { Board as ChessBoard } from "./lib/chess";

let board: ChessBoard | null = null;
let hasInit = false;

function initBoardUI() {
  if (hasInit) return;
  hasInit = true;
  board = new ChessBoard("#board");
  (window as any).board = board;
  (window as any).$ = $;
  (window as any).jQuery = $;

  $("#pgn").val(localStorage.getItem("pgn"));
  $("#apply-pgn")
    .off("click")
    .on("click", function () {
      const v = $("#pgn").val();
      localStorage.setItem("pgn", String(v ?? ""));
      board?.parsePGN(String(v ?? ""));
    });
  $("#switch-turn")
    .off("change")
    .on("change", function () {
      board?.switchTurn();
    });

  document.onkeypress = function (e: any) {
    if (e.keyCode === 32) {
      board?.forward();
    } else if (e.keyCode === 26 && (e.ctrlKey || e.metaKey)) {
      board?.back();
    }
  };
}

function App() {
  useEffect(() => {
    initBoardUI();
    return () => {
      $("#apply-pgn").off("click");
      $("#switch-turn").off("change");
      document.onkeypress = null;
      hasInit = false;
      board = null;
    };
  }, []);

  return (
    <div className="app">
      <BoardComponent />

      <div className="side">
        <h4>PGN</h4>
        <textarea id="pgn"></textarea>
        <div>
          <button id="apply-pgn">Apply</button>
        </div>
        <div>
          <label>
            <input id="switch-turn" type="checkbox" /> Switch turn
          </label>
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
