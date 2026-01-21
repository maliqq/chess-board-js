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
    <div className="move-list">
      <div className="moves">
        {pairs.length === 0 ? (
          <div className="empty">No moves yet</div>
        ) : (
          pairs.map((pair, pairIndex) => {
            const whiteIndex = pairIndex * 2 + 1;
            const blackIndex = pairIndex * 2 + 2;
            return (
              <div key={pair.num} className="move-pair">
                <span className="move-num">{pair.num}.</span>
                <span
                  className={`move ${currentIndex === whiteIndex ? "active" : ""}`}
                  onClick={() => onNavigate(whiteIndex)}
                >
                  {formatMove(pair.white)}
                </span>
                {pair.black && (
                  <span
                    className={`move ${currentIndex === blackIndex ? "active" : ""}`}
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
      <div className="nav-controls">
        <button
          type="button"
          onClick={() => onNavigate(0)}
          disabled={!canGoBack}
          title="Go to start"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(currentIndex - 1)}
          disabled={!canGoBack}
          title="Previous move"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(currentIndex + 1)}
          disabled={!canGoForward}
          title="Next move"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(moves.length)}
          disabled={!canGoForward}
          title="Go to end"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
