import React from "react";
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
    <div className="w-44 flex flex-col border border-gray-300 rounded bg-gray-50 overflow-hidden">
      <div className="flex-1 overflow-y-auto max-h-[400px] p-2">
        {pairs.length === 0 ? (
          <div className="text-gray-400 text-sm italic text-center py-4">
            No moves yet
          </div>
        ) : (
          pairs.map((pair, pairIndex) => {
            const whiteIndex = pairIndex * 2 + 1;
            const blackIndex = pairIndex * 2 + 2;
            return (
              <div key={pair.num} className="flex gap-1 py-0.5 text-sm">
                <span className="text-gray-500 w-6">{pair.num}.</span>
                <span
                  className={`cursor-pointer px-1.5 py-0.5 rounded min-w-[45px] hover:bg-gray-200 ${
                    currentIndex === whiteIndex ? "bg-blue-500 text-white hover:bg-blue-600" : ""
                  }`}
                  onClick={() => onNavigate(whiteIndex)}
                >
                  {formatMove(pair.white)}
                </span>
                {pair.black && (
                  <span
                    className={`cursor-pointer px-1.5 py-0.5 rounded min-w-[45px] hover:bg-gray-200 ${
                      currentIndex === blackIndex ? "bg-blue-500 text-white hover:bg-blue-600" : ""
                    }`}
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
      <div className="flex justify-center gap-1 p-2 border-t border-gray-200 bg-gray-100">
        <button
          type="button"
          onClick={() => onNavigate(0)}
          disabled={!canGoBack}
          title="Go to start"
          className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(currentIndex - 1)}
          disabled={!canGoBack}
          title="Previous move"
          className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(currentIndex + 1)}
          disabled={!canGoForward}
          title="Next move"
          className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(moves.length)}
          disabled={!canGoForward}
          title="Go to end"
          className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
