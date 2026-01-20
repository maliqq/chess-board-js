import {
  B,
  EMPTY,
  KING,
  KNIGHT,
  Pieces,
  QUEEN,
  ROOK,
  BISHOP,
  PAWN,
  SYMBOLS,
} from "../constants";
import type { PieceInfo } from "../types";

export class Piece implements PieceInfo {
  isEmpty: boolean;
  isBlack: boolean;
  piece: number;
  letter: string;
  symbol: string;
  symbolWhite: string;
  symbolBlack: string;
  fenCode: string;
  name: string;

  private constructor(data: PieceInfo) {
    this.isEmpty = data.isEmpty;
    this.isBlack = data.isBlack;
    this.piece = data.piece;
    this.letter = data.letter;
    this.symbol = data.symbol;
    this.symbolWhite = data.symbolWhite;
    this.symbolBlack = data.symbolBlack;
    this.fenCode = data.fenCode;
    this.name = data.name;
  }

  static fromCode(code: number): Piece {
    const cached = Pieces.byCode[code];
    if (cached) return cached as Piece;

    if (code === EMPTY) {
      const empty = new Piece({
        isEmpty: true,
        isBlack: false,
        piece: EMPTY,
        letter: "",
        symbol: "",
        symbolWhite: "",
        symbolBlack: "",
        fenCode: "",
        name: "",
      });
      Pieces.byCode[code] = empty;
      return empty;
    }

    const isBlack = code >> B !== 0;
    const piece = isBlack ? code >> B : code;
    let name = "";
    let letter = "";

    switch (piece) {
      case PAWN:
        name = "pawn";
        letter = "p";
        break;
      case BISHOP:
        name = "bishop";
        letter = "b";
        break;
      case KNIGHT:
        name = "knight";
        letter = "n";
        break;
      case ROOK:
        name = "rook";
        letter = "r";
        break;
      case QUEEN:
        name = "queen";
        letter = "q";
        break;
      case KING:
        name = "king";
        letter = "k";
        break;
      default:
        name = "";
        letter = "";
    }

    const pieceInfo = new Piece({
      isEmpty: false,
      isBlack,
      piece,
      letter,
      symbol: SYMBOLS[String(isBlack)][piece],
      symbolWhite: SYMBOLS["false"][piece],
      symbolBlack: SYMBOLS["true"][piece],
      fenCode: isBlack ? letter : letter.toUpperCase(),
      name,
    });

    Pieces.byCode[code] = pieceInfo;
    return pieceInfo;
  }
}
