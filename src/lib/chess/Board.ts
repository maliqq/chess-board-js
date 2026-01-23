import {
  BISHOP,
  BOARD_SIZE,
  EMPTY,
  KING,
  KNIGHT,
  MoveType,
  PAWN,
  QUEEN,
  ROOK,
} from "../constants";
import { parseFEN } from "../fen";
import { parsePGN } from "../pgn";
import { parseMove } from "../san";
import type { Coord, MoveHint, ParsedMove, PieceInfo } from "../types";
import { Piece } from "./Piece";

type MoveEntry = {
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  piece: number;
  captured: number;
  san: string;
  rookMove?: {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    piece: number;
  };
  enPassantCapture?: {
    x: number;
    y: number;
    piece: number;
  };
  prevEnPassantTarget: [number, number] | null;
};

class Log {
  b: Board;
  moves: MoveEntry[];
  index: number; // Current position in history (0 = start, moves.length = end)

  constructor(b: Board) {
    this.b = b;
    this.moves = [];
    this.index = 0;
  }

  get length() {
    return this.moves.length;
  }

  get isAtStart() {
    return this.index === 0;
  }

  get isAtEnd() {
    return this.index === this.moves.length;
  }

  get sans(): string[] {
    return this.moves.map((m) => m.san);
  }

  track(
    fromX: number,
    fromY: number,
    x: number,
    y: number,
    san: string,
    rookMove?: { fromX: number; fromY: number; toX: number; toY: number },
    enPassantCapture?: { x: number; y: number },
  ) {
    // If we're not at the end, truncate future moves
    if (this.index < this.moves.length) {
      this.moves = this.moves.slice(0, this.index);
    }

    const entry: MoveEntry = {
      fromX,
      fromY,
      x,
      y,
      piece: this.b.get(fromX, fromY),
      captured: this.b.get(x, y),
      san,
      prevEnPassantTarget: this.b.enPassantTarget,
    };
    if (rookMove) {
      entry.rookMove = {
        ...rookMove,
        piece: this.b.get(rookMove.fromX, rookMove.fromY),
      };
    }
    if (enPassantCapture) {
      entry.enPassantCapture = {
        ...enPassantCapture,
        piece: this.b.get(enPassantCapture.x, enPassantCapture.y),
      };
    }
    this.moves.push(entry);
    this.index++;
  }

  back(): boolean {
    if (this.index === 0) return false;

    this.index--;
    const entry = this.moves[this.index];

    // Undo the move: restore piece to original position
    this.b.put(entry.fromX, entry.fromY, entry.piece);
    if (entry.captured) {
      this.b.put(entry.x, entry.y, entry.captured);
    } else {
      this.b.clear(entry.x, entry.y);
    }
    if (entry.rookMove) {
      this.b.put(entry.rookMove.fromX, entry.rookMove.fromY, entry.rookMove.piece);
      this.b.clear(entry.rookMove.toX, entry.rookMove.toY);
    }
    if (entry.enPassantCapture) {
      this.b.put(entry.enPassantCapture.x, entry.enPassantCapture.y, entry.enPassantCapture.piece);
    }
    // Restore previous en passant target
    this.b.enPassantTarget = entry.prevEnPassantTarget;
    this.b.switchTurn();

    return true;
  }

  forward(): boolean {
    if (this.index >= this.moves.length) return false;

    const entry = this.moves[this.index];
    this.index++;

    // Redo the move
    this.b.clear(entry.fromX, entry.fromY);
    this.b.put(entry.x, entry.y, entry.piece);
    if (entry.rookMove) {
      this.b.clear(entry.rookMove.fromX, entry.rookMove.fromY);
      this.b.put(entry.rookMove.toX, entry.rookMove.toY, entry.rookMove.piece);
    }
    if (entry.enPassantCapture) {
      this.b.clear(entry.enPassantCapture.x, entry.enPassantCapture.y);
    }
    this.b.switchTurn();

    return true;
  }

  start(): void {
    while (this.back()) {}
  }

  end(): void {
    while (this.forward()) {}
  }

  goTo(targetIndex: number): void {
    const clamped = Math.max(0, Math.min(targetIndex, this.moves.length));
    while (this.index > clamped) this.back();
    while (this.index < clamped) this.forward();
  }
}

class Suggests {
  b: Board;

  constructor(b: Board) {
    this.b = b;
  }

  filterShadows(
    x: number,
    y: number,
    isBlack: boolean,
    moves: number[][],
    isDiagonal: boolean,
  ) {
    const filtered: number[][] = [];

    const directions = [BOARD_SIZE, BOARD_SIZE, BOARD_SIZE, BOARD_SIZE];

    function direction(_x: number, _y: number) {
      if (isDiagonal) {
        const d = [Math.sign(_x - x), Math.sign(_y - y)];
        switch (JSON.stringify(d)) {
          case "[1,1]":
            return 0;
          case "[1,-1]":
            return 1;
          case "[-1,-1]":
            return 2;
          case "[-1,1]":
            return 3;
          default:
            return 0;
        }
      }
      if (_x === x) {
        return _y > y ? 0 : 1;
      }
      return _x > x ? 2 : 3;
    }

    function distance(_x: number, _y: number) {
      return isDiagonal ? Math.abs(_x - x) : _x === x ? Math.abs(_y - y) : Math.abs(_x - x);
    }

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const _x = move[0],
        _y = move[1];
      const moveType = this.b.canMove(_x, _y, isBlack);
      if (
        moveType === MoveType.CHECK_ON_KING ||
        moveType === MoveType.CAPTURE ||
        moveType === MoveType.OURS
      ) {
        const min = directions[direction(_x, _y)];
        const dist = distance(_x, _y);
        if (dist < min || min === BOARD_SIZE) {
          directions[direction(_x, _y)] = dist;
        }
      }
    }

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const _x = move[0],
        _y = move[1];
      const min = directions[direction(_x, _y)];
      const dist = distance(_x, _y);
      const moveType = this.b.canMove(_x, _y, isBlack);
      if (moveType === MoveType.OURS) continue;
      if (moveType === MoveType.CAPTURE) {
        move.push("capture");
      }
      if (dist <= min || min === BOARD_SIZE) {
        filtered.push(move);
      }
    }

    return filtered;
  }

  possibleMoves(x: number, y: number) {
    const p = Piece.fromCode(this.b.get(x, y));
    if (p.isEmpty) return [];

    const isBlack = p.isBlack;

    const checkPossibleMove = (x: number, y: number) => {
      const moveType = this.b.canMove(x, y, isBlack);
      if (moveType === MoveType.POSSIBLE) {
        return [x, y];
      }
      return false;
    };

    const checkPossibleCapture = (x: number, y: number) => {
      const moveType = this.b.canMove(x, y, isBlack);
      if (moveType === MoveType.CAPTURE) {
        return [x, y, "capture"];
      }
      return false;
    };

    const checkPossibleMoveOrCapture = (x: number, y: number) => {
      const moveType = this.b.canMove(x, y, isBlack);
      if (moveType === MoveType.POSSIBLE) {
        return [x, y];
      }
      if (moveType === MoveType.CAPTURE) {
        return [x, y, "capture"];
      }
      return false;
    };

    const diagonalMove = () => {
      const moves: number[][] = [];
      for (let i = 0; i < BOARD_SIZE; i++) {
        if (i !== x) {
          const k = x - i;
          const up = y - k;
          const down = y + k;
          if (!this.b.outOfBoard(i, up)) moves.push([i, up]);
          if (!this.b.outOfBoard(i, down)) moves.push([i, down]);
        }
      }
      return moves;
    };

    const directMove = () => {
      const moves: number[][] = [];
      for (let i = 0; i < BOARD_SIZE; i++) {
        if (i === x) continue;
        if (!this.b.outOfBoard(i, y)) moves.push([i, y]);
      }

      for (let j = 0; j < BOARD_SIZE; j++) {
        if (j === y) continue;
        if (!this.b.outOfBoard(x, j)) moves.push([x, j]);
      }
      return moves;
    };

    const possibleMoves: any[] = [];
    if (p.piece === PAWN) {
      const o = isBlack ? 1 : -1;
      const isStartingPos = isBlack ? x === 1 : x === 6;
      const move = checkPossibleMove(x + o, y);
      if (move !== false) {
        possibleMoves.push(move);
        if (isStartingPos) {
          const move2 = checkPossibleMove(x + o * 2, y);
          if (move2 !== false) {
            possibleMoves.push(move2);
          }
        }
      }
      const move1 = checkPossibleCapture(x + o, y + 1);
      const move2 = checkPossibleCapture(x + o, y - 1);
      if (move1 !== false) possibleMoves.push(move1);
      if (move2 !== false) possibleMoves.push(move2);

      // En passant captures
      if (this.b.enPassantTarget) {
        const [epRow, epCol] = this.b.enPassantTarget;
        // Check if this pawn can capture en passant (must be adjacent and correct rank)
        if (x + o === epRow && Math.abs(y - epCol) === 1) {
          possibleMoves.push([epRow, epCol, "capture"]);
        }
      }
    } else if (p.piece === ROOK) {
      possibleMoves.push(...this.filterShadows(x, y, isBlack, directMove(), false));
    } else if (p.piece === KNIGHT) {
      const knightMoves = [
        [2, 1],
        [2, -1],
        [1, 2],
        [-1, 2],
        [-1, -2],
        [1, -2],
        [-2, -1],
        [-2, 1],
      ];
      for (let i = 0; i < knightMoves.length; i++) {
        const _x = x + knightMoves[i][0],
          _y = y + knightMoves[i][1];
        const move = checkPossibleMoveOrCapture(_x, _y);
        if (move !== false) {
          possibleMoves.push(move);
        }
      }
    } else if (p.piece === QUEEN) {
      possibleMoves.push(...this.filterShadows(x, y, isBlack, directMove(), false));
      possibleMoves.push(...this.filterShadows(x, y, isBlack, diagonalMove(), true));
    } else if (p.piece === KING) {
      const moves = [
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
        [-1, -1],
        [1, 0],
        [-1, 0],
        [0, -1],
        [0, 1],
      ];
      for (let i = 0; i < moves.length; i++) {
        const _x = x + moves[i][0],
          _y = y + moves[i][1];
        const move = checkPossibleMoveOrCapture(_x, _y);
        if (move !== false) {
          possibleMoves.push(move);
        }
      }
      this.addCastleMoves(possibleMoves, x, y, isBlack);
    } else if (p.piece === BISHOP) {
      possibleMoves.push(...this.filterShadows(x, y, isBlack, diagonalMove(), true));
    }

    return possibleMoves;
  }

  private addCastleMoves(possibleMoves: any[], x: number, y: number, isBlack: boolean) {
    if (isBlack) {
      if (x === 0 && y === 4 && this.b.castlingAvailability.includes("k")) {
        if (this.b.isEmpty(0, 5) && this.b.isEmpty(0, 6)) {
          const rook = Piece.fromCode(this.b.get(0, 7));
          if (!rook.isEmpty && rook.piece === ROOK) {
            possibleMoves.push([0, 6]);
          }
        }
      }
      if (x === 0 && y === 4 && this.b.castlingAvailability.includes("q")) {
        if (this.b.isEmpty(0, 3) && this.b.isEmpty(0, 2) && this.b.isEmpty(0, 1)) {
          const rook = Piece.fromCode(this.b.get(0, 0));
          if (!rook.isEmpty && rook.piece === ROOK) {
            possibleMoves.push([0, 2]);
          }
        }
      }
      return;
    }

    if (x === 7 && y === 4 && this.b.castlingAvailability.includes("K")) {
      if (this.b.isEmpty(7, 5) && this.b.isEmpty(7, 6)) {
        const rook = Piece.fromCode(this.b.get(7, 7));
        if (!rook.isEmpty && rook.piece === ROOK) {
          possibleMoves.push([7, 6]);
        }
      }
    }
    if (x === 7 && y === 4 && this.b.castlingAvailability.includes("Q")) {
      if (this.b.isEmpty(7, 3) && this.b.isEmpty(7, 2) && this.b.isEmpty(7, 1)) {
        const rook = Piece.fromCode(this.b.get(7, 0));
        if (!rook.isEmpty && rook.piece === ROOK) {
          possibleMoves.push([7, 2]);
        }
      }
    }
  }
}

export class Board {
  board: number[][];
  log: Log;
  suggests: Suggests;
  isBlack: boolean;
  pgn: ParsedMove[];
  activeColor: "w" | "b";
  castlingAvailability: string;
  enPassantTarget: [number, number] | null;

  constructor(fen?: string) {
    const defaultFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    const fullFen = fen ?? defaultFEN;

    // Parse FEN parts: position activeColor castling enPassant halfmove fullmove
    const parts = fullFen.split(" ");
    this.board = parseFEN(parts[0]);
    this.log = new Log(this);
    this.suggests = new Suggests(this);

    // Parse active color (default to white)
    this.activeColor = parts[1] === "b" ? "b" : "w";
    this.isBlack = this.activeColor === "b";

    // Parse castling availability (default to all)
    this.castlingAvailability = parts[2] || "KQkq";

    // Parse en passant target square
    this.enPassantTarget = this.parseEnPassantSquare(parts[3]);

    this.pgn = [];
  }

  private parseEnPassantSquare(square?: string): [number, number] | null {
    if (!square || square === "-") return null;
    const file = square.charCodeAt(0) - "a".charCodeAt(0); // 0-7
    const rank = 8 - parseInt(square[1], 10); // Convert to row index (0-7)
    if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
      return [rank, file];
    }
    return null;
  }

  private enPassantSquareToString(): string {
    if (!this.enPassantTarget) return "-";
    const [rank, file] = this.enPassantTarget;
    return String.fromCharCode("a".charCodeAt(0) + file) + (8 - rank);
  }

  toFen() {
    let fen = "";
    for (let i = 0; i < BOARD_SIZE; i++) {
      let empties = 0;
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (this.isEmpty(i, j)) empties++;
        else {
          if (empties !== 0) fen += empties.toString();
          empties = 0;
          fen += Piece.fromCode(this.get(i, j)).fenCode;
        }
      }
      if (empties > 0) fen += empties.toString();
      if (i !== 7) fen += "/";
    }
    const castling = this.castlingAvailability || "-";
    const enPassant = this.enPassantSquareToString();
    return `${fen} ${this.activeColor} ${castling} ${enPassant} 0 1`;
  }

  loadFEN(fen: string) {
    const parts = fen.split(" ");
    this.board = parseFEN(parts[0]);
    this.activeColor = parts[1] === "b" ? "b" : "w";
    this.isBlack = this.activeColor === "b";
    this.castlingAvailability = parts[2] || "KQkq";
    this.enPassantTarget = this.parseEnPassantSquare(parts[3]);
  }

  get(x: number, y: number) {
    return this.board[x][y];
  }

  isEmpty(x: number, y: number) {
    return this.board[x][y] === EMPTY;
  }

  put(x: number, y: number, piece: number) {
    this.board[x][y] = piece;
  }

  clear(x: number, y: number) {
    this.board[x][y] = EMPTY;
  }

  move(x: number, y: number, x2: number, y2: number, san = "") {
    const piece = this.get(x, y);
    const captured = this.get(x2, y2);
    const moved = Piece.fromCode(piece);
    let rookMove: { fromX: number; fromY: number; toX: number; toY: number } | undefined;
    let enPassantCapture: { x: number; y: number } | undefined;

    // Handle castling
    if (!moved.isEmpty && moved.piece === KING && Math.abs(y2 - y) === 2) {
      if (!san) {
        san = y2 > y ? "O-O" : "O-O-O";
      }
      if (y2 > y) {
        rookMove = { fromX: x2, fromY: 7, toX: x2, toY: 5 };
      } else {
        rookMove = { fromX: x2, fromY: 0, toX: x2, toY: 3 };
      }
    }

    // Handle en passant capture
    if (!moved.isEmpty && moved.piece === PAWN && this.enPassantTarget) {
      const [epRow, epCol] = this.enPassantTarget;
      if (x2 === epRow && y2 === epCol) {
        // This is an en passant capture - the captured pawn is on the same file but different rank
        const capturedPawnRow = moved.isBlack ? epRow - 1 : epRow + 1;
        enPassantCapture = { x: capturedPawnRow, y: epCol };
      }
    }

    this.log.track(x, y, x2, y2, san, rookMove, enPassantCapture);
    this.clear(x, y);
    this.put(x2, y2, piece);

    if (rookMove) {
      const rookPiece = this.get(rookMove.fromX, rookMove.fromY);
      this.clear(rookMove.fromX, rookMove.fromY);
      this.put(rookMove.toX, rookMove.toY, rookPiece);
    }

    // Remove captured pawn in en passant
    if (enPassantCapture) {
      this.clear(enPassantCapture.x, enPassantCapture.y);
    }

    // Set new en passant target if pawn moved two squares
    if (!moved.isEmpty && moved.piece === PAWN && Math.abs(x2 - x) === 2) {
      const epRow = (x + x2) / 2; // The square the pawn passed through
      this.enPassantTarget = [epRow, y];
    } else {
      this.enPassantTarget = null;
    }

    this.updateCastlingAvailability(moved, x, y, captured, x2, y2);
  }

  outOfBoard(x: number, y: number) {
    return x >= BOARD_SIZE || y >= BOARD_SIZE || x < 0 || y < 0;
  }

  canMove(x: number, y: number, isBlack: boolean) {
    if (this.outOfBoard(x, y)) return MoveType.OUT_OF_BOARD;

    if (this.isEmpty(x, y)) return MoveType.POSSIBLE;

    const p = Piece.fromCode(this.board[x][y]);
    if (p.isBlack === isBlack) {
      return MoveType.OURS;
    }
    if (p.piece === KING) return MoveType.CHECK_ON_KING;
    return MoveType.CAPTURE;
  }

  possibleMoves(x: number, y: number) {
    return this.suggests.possibleMoves(x, y);
  }

  parsePGN(data: string) {
    this.pgn = parsePGN(data).parsed;
  }

  playNextPgn() {
    const san = this.pgn.shift();
    if (san) {
      this.applySAN(san);
    }
  }

  pawnPosition(column: number, row: number, isBlack: boolean) {
    const j = column;
    if (isBlack) {
      for (let i = row - 1; i >= 0; i--) {
        if (this.isEmpty(i, j)) continue;
        const p = Piece.fromCode(this.get(i, j));
        if (p.isBlack) return [i, j];
      }
    } else {
      for (let i = row + 1; i < BOARD_SIZE; i++) {
        if (this.isEmpty(i, j)) continue;
        const p = Piece.fromCode(this.get(i, j));
        if (!p.isBlack) return [i, j];
      }
    }
  }

  piecePositions(isBlack: boolean) {
    const positions: Record<number, [number, number][]> = {};
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (this.isEmpty(i, j)) continue;
        const p = Piece.fromCode(this.get(i, j));
        if (p.isBlack !== isBlack) continue;
        positions[p.piece] = positions[p.piece] || [];
        positions[p.piece].push([i, j]);
      }
    }
    return positions;
  }

  piecePosition(piece: number, isBlack: boolean, options: MoveHint, moveTo: Coord) {
    const positions = this.piecePositions(isBlack)[piece];
    if (positions.length === 1) {
      return positions[0];
    }

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];

      if (options.y && pos[1] === options.y) return pos;
      if (options.x && pos[0] === options.x) return pos;
    }

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const suggests = this.suggests.possibleMoves(pos[0], pos[1]);
      for (let j = 0; j < suggests.length; j++) {
        if (suggests[j][0] === moveTo.x && suggests[j][1] === moveTo.y) {
          return pos;
        }
      }
    }

    console.error("which piece to move?", piece, isBlack, options, moveTo);
  }

  applySAN(san: ParsedMove) {
    if (san.result) return;
    if (san.castle) {
      let rank = "1";
      if (this.isBlack) {
        rank = "8";
      }
      const king = parseMove("e" + rank) as Coord;
      if (Piece.fromCode(this.get(king.x, king.y)).piece !== KING) {
        console.error("can't castle: king is not in correct place", king);
      }
      if (san.castle === "king") {
        const kingTo = parseMove("g" + rank) as Coord;
        this.move(king.x, king.y, kingTo.x, kingTo.y, "O-O");
      } else if (san.castle === "queen") {
        const kingTo = parseMove("c" + rank) as Coord;
        this.move(king.x, king.y, kingTo.x, kingTo.y, "O-O-O");
      }
    } else if (san.piece === PAWN) {
      const moveTo = san.moveTo as Coord;
      const column = san.isCapture ? san.moveFrom?.y : moveTo.y;
      const pos = this.pawnPosition(column as number, moveTo.x, this.isBlack);
      if (!pos) {
        console.error("can't move pawn");
      } else {
        this.move(pos[0], pos[1], moveTo.x, moveTo.y);
      }
    } else {
      const moveFrom = san.moveFrom as MoveHint;
      const moveTo = san.moveTo as Coord;
      const pos = this.piecePosition(san.piece as number, this.isBlack, moveFrom, moveTo);
      if (pos) {
        this.move(pos[0], pos[1], moveTo.x, moveTo.y);
      }
    }

    this.switchTurn();
  }

  // Get move coordinates from parsed SAN without applying the move
  getMoveCoords(san: ParsedMove): { from: [number, number]; to: [number, number] } | null {
    if (san.result) return null;

    if (san.castle) {
      let rank = this.isBlack ? "8" : "1";
      const king = parseMove("e" + rank) as Coord;
      if (san.castle === "king") {
        const kingTo = parseMove("g" + rank) as Coord;
        return { from: [king.x, king.y], to: [kingTo.x, kingTo.y] };
      } else {
        const kingTo = parseMove("c" + rank) as Coord;
        return { from: [king.x, king.y], to: [kingTo.x, kingTo.y] };
      }
    }

    if (san.piece === PAWN) {
      const moveTo = san.moveTo as Coord;
      const column = san.isCapture ? san.moveFrom?.y : moveTo.y;
      const pos = this.pawnPosition(column as number, moveTo.x, this.isBlack);
      if (!pos) return null;
      return { from: [pos[0], pos[1]], to: [moveTo.x, moveTo.y] };
    }

    const moveFrom = san.moveFrom as MoveHint;
    const moveTo = san.moveTo as Coord;
    const pos = this.piecePosition(san.piece as number, this.isBlack, moveFrom, moveTo);
    if (!pos) return null;
    return { from: [pos[0], pos[1]], to: [moveTo.x, moveTo.y] };
  }

  getPiece(x: number, y: number) {
    if (this.outOfBoard(x, y)) return null;
    if (this.isEmpty(x, y)) return null;
    return Piece.fromCode(this.get(x, y));
  }

  getCheckState() {
    const kingPos = this.findKing(this.isBlack);
    if (!kingPos) return { isCheck: false, isCheckmate: false, kingPos: null as [number, number] | null };

    const attackers = this.getAttackers(kingPos[0], kingPos[1], !this.isBlack);
    const isCheck = attackers.length > 0;
    if (!isCheck) {
      return { isCheck: false, isCheckmate: false, kingPos };
    }

    const kingMoves = this.getLegalKingMoves(kingPos[0], kingPos[1], this.isBlack);
    const canProtect = this.canProtectCheck(kingPos[0], kingPos[1], attackers);
    const isCheckmate = kingMoves.length === 0 && !canProtect;

    return { isCheck, isCheckmate, kingPos };
  }

  isSquareAttackedBy(x: number, y: number, byBlack: boolean): boolean {
    return this.getAttackers(x, y, byBlack).length > 0;
  }

  isPinnedPiece(x: number, y: number): boolean {
    const piece = this.getPiece(x, y);
    if (!piece || piece.piece === KING) return false;

    const kingPos = this.findKing(piece.isBlack);
    if (!kingPos) return false;

    const dx = x - kingPos[0];
    const dy = y - kingPos[1];
    const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
    const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;

    const isAligned =
      (dx === 0 && dy !== 0) ||
      (dy === 0 && dx !== 0) ||
      (Math.abs(dx) === Math.abs(dy));
    if (!isAligned) return false;

    // The piece must be the first blocker between the king and the attacker.
    let cx = kingPos[0] + stepX;
    let cy = kingPos[1] + stepY;
    while (!this.outOfBoard(cx, cy)) {
      if (cx === x && cy === y) break;
      if (!this.isEmpty(cx, cy)) return false;
      cx += stepX;
      cy += stepY;
    }

    if (cx !== x || cy !== y) return false;

    // Look past the piece to find a sliding attacker.
    cx += stepX;
    cy += stepY;
    while (!this.outOfBoard(cx, cy)) {
      if (this.isEmpty(cx, cy)) {
        cx += stepX;
        cy += stepY;
        continue;
      }

      const attacker = this.getPiece(cx, cy);
      if (!attacker || attacker.isBlack === piece.isBlack) return false;

      const isStraight = dx === 0 || dy === 0;
      const isDiagonal = Math.abs(dx) === Math.abs(dy);
      const isRookLike = attacker.piece === ROOK || attacker.piece === QUEEN;
      const isBishopLike = attacker.piece === BISHOP || attacker.piece === QUEEN;

      if ((isStraight && isRookLike) || (isDiagonal && isBishopLike)) {
        return true;
      }
      return false;
    }

    return false;
  }

  eachPiece(block: (piece: PieceInfo, x: number, y: number) => void) {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (this.isEmpty(i, j)) continue;
        const piece = this.getPiece(i, j);
        if (piece) block(piece, i, j);
      }
    }
  }

  switchTurn() {
    this.isBlack = !this.isBlack;
    this.activeColor = this.isBlack ? "b" : "w";
  }

  private updateCastlingAvailability(
    moved: PieceInfo,
    fromX: number,
    fromY: number,
    captured: number,
    toX: number,
    toY: number,
  ) {
    if (!moved.isEmpty && moved.piece === KING) {
      this.castlingAvailability = this.isBlack
        ? this.castlingAvailability.replace(/[kq]/g, "")
        : this.castlingAvailability.replace(/[KQ]/g, "");
    }

    if (!moved.isEmpty && moved.piece === ROOK) {
      if (fromX === 7 && fromY === 0) this.castlingAvailability = this.castlingAvailability.replace("Q", "");
      if (fromX === 7 && fromY === 7) this.castlingAvailability = this.castlingAvailability.replace("K", "");
      if (fromX === 0 && fromY === 0) this.castlingAvailability = this.castlingAvailability.replace("q", "");
      if (fromX === 0 && fromY === 7) this.castlingAvailability = this.castlingAvailability.replace("k", "");
    }

    const capturedPiece = Piece.fromCode(captured);
    if (!capturedPiece.isEmpty && capturedPiece.piece === ROOK) {
      if (toX === 7 && toY === 0) this.castlingAvailability = this.castlingAvailability.replace("Q", "");
      if (toX === 7 && toY === 7) this.castlingAvailability = this.castlingAvailability.replace("K", "");
      if (toX === 0 && toY === 0) this.castlingAvailability = this.castlingAvailability.replace("q", "");
      if (toX === 0 && toY === 7) this.castlingAvailability = this.castlingAvailability.replace("k", "");
    }
  }

  // Navigation methods
  back(): boolean {
    return this.log.back();
  }

  forward(): boolean {
    return this.log.forward();
  }

  start(): void {
    this.log.start();
  }

  end(): void {
    this.log.end();
  }

  goTo(index: number): void {
    this.log.goTo(index);
  }

  // Log accessors
  get moveIndex(): number {
    return this.log.index;
  }

  get moveCount(): number {
    return this.log.length;
  }

  get isAtStart(): boolean {
    return this.log.isAtStart;
  }

  get isAtEnd(): boolean {
    return this.log.isAtEnd;
  }

  get sans(): string[] {
    return this.log.sans;
  }

  private findKing(isBlack: boolean): [number, number] | null {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        const piece = this.getPiece(i, j);
        if (piece && piece.piece === KING && piece.isBlack === isBlack) {
          return [i, j];
        }
      }
    }
    return null;
  }

  private isSquareAttacked(x: number, y: number, byBlack: boolean): boolean {
    return this.getAttackers(x, y, byBlack).length > 0;
  }

  private getAttackers(x: number, y: number, byBlack: boolean) {
    const attackers: Array<{ x: number; y: number; piece: number; dir?: [number, number] }> = [];

    const directions: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];

    for (const [dx, dy] of directions) {
      for (let step = 1; step < BOARD_SIZE; step++) {
        const nx = x + dx * step;
        const ny = y + dy * step;
        if (this.outOfBoard(nx, ny)) break;

        const piece = this.getPiece(nx, ny);
        if (!piece) continue;
        if (piece.isBlack !== byBlack) break;

        if (dx === 0 || dy === 0) {
          if (piece.piece === ROOK || piece.piece === QUEEN) {
            attackers.push({ x: nx, y: ny, piece: piece.piece, dir: [dx, dy] });
          }
        } else {
          if (piece.piece === BISHOP || piece.piece === QUEEN) {
            attackers.push({ x: nx, y: ny, piece: piece.piece, dir: [dx, dy] });
          }
        }
        if (step === 1 && piece.piece === KING) {
          attackers.push({ x: nx, y: ny, piece: piece.piece, dir: [dx, dy] });
        }
        break;
      }
    }

    const pawnDir = byBlack ? 1 : -1;
    const pawnTargets = [
      [x + pawnDir, y + 1],
      [x + pawnDir, y - 1],
    ];
    for (const [px, py] of pawnTargets) {
      if (this.outOfBoard(px, py)) continue;
      const piece = this.getPiece(px, py);
      if (piece && piece.isBlack === byBlack && piece.piece === PAWN) {
        attackers.push({ x: px, y: py, piece: piece.piece });
      }
    }

    const knightMoves = [
      [2, 1],
      [2, -1],
      [1, 2],
      [-1, 2],
      [-1, -2],
      [1, -2],
      [-2, -1],
      [-2, 1],
    ];
    for (const [dx, dy] of knightMoves) {
      const nx = x + dx;
      const ny = y + dy;
      if (this.outOfBoard(nx, ny)) continue;
      const piece = this.getPiece(nx, ny);
      if (piece && piece.isBlack === byBlack && piece.piece === KNIGHT) {
        attackers.push({ x: nx, y: ny, piece: piece.piece });
      }
    }

    return attackers;
  }

  private getLegalKingMoves(x: number, y: number, isBlack: boolean): Array<[number, number]> {
    const moves: Array<[number, number]> = [];
    const steps = [
      [1, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [-1, -1],
      [1, 0],
      [-1, 0],
      [0, -1],
      [0, 1],
    ];

    for (const [dx, dy] of steps) {
      const nx = x + dx;
      const ny = y + dy;
      if (this.outOfBoard(nx, ny)) continue;
      const piece = this.getPiece(nx, ny);
      if (piece && piece.isBlack === isBlack) continue;
      if (!this.isSquareAttacked(nx, ny, !isBlack)) {
        moves.push([nx, ny]);
      }
    }
    return moves;
  }

  private canProtectCheck(
    kingX: number,
    kingY: number,
    attackers: Array<{ x: number; y: number; piece: number; dir?: [number, number] }>,
  ): boolean {
    if (attackers.length !== 1) return false;
    const attacker = attackers[0];
    if (attacker.piece === KNIGHT) return false;

    const targets: Array<[number, number]> = [];

    if (attacker.dir) {
      const [dx, dy] = attacker.dir;
      let cx = kingX + dx;
      let cy = kingY + dy;
      while (cx !== attacker.x || cy !== attacker.y) {
        targets.push([cx, cy]);
        cx += dx;
        cy += dy;
      }
      targets.push([attacker.x, attacker.y]);
    } else {
      targets.push([attacker.x, attacker.y]);
    }

    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        const piece = this.getPiece(i, j);
        if (!piece || piece.isBlack !== this.isBlack || piece.piece === KING) continue;
        const moves = this.suggests.possibleMoves(i, j);
        for (const move of moves) {
          const mx = move[0];
          const my = move[1];
          if (targets.some((t) => t[0] === mx && t[1] === my)) {
            return true;
          }
        }
      }
    }

    return false;
  }
}
