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

export type MoveCoord = { x: number; y: number };

export type MoveHint = { x?: number; y?: number };

export type SanMove = {
  piece?: number;
  moveFrom?: MoveHint;
  moveTo?: MoveCoord;
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
