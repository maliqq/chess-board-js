export type PieceInfo = {
  isEmpty: boolean;
  isBlack: boolean;
  piece: number;
  letter: string;
  symbol: string;
  symbolWhite: string;
  symbolBlack: string;
  fenCode: string;
  name: string;
};

export type Coord = import("./chess/Coord").Coord;

export type MoveHint = { x?: number; y?: number };

export type SanMove = {
  piece?: number;
  moveFrom?: MoveHint;
  moveTo?: Coord;
  isCheck?: boolean;
  isMate?: boolean;
  isCapture?: boolean;
  promotedTo?: string;
  castle?: boolean;
  kingSide?: boolean;
  queenSide?: boolean;
  draw?: boolean;
  wonByWhite?: boolean;
  wonByBlack?: boolean;
};

export type ParsedMove = {
  piece: number;
  moveFrom?: MoveHint;
  moveTo?: Coord;
  isCapture: boolean;
  isCheck: boolean;
  isMate: boolean;
  promotedTo?: string;
  castle?: "king" | "queen";
  result?: "1-0" | "0-1" | "1/2-1/2";
};
