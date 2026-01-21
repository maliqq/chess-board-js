import { B, parsePiece } from "./constants";

export function parseFENPiece(s: string): number {
  const piece = parsePiece(s.toUpperCase());
  if (s.toUpperCase() === s) return piece;
  return piece << B;
}

export function parseFEN(data: string): number[][] {
  const result: number[][] = [];
  const rows = data.split(" ")[0].split("/");
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const parsedRow: number[] = [];
    const figures = row.split("");
    for (let j = 0; j < figures.length; j++) {
      const figure = figures[j];
      if (/\d/.test(figure)) {
        const empties = parseInt(figure, 10);
        for (let count = 0; count < empties; count++) parsedRow.push(0);
      } else {
        parsedRow.push(parseFENPiece(figure));
      }
    }
    result.push(parsedRow);
  }
  return result;
}
