import React from "react";
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
    <div className="w-72 flex flex-col border border-gray-300 rounded bg-gray-50 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-100">
        <h4 className="text-sm font-semibold text-gray-700">Openings</h4>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[500px]">
        {openings.length === 0 ? (
          <div className="p-4 text-gray-400 text-sm italic text-center">
            No matches
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {openings.map(({ opening, nextSan }) => {
              const total = opening.white + opening.draws + opening.black;
              const whitePct = total ? (opening.white / total) * 100 : 0;
              const drawPct = total ? (opening.draws / total) * 100 : 0;
              const blackPct = total ? (opening.black / total) * 100 : 0;
              const title = `White: ${opening.white} (${whitePct.toFixed(1)}%) | Draws: ${opening.draws} (${drawPct.toFixed(1)}%) | Black: ${opening.black} (${blackPct.toFixed(1)}%)`;

              return (
                <div
                  key={`${opening.eco}-${opening.name}`}
                  className="px-3 py-2 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex gap-2 text-sm">
                    <span className="font-bold text-gray-600 w-9 flex-shrink-0">
                      {opening.eco}
                    </span>
                    <span className="text-gray-800 flex-1">{opening.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {nextSan ? `Next: ${nextSan}` : "Line complete"}
                  </div>
                  <div
                    className="flex h-2 mt-2 bg-gray-200 rounded overflow-hidden"
                    title={title}
                  >
                    <span
                      className="bg-white"
                      style={{ width: `${whitePct}%` }}
                    />
                    <span
                      className="bg-gray-400"
                      style={{ width: `${drawPct}%` }}
                    />
                    <span
                      className="bg-gray-800"
                      style={{ width: `${blackPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
