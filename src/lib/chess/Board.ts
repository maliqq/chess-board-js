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
import type { MoveCoord, MoveHint, ParsedMove, PieceInfo } from "../types";
import { Piece } from "./Piece";

class Log {
  b: Board;
  moves: Array<{ fromX: number; fromY: number; x: number; y: number; captured: number }>;

  constructor(b: Board) {
    this.b = b;
    this.moves = [];
  }

  track(fromX: number, fromY: number, x: number, y: number) {
    const entry = {
      fromX,
      fromY,
      x,
      y,
      captured: this.b.get(x, y),
    };
    this.moves.push(entry);
  }

  back() {
    if (this.moves.length === 0) return;

    const entry = this.moves.pop();
    if (!entry) return;

    const current = this.b.get(entry.x, entry.y);
    this.b.put(entry.fromX, entry.fromY, current);
    if (entry.captured) {
      this.b.put(entry.x, entry.y, entry.captured);
    } else {
      this.b.clear(entry.x, entry.y);
    }
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
        return [x, y];
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
    } else if (p.piece === BISHOP) {
      possibleMoves.push(...this.filterShadows(x, y, isBlack, diagonalMove(), true));
    }

    return possibleMoves;
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

  constructor(fen?: string) {
    const defaultFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

    this.board = parseFEN(fen ?? defaultFEN);
    this.log = new Log(this);
    this.suggests = new Suggests(this);
    this.isBlack = false;
    this.activeColor = "w";
    this.castlingAvailability = "KQkq";
    this.pgn = [];
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
    return `${fen} ${this.activeColor} ${castling} - 0 1`;
  }

  loadFEN(fen: string) {
    this.board = parseFEN(fen);
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

  move(x: number, y: number, x2: number, y2: number) {
    const piece = this.get(x, y);
    this.clear(x, y);
    this.log.track(x, y, x2, y2);
    this.put(x2, y2, piece);
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

  forward() {
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

  piecePosition(piece: number, isBlack: boolean, options: MoveHint, moveTo: MoveCoord) {
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
      const king = parseMove("e" + rank) as MoveCoord;
      if (Piece.fromCode(this.get(king.x, king.y)).piece !== KING) {
        console.error("can't castle: king is not in correct place", king);
      }
      if (san.castle === "king") {
        const kingTo = parseMove("g" + rank) as MoveCoord;
        this.move(king.x, king.y, kingTo.x, kingTo.y);
        const rook = parseMove("h" + rank) as MoveCoord;
        const rookTo = parseMove("f" + rank) as MoveCoord;
        this.move(rook.x, rook.y, rookTo.x, rookTo.y);
      } else if (san.castle === "queen") {
        const kingTo = parseMove("c" + rank) as MoveCoord;
        this.move(king.x, king.y, kingTo.x, kingTo.y);
        const rook = parseMove("a" + rank) as MoveCoord;
        const rookTo = parseMove("d" + rank) as MoveCoord;
        this.move(rook.x, rook.y, rookTo.x, rookTo.y);
      }
    } else if (san.piece === PAWN) {
      const moveTo = san.moveTo as MoveCoord;
      const column = san.isCapture ? san.moveFrom?.y : moveTo.y;
      const pos = this.pawnPosition(column as number, moveTo.x, this.isBlack);
      if (!pos) {
        console.error("can't move pawn");
      } else {
        this.move(pos[0], pos[1], moveTo.x, moveTo.y);
      }
    } else {
      const moveFrom = san.moveFrom as MoveHint;
      const moveTo = san.moveTo as MoveCoord;
      const pos = this.piecePosition(san.piece as number, this.isBlack, moveFrom, moveTo);
      if (pos) {
        this.move(pos[0], pos[1], moveTo.x, moveTo.y);
      }
    }

    this.switchTurn();
  }

  getPiece(x: number, y: number) {
    if (this.outOfBoard(x, y)) return null;
    if (this.isEmpty(x, y)) return null;
    return Piece.fromCode(this.get(x, y));
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

  back() {
    this.log.back();
  }
}
