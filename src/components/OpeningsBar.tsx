import React from 'react';

import type { Opening } from "../lib/chess/Opening";

type OpeningWithContinuation = {
  opening: Opening;
  nextSan?: string;
};

type OpeningsBarProps = {
  openings: OpeningWithContinuation[];
};

export function OpeningsBar({ openings }: OpeningsBarProps) {
  return (
    <div className="openings-bar">
      <div className="header">
        <h4>Openings</h4>
      </div>

      <div className="list">
        {openings.length === 0 ? (
          <div className="empty">No matches</div>
        ) : (
          openings.map(({ opening, nextSan }) => {
            const total = opening.white + opening.draws + opening.black;
            const whitePct = total ? (opening.white / total) * 100 : 0;
            const drawPct = total ? (opening.draws / total) * 100 : 0;
            const blackPct = total ? (opening.black / total) * 100 : 0;
            const title = `White: ${opening.white} (${whitePct.toFixed(1)}%) | Draws: ${opening.draws} (${drawPct.toFixed(1)}%) | Black: ${opening.black} (${blackPct.toFixed(1)}%)`;

            return (
              <div key={`${opening.eco}-${opening.name}`} className="opening-row">
                <div className="opening-main">
                  <span className="eco">{opening.eco}</span>
                  <span className="name">{opening.name}</span>
                </div>
                <div className="next-move">
                  {nextSan ? `Next: ${nextSan}` : "Line complete"}
                </div>
                <div className="stats-bar" title={title}>
                  <span className="white" style={{ width: `${whitePct}%` }} />
                  <span className="draw" style={{ width: `${drawPct}%` }} />
                  <span className="black" style={{ width: `${blackPct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
