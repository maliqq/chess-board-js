import React from 'react';

import type { Opening } from "../lib/chess/Opening";

type OpeningWithContinuation = {
  opening: Opening;
  nextSan?: string;
};

type OpeningRowProps = OpeningWithContinuation & {
  onMoveClick?: (san: string) => void;
  onMoveHover?: (san: string | null) => void;
};

type OpeningsBarProps = {
  completed: OpeningWithContinuation[];
  continuations: OpeningWithContinuation[];
  onMoveClick?: (san: string) => void;
  onMoveHover?: (san: string | null) => void;
};

function OpeningRow({ opening, nextSan, onMoveClick, onMoveHover }: OpeningRowProps) {
  const total = opening.white + opening.draws + opening.black;
  const whitePct = total ? (opening.white / total) * 100 : 0;
  const drawPct = total ? (opening.draws / total) * 100 : 0;
  const blackPct = total ? (opening.black / total) * 100 : 0;
  const title = `White: ${opening.white} (${whitePct.toFixed(1)}%) | Draws: ${opening.draws} (${drawPct.toFixed(1)}%) | Black: ${opening.black} (${blackPct.toFixed(1)}%)`;

  const hasNextMove = !!nextSan;
  const handleClick = hasNextMove && onMoveClick ? () => onMoveClick(nextSan) : undefined;
  const handleMouseEnter = hasNextMove && onMoveHover ? () => onMoveHover(nextSan) : undefined;
  const handleMouseLeave = hasNextMove && onMoveHover ? () => onMoveHover(null) : undefined;

  return (
    <div
      className={`opening-row ${hasNextMove ? "clickable" : ""}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="opening-main">
        <span className="eco">{opening.eco}</span>
        <span className="name">{opening.name}</span>
      </div>
      {nextSan && <div className="next-move">Next: {nextSan}</div>}
      <div className="stats-bar" title={title}>
        <span className="white" style={{ width: `${whitePct}%` }} />
        <span className="draw" style={{ width: `${drawPct}%` }} />
        <span className="black" style={{ width: `${blackPct}%` }} />
      </div>
    </div>
  );
}

export function OpeningsBar({ completed, continuations, onMoveClick, onMoveHover }: OpeningsBarProps) {
  const hasCompleted = completed.length > 0;
  const hasContinuations = continuations.length > 0;
  const isEmpty = !hasCompleted && !hasContinuations;

  return (
    <div className="openings-bar">
      <div className="header">
        <h4>Openings</h4>
      </div>

      <div className="list">
        {isEmpty ? (
          <div className="empty">No matches</div>
        ) : (
          <>
            {hasCompleted && (
              <div className="completed-section">
                {completed.map(({ opening, nextSan }) => (
                  <OpeningRow key={`${opening.eco}-${opening.name}`} opening={opening} nextSan={nextSan} />
                ))}
              </div>
            )}
            {hasCompleted && hasContinuations && <div className="section-separator" />}
            {hasContinuations && (
              <div className="continuations-section">
                {continuations.map(({ opening, nextSan }) => (
                  <OpeningRow
                    key={`${opening.eco}-${opening.name}`}
                    opening={opening}
                    nextSan={nextSan}
                    onMoveClick={onMoveClick}
                    onMoveHover={onMoveHover}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
