import $ from "jquery";
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";

type PieceInfo =
  | { isEmpty: true }
  | {
      isBlack: boolean;
      piece: number;
      letter: string;
      symbol: string;
      symbolWhite: string;
      symbolBlack: string;
      fenCode: string;
      name: string;
    };

type MoveCoord = { x: number; y: number };

type MoveHint = { x?: number; y?: number };

type SanMove = {
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

const EMPTY = 0;
const PAWN = 1;
const BISHOP = 2;
const KNIGHT = 3;
const ROOK = 4;
const QUEEN = 5;
const KING = 6;
const B = 4;

enum MoveType {
  OUT_OF_BOARD = 0,
  POSSIBLE = 1,
  OURS = 2,
  CAPTURE = 3,
  CHECK_ON_KING = 4,
  SHADOWED = 5,
}

const BOARD_SIZE = 8;

const Pieces = {
  byCode: {} as Record<number, PieceInfo>,
  black: {
    Queen: QUEEN << B,
    King: KING << B,
    Rook: ROOK << B,
    Bishop: BISHOP << B,
    Knight: KNIGHT << B,
    Pawn: PAWN << B,
  },
  white: {
    Queen: QUEEN,
    King: KING,
    Rook: ROOK,
    Bishop: BISHOP,
    Knight: KNIGHT,
    Pawn: PAWN,
  },
};

const SYMBOLS: Record<string, Record<number, string>> = {
  false: {
    [KING]: "♔",
    [QUEEN]: "♕",
    [ROOK]: "♖",
    [BISHOP]: "♗",
    [KNIGHT]: "♘",
    [PAWN]: "♙",
  },
  true: {
    [KING]: "♚",
    [QUEEN]: "♛",
    [ROOK]: "♜",
    [BISHOP]: "♝",
    [KNIGHT]: "♞",
    [PAWN]: "♟",
  },
};

function Piece(code: number): PieceInfo {
  const cached = Pieces.byCode[code];
  if (cached) return cached;

  const isEmpty = code === EMPTY;
  if (isEmpty) return { isEmpty: true };

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

  const pieceInfo = {
    isBlack,
    piece,
    letter,
    symbol: SYMBOLS[String(isBlack)][piece],
    symbolWhite: SYMBOLS["false"][piece],
    symbolBlack: SYMBOLS["true"][piece],
    fenCode: isBlack ? letter : letter.toUpperCase(),
    name,
  };

  Pieces.byCode[code] = pieceInfo;
  return pieceInfo;
}

function parsePiece(piece: string): number {
  switch (piece) {
    case "R":
      return ROOK;
    case "N":
      return KNIGHT;
    case "B":
      return BISHOP;
    case "K":
      return KING;
    case "Q":
      return QUEEN;
    case "P":
      return PAWN;
    default:
      throw new Error(`unknown piece: ${piece.toString()}`);
  }
}

const FILES = "abcdefgh";
const RANKS = "87654321";
function Move(x: number, y: number): string {
  return FILES.charAt(y) + RANKS.charAt(x);
}
function Move2(a: [number, number]): string {
  return Move(a[0], a[1]);
}
function parseMove(data: string): MoveHint {
  if (data.length === 1) {
    if (/\d/.test(data)) return { x: RANKS.indexOf(data) };
    return { y: FILES.indexOf(data) };
  }
  return {
    x: RANKS.indexOf(data[1]),
    y: FILES.indexOf(data[0]),
  };
}

function parseFENPiece(s: string): number {
  const piece = parsePiece(s.toUpperCase());
  if (s.toUpperCase() === s) return piece;
  return piece << B;
}

function FEN(data: string): number[][] {
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

function SAN(data: string): SanMove {
  if (data === "1-0") return { wonByWhite: true };
  if (data === "0-1") return { wonByBlack: true };
  if (data === "1/2-1/2" || data === "½-½") return { draw: true };

  if (data === "O-O" || data === "0-0") {
    return {
      castle: true,
      kingSide: true,
    };
  }
  if (data === "O-O-O" || data === "0-0-0") {
    return {
      castle: true,
      queenSide: true,
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

function PGN(data: string): SanMove[] {
  const moves: SanMove[] = [];
  const start = data.indexOf("1.");
  if (start === -1) return moves;

  data = data.slice(start);
  const movePairs = data.split(/\s?\d+\./);
  movePairs.shift();
  for (let i = 0; i < movePairs.length; i++) {
    const pair = movePairs[i].split(" {")[0];
    const mm = pair.split(/\s+/).filter(Boolean);
    if (mm[0]) moves.push(SAN(mm[0]));
    if (mm[1]) moves.push(SAN(mm[1]));
  }
  return moves;
}

function BoardView(el: string) {
  this.el = $(el);

  this.draw = function (board: number[][]) {
    const b = $("<div>").addClass("board");
    for (let i = 0; i < board.length; i++) {
      const row = board[i];
      const r = $("<div>").addClass("row");
      r.append($("<div>").addClass("rank").text(RANKS[i]));
      for (let j = 0; j < row.length; j++) {
        r.append(this.buildPiece(i, j, board[i][j]));
      }
      b.append(r);
    }
    const files = $("<div>").addClass("files");
    files.append($("<div>").addClass("corner"));
    for (let j = 0; j < BOARD_SIZE; j++) {
      files.append($("<div>").addClass("file").text(FILES[j]));
    }
    b.append(files);
    this.el.html(b);
  };

  this.getID = function (x: number, y: number): string {
    return `cell_${Move(x, y)}`;
  };

  const drawPiece = function (b: any, piece: number) {
    const p = Piece(piece);

    if (p.isEmpty) {
      b.html("");
      return;
    }

    b.html(
      $("<span>")
        .attr("class", `piece ${p.name} ${p.isBlack ? "black" : "white"}`)
        .text(p.symbol),
    );
  };

  this.drawPiece = function (x: number, y: number, piece: number) {
    const p = $("#" + this.getID(x, y));
    drawPiece(p, piece);
  };

  this.buildPiece = function (x: number, y: number, piece: number) {
    const p = $("<div>").attr({ id: this.getID(x, y) });
    const odd = x % 2 === 0 ? y % 2 === 0 : y % 2 === 1;
    p.attr("class", `cell ${odd ? "odd" : "even"} `);

    const onselect = function (x: number, y: number) {
      this.onselect(x, y);
    }.bind(this);

    const ondeselect = function (x: number, y: number) {
      this.ondeselect(x, y);
    }.bind(this);

    p.click(function (e: any) {
      let el = $(e.target);
      if (el.hasClass("piece")) el = el.parent();

      $(".suggested").removeClass("suggested");

      if (el.hasClass("selected")) {
        el.toggleClass("selected");
        ondeselect(x, y);
      } else {
        $(".selected").removeClass("selected");
        el.addClass("selected");
        onselect(x, y);
      }
    });

    drawPiece(p, piece);
    return p;
  };

  this.clear = function (x: number, y: number) {
    $("#" + this.getID(x, y)).html("");
  };

  this.clearSelection = function () {
    $(".selected").removeClass("selected");
    $(".suggested").removeClass("suggested");
  };

  this.suggested = function (x: number, y: number, type?: string) {
    const el = $("#" + this.getID(x, y));
    el.addClass("suggested");
    if (typeof type !== "undefined") {
      el.addClass(type);
    }
  };

  const MARKS = ["can_move", "move_under_attack", "can_attack", "attack_under_attack"];
  this.clearMarks = function () {
    for (let i = 0; i < MARKS.length; i++) {
      $(".mark").removeClass(MARKS[i]);
    }
    $(".mark").removeClass("mark");
  };
  this.mark = function (x: number, y: number, style: string) {
    $("#" + this.getID(x, y)).addClass(style).addClass("mark");
  };
  this.unmark = function (x: number, y: number, style: string) {
    $("#" + this.getID(x, y)).removeClass(style).addClass("mark");
  };

  this.onselect = function (_x: number, _y: number) {};
  this.ondeselect = function (_x: number, _y: number) {};
}

function Log(b: any) {
  this.b = b;
  this.moves = [] as Array<{
    fromX: number;
    fromY: number;
    x: number;
    y: number;
    captured: number;
  }>;

  this.track = function (fromX: number, fromY: number, x: number, y: number) {
    const entry = {
      fromX,
      fromY,
      x,
      y,
      captured: this.b.get(x, y),
    };
    this.moves.push(entry);
  };

  this.back = function () {
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
  };
}

function Suggests(b: any) {
  this.b = b;

  this.filterShadows = function (
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
  };

  const KNIGHT_MOVES = [
    [2, 1],
    [2, -1],
    [1, 2],
    [-1, 2],
    [-1, -2],
    [1, -2],
    [-2, -1],
    [-2, 1],
  ];

  this.possibleMoves = function (x: number, y: number) {
    const p = Piece(this.b.get(x, y));
    if (p.isEmpty) return [];

    const isBlack = p.isBlack;

    const checkPossibleMove = function (x: number, y: number) {
      const moveType = this.b.canMove(x, y, isBlack);
      if (moveType === MoveType.POSSIBLE) {
        return [x, y];
      }
      return false;
    }.bind(this);

    const checkPossibleCapture = function (x: number, y: number) {
      const moveType = this.b.canMove(x, y, isBlack);
      if (moveType === MoveType.CAPTURE) {
        return [x, y];
      }
      return false;
    }.bind(this);

    const checkPossibleMoveOrCapture = function (x: number, y: number) {
      const moveType = this.b.canMove(x, y, isBlack);
      if (moveType === MoveType.POSSIBLE) {
        return [x, y];
      }
      if (moveType === MoveType.CAPTURE) {
        return [x, y, "capture"];
      }
      return false;
    }.bind(this);

    const diagonalMove = function () {
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
    }.bind(this);

    const directMove = function () {
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
    }.bind(this);

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
    } else if (p.piece === BISHOP) {
      possibleMoves.push(...this.filterShadows(x, y, isBlack, diagonalMove(), true));
    } else if (p.piece === KNIGHT) {
      for (let i = 0; i < KNIGHT_MOVES.length; i++) {
        const _x = x + KNIGHT_MOVES[i][0],
          _y = y + KNIGHT_MOVES[i][1];
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
    }

    return possibleMoves;
  };

  this.isAttacked = function (x: number, y: number, isBlack: boolean) {
    const signs = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
      [-1, 0],
      [1, 0],
      [0, 1],
      [0, -1],
    ];
    const ignored: number[] = [];
    for (let d = 1; d < BOARD_SIZE; d++) {
      for (let i = 0; i < signs.length; i++) {
        if (ignored.indexOf(i) !== -1) continue;

        const _x = x + signs[i][0] * d;
        const _y = y + signs[i][1] * d;

        let piece = this.b.getPiece(_x, _y);
        if (piece == null) continue;
        if (piece.isBlack === isBlack) {
          ignored.push(i);
          continue;
        }
        piece = piece.piece;

        if (signs[i][0] === 0 || signs[i][1] === 0) {
          if (piece === ROOK || piece === QUEEN) return true;
        } else {
          if (piece === BISHOP || piece === QUEEN) return true;
        }
        if (d === 1 && piece === KING) return true;
      }
    }

    const d = isBlack ? 1 : -1;
    const pawn1 = this.b.getPiece(x + d, y + 1);
    if (pawn1 == null) {
      const pawn2 = this.b.getPiece(x + d, y - 1);
      if (pawn2 != null && pawn2.isBlack !== isBlack) return true;
    } else {
      if (pawn1.isBlack !== isBlack) return true;
    }

    for (let i = 0; i < KNIGHT_MOVES.length; i++) {
      const _x = x + KNIGHT_MOVES[i][0],
        _y = y + KNIGHT_MOVES[i][1];
      const piece = this.b.getPiece(_x, _y);
      if (piece != null && piece.piece === KNIGHT) return true;
    }

    return false;
  };
}

function Board() {
  const defaultFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

  this.boardFEN = function () {
    let fen = "";
    for (let i = 0; i < BOARD_SIZE; i++) {
      let empties = 0;
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (this.isEmpty(i, j)) empties++;
        else {
          if (empties !== 0) fen += empties.toString();
          empties = 0;
          fen += Piece(this.get(i, j)).fenCode;
        }
      }
      if (empties > 0) fen += empties.toString();
      if (i !== 7) fen += "/";
    }
    return fen;
  };

  this.loadFEN = function (fen: string) {
    this.board = FEN(fen);
    this.view.draw(this.board);
  };

  this.log = new Log(this);
  this.view = new BoardView("#board");
  this.loadFEN(location.hash !== "" ? location.hash.slice(1) : defaultFEN);

  this.selection = null as [number, number] | null;
  this.view.ondeselect = function () {
    this.selection = null;
  }.bind(this);

  this.view.onselect = function (x: number, y: number) {
    if (this.selection !== null && Move2(this.selection) !== Move(x, y)) {
      const fromX = this.selection[0],
        fromY = this.selection[1];
      this.move(fromX, fromY, x, y);
      this.selection = null;
      this.view.clearSelection();
    } else if (!this.isEmpty(x, y)) {
      const moves = this.suggests.possibleMoves(x, y);
      for (let i = 0; i < moves.length; i++) {
        const _x = moves[i][0],
          _y = moves[i][1],
          type = moves[i][2];
        this.view.suggested(_x, _y, type);
      }
      this.selection = [x, y];
    }
  }.bind(this);

  this.suggests = new Suggests(this);
  this.isBlack = false;
  this.pgn = [] as SanMove[];

  this.get = function (x: number, y: number) {
    return this.board[x][y];
  };

  this.isEmpty = function (x: number, y: number) {
    return this.board[x][y] === EMPTY;
  };

  this.put = function (x: number, y: number, piece: number) {
    this.board[x][y] = piece;
    this.view.drawPiece(x, y, piece);
  };

  this.clear = function (x: number, y: number) {
    this.board[x][y] = EMPTY;
    this.view.clear(x, y);
  };

  this.move = function (x: number, y: number, x2: number, y2: number) {
    const piece = this.get(x, y);
    this.clear(x, y);
    this.log.track(x, y, x2, y2);
    this.put(x2, y2, piece);
  };

  this.outOfBoard = function (x: number, y: number) {
    return x >= BOARD_SIZE || y >= BOARD_SIZE || x < 0 || y < 0;
  };

  this.canMove = function (x: number, y: number, isBlack: boolean) {
    if (this.outOfBoard(x, y)) return MoveType.OUT_OF_BOARD;

    if (this.isEmpty(x, y)) return MoveType.POSSIBLE;

    const p = Piece(this.board[x][y]);
    if (p.isBlack === isBlack) {
      return MoveType.OURS;
    }
    if (p.piece === KING) return MoveType.CHECK_ON_KING;
    return MoveType.CAPTURE;
  };

  this.parsePGN = function (data: string) {
    this.pgn = PGN(data);
  };

  this.forward = function () {
    const san = this.pgn.shift();
    if (san) {
      this.applySAN(san);
      location.hash = this.boardFEN();
    }
  };

  this.pawnPosition = function (column: number, row: number, isBlack: boolean) {
    const j = column;
    if (isBlack) {
      for (let i = row - 1; i >= 0; i--) {
        if (this.isEmpty(i, j)) continue;
        const p = Piece(this.get(i, j));
        if (p.isBlack) return [i, j];
      }
    } else {
      for (let i = row + 1; i < BOARD_SIZE; i++) {
        if (this.isEmpty(i, j)) continue;
        const p = Piece(this.get(i, j));
        if (!p.isBlack) return [i, j];
      }
    }
  };

  this.piecePositions = function (isBlack: boolean) {
    const positions: Record<number, [number, number][]> = {};
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (this.isEmpty(i, j)) continue;
        const p = Piece(this.get(i, j));
        if (p.isBlack !== isBlack) continue;
        positions[p.piece] = positions[p.piece] || [];
        positions[p.piece].push([i, j]);
      }
    }
    return positions;
  };

  this.piecePosition = function (piece: number, isBlack: boolean, options: MoveHint, moveTo: MoveCoord) {
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
  };

  this.applySAN = function (san: SanMove) {
    if (san.draw || san.wonByBlack || san.wonByWhite) return;
    if (san.castle) {
      let rank = "1";
      if (this.isBlack) {
        rank = "8";
      }
      const king = parseMove("e" + rank) as MoveCoord;
      if (Piece(this.get(king.x, king.y)).piece !== KING) {
        console.error("can't castle: king is not in correct place", king);
      }
      if (san.kingSide) {
        const kingTo = parseMove("g" + rank) as MoveCoord;
        this.move(king.x, king.y, kingTo.x, kingTo.y);
        const rook = parseMove("h" + rank) as MoveCoord;
        const rookTo = parseMove("f" + rank) as MoveCoord;
        this.move(rook.x, rook.y, rookTo.x, rookTo.y);
      } else if (san.queenSide) {
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
  };

  this.getPiece = function (x: number, y: number) {
    if (this.outOfBoard(x, y)) return null;
    if (this.isEmpty(x, y)) return null;
    return Piece(this.get(x, y));
  };

  this.eachPiece = function (block: (piece: PieceInfo, x: number, y: number) => void) {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (this.isEmpty(i, j)) continue;
        block(this.getPiece(i, j), i, j);
      }
    }
  };

  this.showAttackedFields = function () {
    this.view.clearMarks();
    this.eachPiece(
      function (piece: PieceInfo, x: number, y: number) {
        if (piece.isEmpty) return;
        const enemy = piece.isBlack !== this.isBlack;
        if (enemy) return;
        const moves = this.suggests.possibleMoves(x, y);
        for (let i = 0; i < moves.length; i++) {
          const x2 = moves[i][0],
            y2 = moves[i][1];
          const attacked = this.suggests.isAttacked(x2, y2, this.isBlack);
          let mark;
          if (attacked) {
            mark = this.isEmpty(x2, y2) ? "move_under_attack" : "attack_under_attack";
          } else {
            mark = this.isEmpty(x2, y2) ? "can_move" : "attack";
          }
          this.view.mark(x2, y2, mark);
        }
      }.bind(this),
    );
  };

  this.switchTurn = function () {
    this.isBlack = !this.isBlack;
  };

  this.back = function () {
    this.log.back();
  };
}

let board: any;
let hasInit = false;

function initBoardUI() {
  if (hasInit) return;
  hasInit = true;
  board = new (Board as any)();
  (window as any).board = board;
  (window as any).$ = $;
  (window as any).jQuery = $;

  $("#pgn").val(localStorage.getItem("pgn"));
  $("#apply-pgn").on("click", function () {
    const v = $("#pgn").val();
    localStorage.setItem("pgn", String(v ?? ""));
    board.parsePGN(String(v ?? ""));
  });
  $("#show-attacked").on("change", function () {
    board.showAttackedFields();
  });
  $("#switch-turn").on("change", function () {
    board.switchTurn();
  });

  document.onkeypress = function (e: any) {
    if (e.keyCode === 32) {
      board.forward();
    } else if (e.keyCode === 26 && (e.ctrlKey || e.metaKey)) {
      board.back();
    }
  };
}

function App() {
  useEffect(() => {
    initBoardUI();
  }, []);

  return (
    <div className="app">
      <div id="board"></div>

      <div className="side">
        <h4>PGN</h4>
        <textarea id="pgn"></textarea>
        <div>
          <button id="apply-pgn">Apply</button>
        </div>
        <div>
          <label>
            <input id="show-attacked" type="checkbox" /> Show attacked fields
          </label>
          <br />
          <label>
            <input id="switch-turn" type="checkbox" /> Switch turn
          </label>
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
