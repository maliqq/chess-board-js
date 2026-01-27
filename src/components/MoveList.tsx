import React from 'react';

import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { PIECE_SYMBOLS } from "../lib/constants";

type MoveListProps = {
  moves: string[];
  currentIndex: number;
  onNavigate: (index: number) => void;
};

function formatMove(san: string): string {
  // Replace piece letters with symbols
  if (san.length > 0 && PIECE_SYMBOLS[san[0]]) {
    return PIECE_SYMBOLS[san[0]] + san.slice(1);
  }
  return san;
}

export function MoveList({ moves, currentIndex, onNavigate }: MoveListProps) {
  // Group moves into pairs (white, black)
  const pairs: Array<{ num: number; white: string; black?: string }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      num: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < moves.length;

  return (
    <div className="flex w-44 flex-col overflow-hidden rounded border border-slate-300 bg-slate-50">
      <div className="max-h-[400px] flex-1 overflow-y-auto p-2">
        {pairs.length === 0 ? (
          <div className="p-4 text-center text-sm italic text-slate-400">No moves yet</div>
        ) : (
          pairs.map((pair, pairIndex) => {
            const whiteIndex = pairIndex * 2 + 1;
            const blackIndex = pairIndex * 2 + 2;
            return (
              <div key={pair.num} className="flex gap-1 py-0.5 text-sm">
                <span className="w-6 flex-shrink-0 text-slate-500">{pair.num}.</span>
                <span
                  className={`min-w-[45px] cursor-pointer rounded px-1.5 py-0.5 ${currentIndex === whiteIndex ? "bg-blue-500 text-white hover:bg-blue-600" : "hover:bg-slate-200"}`}
                  onClick={() => onNavigate(whiteIndex)}
                >
                  {formatMove(pair.white)}
                </span>
                {pair.black && (
                  <span
                    className={`min-w-[45px] cursor-pointer rounded px-1.5 py-0.5 ${currentIndex === blackIndex ? "bg-blue-500 text-white hover:bg-blue-600" : "hover:bg-slate-200"}`}
                    onClick={() => onNavigate(blackIndex)}
                  >
                    {formatMove(pair.black)}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center justify-center gap-1 border-t border-slate-200 bg-slate-100 p-2">
        <button
          type="button"
          onClick={() => onNavigate(0)}
          disabled={!canGoBack}
          title="Go to start"
          className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(currentIndex - 1)}
          disabled={!canGoBack}
          title="Previous move"
          className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(currentIndex + 1)}
          disabled={!canGoForward}
          title="Next move"
          className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(moves.length)}
          disabled={!canGoForward}
          title="Go to end"
          className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
