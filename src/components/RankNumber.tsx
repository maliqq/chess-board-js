import React from "react";

type RankNumberProps = {
  value: string;
};

export function RankNumber({ value }: RankNumberProps) {
  return <div className="rank">{value}</div>;
}
