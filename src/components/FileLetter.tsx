import React from "react";

type FileLetterProps = {
  value: string;
};

export function FileLetter({ value }: FileLetterProps) {
  return <div className="file">{value}</div>;
}
