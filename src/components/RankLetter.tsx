import React from "react";

type RankLetterProps = {
  value: string;
};

export function RankLetter({ value }: RankLetterProps) {
  return <div className="rank">{value}</div>;
}
