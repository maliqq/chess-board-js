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
      className={`border-b border-slate-200 ${compact ? "px-3 py-1.5" : "px-3 py-2"} ${hasNextMove || onOpeningClick ? "cursor-pointer hover:bg-slate-100" : ""}`}
      onClick={onOpeningClick ? () => onOpeningClick(opening) : handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex gap-2 text-sm">
        <span className="w-9 flex-shrink-0 font-bold text-slate-600">{opening.eco}</span>
        <span className="flex-1 text-slate-800">{opening.name}</span>
      </div>
      {!compact && nextSan && <div className="mt-1 text-xs text-slate-500">Next: {nextSan}</div>}
      {!compact && (
        <div className="mt-2 flex h-2 overflow-hidden rounded bg-slate-200" title={title}>
          <span className="bg-white" style={{ width: `${whitePct}%` }} />
          <span className="bg-slate-400" style={{ width: `${drawPct}%` }} />
          <span className="bg-slate-800" style={{ width: `${blackPct}%` }} />
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
    <div className="flex w-72 flex-col overflow-hidden rounded border border-slate-300 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-3 py-2">
        <h4 className="m-0 text-sm font-semibold text-slate-700">Openings</h4>
        <input
          className="mx-2 flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-slate-600 focus:outline-none"
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
            className="mr-1 inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => onSearchChange("")}
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
        <a
          className="text-xs text-slate-500 hover:underline"
          href="https://github.com/lichess-org/chess-openings"
          target="_blank"
          rel="noreferrer"
        >
          source
        </a>
      </div>

      <div className="max-h-[500px] flex-1 overflow-y-auto">
        {isSearching ? (
          searchResults.length === 0 ? (
            <div className="p-4 text-center text-sm italic text-slate-400">No results</div>
          ) : (
            <div>
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
          <div className="p-4 text-center text-sm italic text-slate-400">No matches</div>
        ) : (
          <>
            {hasCompleted && (
              <div className="bg-emerald-50">
                {completed.map(({ opening, nextSan }, i) => (
                  <OpeningRow key={`${opening.eco}-${opening.name}-${i}`} opening={opening} nextSan={nextSan} />
                ))}
              </div>
            )}
            {hasContinuations && (
              <div>
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
              <div className="border-t border-slate-200 px-3 py-2 text-center text-sm italic text-slate-500">
                ...and {moreCount} more
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
