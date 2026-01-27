import React from 'react';
import { X } from "lucide-react";

import type { Opening } from "../lib/chess/Opening";

type OpeningWithContinuation = {
  opening: Opening;
  nextSan?: string;
};

type OpeningRowProps = OpeningWithContinuation & {
  onMoveClick?: (san: string) => void;
  onMoveHover?: (san: string | null) => void;
  onOpeningClick?: (opening: Opening) => void;
  compact?: boolean;
};

type OpeningsBarProps = {
  completed: OpeningWithContinuation[];
  continuations: OpeningWithContinuation[];
  searchQuery: string;
  searchResults: Opening[];
  onSearchChange: (value: string) => void;
  onSearchSelect?: (opening: Opening) => void;
  moreCount?: number;
  onMoveClick?: (san: string) => void;
  onMoveHover?: (san: string | null) => void;
};

function OpeningRow({ opening, nextSan, onMoveClick, onMoveHover, onOpeningClick, compact }: OpeningRowProps) {
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
      className={`opening-row ${hasNextMove || onOpeningClick ? "clickable" : ""} ${compact ? "compact" : ""}`}
      onClick={onOpeningClick ? () => onOpeningClick(opening) : handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="opening-main">
        <span className="eco">{opening.eco}</span>
        <span className="name">{opening.name}</span>
      </div>
      {!compact && nextSan && <div className="next-move">Next: {nextSan}</div>}
      {!compact && (
        <div className="stats-bar" title={title}>
          <span className="white" style={{ width: `${whitePct}%` }} />
          <span className="draw" style={{ width: `${drawPct}%` }} />
          <span className="black" style={{ width: `${blackPct}%` }} />
        </div>
      )}
    </div>
  );
}

export function OpeningsBar({
  completed,
  continuations,
  searchQuery,
  searchResults,
  onSearchChange,
  onSearchSelect,
  moreCount = 0,
  onMoveClick,
  onMoveHover,
}: OpeningsBarProps) {
  const hasCompleted = completed.length > 0;
  const hasContinuations = continuations.length > 0;
  const isEmpty = !hasCompleted && !hasContinuations;
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="openings-bar">
      <div className="header">
        <h4>Openings</h4>
        <input
          className="openings-search"
          type="search"
          placeholder="by name/ECO..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onSearchChange("");
            }
          }}
        />
        {isSearching && (
          <button
            type="button"
            className="openings-clear"
            onClick={() => onSearchChange("")}
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
        <a
          className="openings-link"
          href="https://github.com/lichess-org/chess-openings"
          target="_blank"
          rel="noreferrer"
        >
          source
        </a>
      </div>

      <div className="list">
        {isSearching ? (
          searchResults.length === 0 ? (
            <div className="empty">No results</div>
          ) : (
            <div className="continuations-section">
              {searchResults.map((opening, i) => (
                <OpeningRow
                  key={`${opening.eco}-${opening.name}-${i}`}
                  opening={opening}
                  onOpeningClick={onSearchSelect}
                  compact
                />
              ))}
            </div>
          )
        ) : isEmpty ? (
          <div className="empty">No matches</div>
        ) : (
          <>
            {hasCompleted && (
              <div className="completed-section">
                {completed.map(({ opening, nextSan }, i) => (
                  <OpeningRow key={`${opening.eco}-${opening.name}-${i}`} opening={opening} nextSan={nextSan} />
                ))}
              </div>
            )}
            {hasContinuations && (
              <div className="continuations-section">
                {continuations.map(({ opening, nextSan }, i) => (
                  <OpeningRow
                    key={`${opening.eco}-${opening.name}-${i}`}
                    opening={opening}
                    nextSan={nextSan}
                    onMoveClick={onMoveClick}
                    onMoveHover={onMoveHover}
                  />
                ))}
              </div>
            )}
            {moreCount > 0 && (
              <div className="more-count">...and {moreCount} more</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
