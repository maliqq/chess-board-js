import React from "react";
import { FILES, RANKS } from "../lib/constants";
import { FileNumber } from "./FileNumber";
import { RankLetter } from "./RankLetter";
import { Square } from "./Square";

export function Board() {
  const files = FILES.split("");
  const ranks = RANKS.split("");

  return (
    <div id="board">
      <div className="board">
        {ranks.map((rankChar, rowIndex) => {
          const rank = parseInt(rankChar, 10);
          return (
            <div className="row" key={`${rankChar}-${rowIndex}`}>
              <RankLetter value={rankChar} />
              {files.map((file) => (
                <Square
                  key={`${file}${rankChar}`}
                  file={file}
                  rank={rank}
                  isMoveFrom={false}
                  isMoveTo={false}
                  isSelected={false}
                  isPossibleMoveTo={false}
                />
              ))}
            </div>
          );
        })}
        <div className="files">
          <div className="corner"></div>
          {files.map((file, index) => (
            <FileNumber key={`${file}-${index}`} value={file} />
          ))}
        </div>
      </div>
    </div>
  );
}
