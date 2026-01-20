import React from "react";

type FileNumberProps = {
  value: string;
};

export function FileNumber({ value }: FileNumberProps) {
  return <div className="file">{value}</div>;
}
