import { FILES, PAWN, RANKS, parsePiece } from "./constants";
import type { MoveCoord, MoveHint, ParsedMove } from "./types";

export function Move(x: number, y: number): string {
  return FILES.charAt(y) + RANKS.charAt(x);
}

export function Move2(a: [number, number]): string {
  return Move(a[0], a[1]);
}

export function parseMove(data: string): MoveHint {
  if (data.length === 1) {
    if (/\d/.test(data)) return { x: RANKS.indexOf(data) };
    return { y: FILES.indexOf(data) };
  }
  return {
    x: RANKS.indexOf(data[1]),
    y: FILES.indexOf(data[0]),
  };
}

export function parseSAN(data: string): ParsedMove {
  if (data === "1-0") {
    return {
      piece: PAWN,
      isCapture: false,
      isCheck: false,
      isMate: false,
      result: "1-0",
    };
  }
  if (data === "0-1") {
    return {
      piece: PAWN,
      isCapture: false,
      isCheck: false,
      isMate: false,
      result: "0-1",
    };
  }
  if (data === "1/2-1/2" || data === "½-½") {
    return {
      piece: PAWN,
      isCapture: false,
      isCheck: false,
      isMate: false,
      result: "1/2-1/2",
    };
  }

  if (data === "O-O" || data === "0-0") {
    return {
      piece: PAWN,
      isCapture: false,
      isCheck: false,
      isMate: false,
      castle: "king",
    };
  }
  if (data === "O-O-O" || data === "0-0-0") {
    return {
      piece: PAWN,
      isCapture: false,
      isCheck: false,
      isMate: false,
      castle: "queen",
    };
  }

  let endWith = data[data.length - 1];
  const isMate = endWith === "#";
  if (isMate) {
    data = data.slice(0, -1);
  }
  const isCheck = endWith === "+";
  if (isCheck) {
    data = data.slice(0, -1);
  }

  let moveFrom: MoveHint = {};
  let moveTo: MoveCoord | undefined;

  let piece: number | undefined;
  let promotedTo: string | undefined;
  const isPiece = /^[BKNQR]/.test(data[0]);
  const isCapture = data.indexOf("x") !== -1;

  if (isPiece) {
    piece = parsePiece(data[0]);
    data = data.slice(1);
    const m = data.match(/([a-h1-8])?x?([a-h][1-8])/);
    if (m) {
      if (typeof m[1] !== "undefined") {
        moveFrom = parseMove(m[1]);
        moveTo = parseMove(m[2]) as MoveCoord;
      } else {
        moveTo = parseMove(m[2]) as MoveCoord;
      }
    }
  } else {
    const isPromotion = data.indexOf("=") !== -1;
    if (isPromotion) {
      const parts = data.split("=");
      data = parts[0];
      promotedTo = parts[1];
    }
    const m = data.match(/([a-h][1-8]?)?x?([a-h][1-8])/);
    if (m) {
      moveTo = parseMove(m[2]) as MoveCoord;
      if (typeof m[1] !== "undefined") {
        moveFrom = parseMove(m[1]);
      }
    }
  }

  return {
    piece: piece || PAWN,
    moveFrom,
    moveTo,
    isCheck,
    isMate,
    isCapture,
    promotedTo,
  };
}
