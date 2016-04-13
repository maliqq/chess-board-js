EMPTY = 0;
PAWN = 1;
BISHOP = 2;
KNIGHT = 3;
ROOK = 4;
QUEEN = 5;
KING = 6;
B = 4;

MoveType = {
  OUT_OF_BOARD: 0,
  POSSIBLE: 1,
  OURS: 2,
  CAPTURE: 3,
  CHECK_ON_KING: 4,
  SHADOWED: 5
}

var BOARD_SIZE = 8;

var Pieces = {
  byCode: {},
  black: {
    Queen:  QUEEN << B,
    King:   KING << B,
    Rook:   ROOK << B,
    Bishop: BISHOP << B,
    Knight: KNIGHT << B,
    Pawn:   PAWN << B
  },
  white: {
    Queen:  QUEEN,
    King:   KING,
    Rook:   ROOK,
    Bishop: BISHOP,
    Knight: KNIGHT,
    Pawn:   PAWN
  }
}

function Piece(code) {
  var piece = Pieces.byCode[code];
  if (!piece) {
    var isEmpty = code == EMPTY;
    if (isEmpty) return {isEmpty: true};
    var isBlack = code >> B != 0;
    var piece = isBlack ? (code >> B) : code;
    var name, letter;
    switch (piece) {
      case PAWN:
        name = "pawn"; letter = "p"; break;
      case BISHOP:
        name = "bishop"; letter = "b"; break;
      case KNIGHT:
        name = "knight"; letter = "n"; break;
      case ROOK:
        name = "rook"; letter = "r"; break;
      case QUEEN:
        name = "queen"; letter = "q"; break;
      case KING:
        name = "king"; letter = "k"; break;
    }
    eval(
    'var SYMBOLS ='+
      '{false: {'+KING+': "♔", '+QUEEN+': "♕", '+ROOK+': "♖", '+BISHOP+': "♗", '+KNIGHT+': "♘", '+PAWN+': "♙"},'+
        'true: {'+KING+': "♚", '+QUEEN+': "♛", '+ROOK+': "♜", '+BISHOP+': "♝", '+KNIGHT+': "♞", '+PAWN+': "♟"}};'
    )

    piece = {
      isBlack: isBlack,
      piece: piece,
      letter: letter,
      symbol: SYMBOLS[isBlack][piece],
      symbolWhite: SYMBOLS[false][piece],
      symbolBlack: SYMBOLS[true][piece],
      fenCode: isBlack ? letter : letter.toUpperCase(),
      name: name
    }
  }
  return piece;
}

function parsePiece(piece) {
  switch (piece) {
    case 'R': return ROOK;
    case 'N': return KNIGHT;
    case 'B': return BISHOP;
    case 'K': return KING;
    case 'Q': return QUEEN;
    case 'P': return PAWN;
    default:
      throw("unknown piece: "+ piece.toString());
  }
}

FILES = 'abcdefgh';
RANKS = '87654321';
function Move(x, y) {
  return FILES.charAt(y)+RANKS.charAt(x);
}
function Move2(a) {
  return Move(a[0], a[1]);
}
function parseMove(data) {
  if (data.length == 1) {
    if (/\d/.test(data)) return {x: RANKS.indexOf(data)};
    return {y: FILES.indexOf(data)};
  }
  return {
    x: RANKS.indexOf(data[1]),
    y: FILES.indexOf(data[0])
  }
}

function parseFENPiece(s) {
  var piece = parsePiece(s.toUpperCase());
  if (s.toUpperCase() == s) return piece;
  return piece << B;
}

function FEN(data) {
  data = data.split(' ')[0];
  var _board = [];
  var rows = data.split('/');
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var _row = [];
    var figures = row.split("");
    for (var j = 0; j < figures.length; j++) {
      var figure = figures[j];
      if (/\d/.test(figure)) {
        var empties = parseInt(figure)
        for (var count = 0; count < empties; count++) _row.push(0);
      } else {
        _row.push(parseFENPiece(figure));
      }
    }
    _board.push(_row);
  }
  return _board;
}

function SAN(data) {
  // castling
  if (data == '1-0') return {wonByWhite: true};
  if (data == '0-1') return {wonByBlack: true};
  if (data == '1/2-1/2' || data == '½-½') return {draw: true};

  if (data == 'O-O' || data == '0-0') {
    return {
      castle: true,
      kingSide: true
    };
  }
  if (data == 'O-O-O' || data == '0-0-0') {
    return {
      castle: true,
      queenSide: true
    };
  }

  var endWith = data[data.length-1]
  var isMate = endWith == '#';
  if (isMate) {
    data = data.slice(0, -1);
  }
  var isCheck = endWith == '+';
  if (isCheck) {
    data = data.slice(0, -1);
  }

  var moveFrom = {};
  var moveTo = {};

  var piece;
  var promotedTo;
  var isPiece = /^[BKNQR]/.test(data[0]);
  var isCapture = data.indexOf('x') != -1;

  if (isPiece) {
    piece = parsePiece(data[0]);
    data = data.slice(1);
    var m = data.match(/([a-h1-8])?x?([a-h][1-8])/);
    if (typeof m[1] != 'undefined') {
      moveFrom = parseMove(m[1]);
      moveTo = parseMove(m[2]);
    } else {
      moveTo = parseMove(m[2]);
    }
  } else { // pawn
    isPromotion = data.indexOf('=') != -1;
    if (isPromotion) {
      parts = data.split('=');
      data = parts[0];
      promotedTo = parts[1];
    }
    var m = data.match(/([a-h][1-8]?)?x?([a-h][1-8])/);
    moveTo = parseMove(m[2]);
    if (typeof m[1] != 'undefined') {
      moveFrom = parseMove(m[1]);
    }
  }

  return {
    piece: piece || PAWN,
    moveFrom: moveFrom,
    moveTo: moveTo,
    isCheck: isCheck, isMate: isMate, isCapture: isCapture,
    promotedTo: promotedTo
  }
}

function PGN(data) {
  var moves = [];
  data = data.slice(data.indexOf("1."))
  movePairs = data.split(/\s?\d+\./)
  movePairs.shift();
  for (var i = 0; i < movePairs.length; i++) {
    var pair = movePairs[i].split(' {')[0]; // without comment
    var mm = pair.split(/\s+/);
    moves.push(SAN(mm[0]));
    moves.push(SAN(mm[1]));
  }
  return moves;
}

function BoardView(el) {
  this.el = $(el);

  this.draw = function(board) {
    var b = $('<div>').addClass('board');
    for (var i = 0; i < board.length; i++) {
      var row = board[i];
      var r = $('<div>').addClass('row');
      r.append($('<div>').addClass('rank').text(RANKS[i]));
      for (var j = 0; j < row.length; j++) {
        r.append(this.buildPiece(i, j, board[i][j]));
      }
      b.append(r);
    }
    var files = $('<div>').addClass('files');
    files.append($('<div>').addClass('corner'));
    for (var j = 0; j < BOARD_SIZE; j++) {
      files.append($('<div>').addClass('file').text(FILES[j]));
    }
    b.append(files);
    this.el.html(b);
  }

  this.getID = function(x, y) {
    return 'cell_'+Move(x, y);
  }

  __draw = function(b, piece) {
    var p = Piece(piece);

    if (p.isEmpty) {
      b.html('');
      return;
    }

    b.html($('<span>').attr('class', 'piece ' + p.name + (p.isBlack ? ' black' : ' white')).text(p.symbol));
  }

  this.drawPiece = function(x, y, piece) {
    var p = $('#'+this.getID(x, y));
    __draw(p, piece);
  }

  this.buildPiece = function(x, y, piece) {
    var p = $('<div>').attr({id: this.getID(x, y)});
    var odd = x % 2 == 0 ? y % 2 == 0 : y % 2 == 1;
    p.attr('class', 'cell ' + (odd ? 'odd ' : 'even '));
    var onselect = function(x, y) {
      this.onselect(x, y);
    }.bind(this);
    var ondeselect = function(x, y) {
      this.ondeselect(x, y);
    }.bind(this);
    p.click(function(e) {
      var el = $(e.target);
      if (el.hasClass('piece')) el = el.parent();

      $('.suggested').removeClass('suggested');

      if (el.hasClass('selected')) {
        el.toggleClass('selected');
        ondeselect(x, y);
      } else {
        $('.selected').removeClass('selected');
        el.addClass('selected');
        onselect(x, y);
      }
    })
    __draw(p, piece);
    return p;
  }

  this.clear = function(x, y) {
    $('#'+this.getID(x, y)).html("");
  }

  this.clearSelection = function() {
    $('.selected').removeClass('selected');
    $('.suggested').removeClass('suggested');
  }

  this.suggested = function(x, y, type) {
    var el = $('#'+this.getID(x, y));
    el.addClass('suggested');
    if (typeof type != 'undefined') {
      el.addClass(type);
    }
  }

  MARKS = ['can_move', 'move_under_attack', 'can_attack', 'attack_under_attack']
  this.clearMarks = function() {
    for (var i = 0; i < MARKS.length; i++) {
      $('.mark').removeClass(MARKS[i]);
    }
    $('.mark').removeClass('mark');
  }
  this.mark = function(x, y, style) {
    $('#'+this.getID(x, y)).addClass(style).addClass('mark');
  }
  this.unmark = function(x, y, style) {
    $('#'+this.getID(x, y)).removeClass(style).addClass('mark');
  }

  this.onselect = function() {};
  this.ondeselect = function() {};
}

function Log(b) {
  this.b = b;
  this.moves = [];

  this.track = function(fromX, fromY, x, y) {
    var entry = {
      fromX: fromX, fromY: fromY,
      x: x, y: y,
      captured: this.b.get(x, y)
    }
    this.moves.push(entry);
  }

  this.back = function() {
    if (this.moves.length == 0) return;

    var entry = this.moves.pop();
    var current = this.b.get(entry.x, entry.y);
    this.b.put(entry.fromX, entry.fromY, current);
    if (entry.captured) {
      this.b.put(entry.x, entry.y, entry.captured);
    } else {
      this.b.clear(entry.x, entry.y);
    }
  }
}

function Suggests(b) {
  this.b = b;

  this.filterShadows = function(x, y, isBlack, moves, isDiagonal) {
    var filtered = [];

    var directions = [BOARD_SIZE, BOARD_SIZE, BOARD_SIZE, BOARD_SIZE];

    function __direction(_x, _y) {
      if (isDiagonal) {
        var d = [Math.sign(_x - x), Math.sign(_y - y)];
        switch (JSON.stringify(d)) {
          case '[1,1]': return 0;
          case '[1,-1]': return 1;
          case '[-1,-1]': return 2;
          case '[-1,1]': return 3;
        }
      }
      if (_x == x) {
        return _y > y ? 0 : 1;
      } else {
        return _x > x ? 2 : 3;
      }
    }

    function __distance() {
      return isDiagonal ? Math.abs(_x - x) : (
            _x == x ? Math.abs(_y - y) : Math.abs(_x - x)
          )
    }

    // first pass
    for (var i = 0; i < moves.length; i++) {
      var move = moves[i];
      var _x = move[0], _y = move[1];
      var moveType = this.b.canMove(_x, _y, isBlack);
      if (moveType == MoveType.CHECK_ON_KING || moveType == MoveType.CAPTURE || moveType == MoveType.OURS) {
        var min = directions[__direction(_x, _y)];
        var distance = __distance(_x, _y);
        if (distance < min || min == BOARD_SIZE) {
          directions[__direction(_x, _y)] = distance;
        }
      }
    }

    // second pass
    for (var i = 0; i < moves.length; i++) {
      var move = moves[i];
      var _x = move[0], _y = move[1];
      var min = directions[__direction(_x, _y)];
      var distance = __distance(_x, _y);
      var moveType = this.b.canMove(_x, _y, isBlack);
      if (moveType == MoveType.OURS) continue;
      if (moveType == MoveType.CAPTURE) {
        move.push("capture"); // we need type
      }
      if (distance <= min || min == BOARD_SIZE) {
        filtered.push(move);
      }
    }

    return filtered;
  }

  KNIGHT_MOVES = [
    [2, 1], [2, -1],
    [1, 2], [-1, 2],
    [-1, -2], [1, -2],
    [-2, -1], [-2, 1]
  ]

  this.possibleMoves = function(x, y) {
    var p = Piece(this.b.get(x, y));
    var isBlack = p.isBlack;

    var checkPossibleMove = function(x, y) {
      var moveType = this.b.canMove(x, y, isBlack);
      if (moveType == MoveType.POSSIBLE) {
        return [x, y];
      }
      return false;
    }.bind(this);

    var checkPossibleCapture = function(x, y) {
      var moveType = this.b.canMove(x, y, isBlack);
      if (moveType == MoveType.CAPTURE) {
        return [x, y];
      }
      return false;
    }.bind(this);

    var checkPossibleMoveOrCapture = function(x, y) {
      var moveType = this.b.canMove(x, y, isBlack);
      if (moveType == MoveType.POSSIBLE) {
        return [x, y];
      }
      if (moveType == MoveType.CAPTURE) {
        return [x, y, "capture"];
      }
      return false;
    }.bind(this);

    var diagonalMove = function() {
      var moves = [];
      for (var i = 0; i < BOARD_SIZE; i++) {
        if (i != x) {
          var k = x - i;
          var up = y - k;
          var down = y + k;
          if (!this.b.outOfBoard(i, up)) moves.push([i, up]);
          if (!this.b.outOfBoard(i, down)) moves.push([i, down]);
        }
      }
      return moves;
    }.bind(this);

    var directMove = function() {
      var ignoreColor = -1;
      var moves = [];
      for (var i = 0; i < BOARD_SIZE; i++) {
        if (i == x) continue;
        if (!this.b.outOfBoard(i, y)) moves.push([i, y]);
      }

      for (var j = 0; j < BOARD_SIZE; j++) {
        if (j == y) continue;
        if (!this.b.outOfBoard(x, j)) moves.push([x, j]);
      }
      return moves;
    }.bind(this)

    var possibleMoves = [];
    switch (p.piece) {
      case PAWN:
        var o = isBlack ? 1 : -1;
        var isStartingPos = isBlack ? x == 1 : x == 6;
        var move = checkPossibleMove(x+o, y);
        if (move !== false) {
          possibleMoves.push(move);
          if (isStartingPos) {
            var move = checkPossibleMove(x+o*2, y);
            if (move !== false) {
              possibleMoves.push(move);
            }
          }
        }
        // attack moves
        var move1 = checkPossibleCapture(x+o, y+1, isBlack);
        var move2 = checkPossibleCapture(x+o, y-1, isBlack);
        if (move1 !== false) possibleMoves.push(move1);
        if (move2 !== false) possibleMoves.push(move2);
        break;

      case ROOK:
        possibleMoves = possibleMoves.concat(this.filterShadows(x, y, isBlack, directMove(), false));
        break;

      case BISHOP:
        possibleMoves = possibleMoves.concat(this.filterShadows(x, y, isBlack, diagonalMove(), true));
        break;

      case KNIGHT:
        var moves = KNIGHT_MOVES;
        for (var i = 0; i < moves.length; i++) {
          var _x = x + moves[i][0], _y = y + moves[i][1];
          var move = checkPossibleMoveOrCapture(_x, _y)
          if (move !== false) {
            possibleMoves.push(move);
          }
        }

        break;

      case QUEEN:
        possibleMoves = possibleMoves.concat(this.filterShadows(x, y, isBlack, directMove(), false));
        possibleMoves = possibleMoves.concat(this.filterShadows(x, y, isBlack, diagonalMove(), true));
        break;

      case KING:
        var moves = [
          [1, 1], [-1, -1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, -1], [0, 1]
        ]
        for (var i = 0; i < moves.length; i++) {
          var _x = x + moves[i][0], _y = y + moves[i][1];
          var move = checkPossibleMoveOrCapture(_x, _y);
          if (move !== false) {
            possibleMoves.push(move);
          }
        }
        break;
    }

    return possibleMoves;
  }

  this.isAttacked = function(x, y, isBlack) {
    var signs = [
      [-1,-1], [-1, 1], [1, -1], [1, 1],
      [-1, 0], [1, 0], [0, 1], [0, -1]
    ]
    var ignored = [];
    for (var d = 1; d < BOARD_SIZE; d++) {
      for (var i = 0; i < signs.length; i++) {
        if (ignored.indexOf(i) != -1) continue;

        var _x = x + signs[i][0] * d;
        var _y = y + signs[i][1] * d;

        var piece = this.b.getPiece(_x, _y);
        if (piece == null) continue;
        if (piece.isBlack == isBlack) {
          ignored.push(i);
          continue;
        }
        piece = piece.piece;

        if (signs[i][0] == 0 || signs[i][1] == 0) {
          // direct move
          if (piece == ROOK || piece == QUEEN) return true;
        } else {
          // diagonal move
          if (piece == BISHOP || piece == QUEEN) return true;
        }
        // king attack
        if (d == 1 && piece == KING) return true;
      }
    }

    // pawn attacks
    var d = isBlack ? 1 : -1;
    var pawn1 = this.b.getPiece(x + d, y + 1);
    if (pawn1 == null) {
      var pawn2 = this.b.getPiece(x + d, y - 1);
      if (pawn2 != null && pawn2.isBlack != isBlack) return true;
    } else {
      if (pawn1.isBlack != isBlack) return true;
    }

    // knight moves
    for (var i = 0; i < KNIGHT_MOVES.length; i++) {
      var _x = x + KNIGHT_MOVES[i][0], _y = y + KNIGHT_MOVES[i][1];
      var piece = this.b.getPiece(_x, _y);
      if (piece != null && piece.piece == KNIGHT) return true;
    }

    return false;
  }
}

function Board() {
  var defaultFEN = 'rkbqkbkr/pppppppp/8/8/8/8/PPPPPPPP/RKBQKBKR';

  this.boardFEN = function() {
    var fen = "";
    for (var i = 0; i < BOARD_SIZE; i++) {
      var empties = 0;
      for (var j = 0; j < BOARD_SIZE; j++) {
        if (this.isEmpty(i, j)) empties++;
        else {
          if (empties != 0) fen += empties.toString()
          empties = 0;
          fen += Piece(this.get(i, j)).fenCode;
        }
      }
      if (empties > 0) fen += empties.toString();
      if (i != 7) fen += "/";
    }
    return fen;
  }

  this.loadFEN = function(fen) {
    this.board = FEN(fen);
    this.view.draw(this.board);
  }

  this.log = new Log(this);
  this.view = new BoardView('#board');
  this.loadFEN(location.hash != '' ? location.hash.slice(1) : defaultFEN);

  this.selection = null;
  this.view.ondeselect = function(x, y) {
    this.selection = null;
  }.bind(this);

  this.view.onselect = function(x, y) {
    if (this.selection !== null && Move2(this.selection) != Move(x, y)) {
      var fromX = this.selection[0], fromY = this.selection[1];
      this.move(fromX, fromY, x, y);
      this.selection = null;
      this.view.clearSelection();
    } else if (!this.isEmpty(x, y)) {
      var moves = this.suggests.possibleMoves(x, y);
      for (var i = 0; i < moves.length; i++) {
        var _x = moves[i][0], _y = moves[i][1], type = moves[i][2];
        this.view.suggested(_x, _y, type);
      }
      this.selection = [x, y];
    }
  }.bind(this);

  this.suggests = new Suggests(this);
  this.isBlack = false;

  this.get = function(x, y) {
    return this.board[x][y];
  }

  this.isEmpty = function(x, y) {
    return this.board[x][y] == EMPTY;
  }

  this.put = function(x, y, piece) {
    this.board[x][y] = piece;
    this.view.drawPiece(x, y, piece);
  }

  this.clear = function(x, y) {
    this.board[x][y] = EMPTY;
    this.view.clear(x, y);
  }

  this.move = function(x, y, x2, y2) {
    var piece = this.get(x, y);
    this.clear(x, y);
    this.log.track(x, y, x2, y2);
    this.put(x2, y2, piece);
  }

  this.outOfBoard = function(x, y) {
    return x >= BOARD_SIZE || y >= BOARD_SIZE || x < 0 || y < 0;
  }

  this.canMove = function(x, y, isBlack) {
    if (this.outOfBoard(x, y)) return MoveType.OUT_OF_BOARD;

    if (this.isEmpty(x, y)) return MoveType.POSSIBLE;

    var p = Piece(this.board[x][y]);
    if (p.isBlack === isBlack) {
      return MoveType.OURS;
    }
    if (p.piece == KING) return MoveType.CHECK_ON_KING;
    return MoveType.CAPTURE;
  }

  this.pgn = [];
  this.parsePGN = function(data) {
    this.pgn = PGN(data);
  }

  this.forward = function() {
    var san = this.pgn.shift();
    if (san) {
      this.applySAN(san);
      location.hash = this.boardFEN();
    }
  }

  this.pawnPosition = function(column, row, isBlack) {
    var j = column;
    if (isBlack) { // seek black pawns
      for (var i = row-1; i >= 0; i--) {
        if (this.isEmpty(i, j)) continue;
        var p = Piece(this.get(i, j));
        if (p.isBlack) return [i, j];
      }
    } else { // seek white pawns
      for (var i = row+1; i < BOARD_SIZE; i++) {
        if (this.isEmpty(i, j)) continue;
        var p = Piece(this.get(i, j));
        if (!p.isBlack) return [i, j];
      }
    }
  }

  this.piecePositions = function(isBlack) {
    var positions = {};
    for (var i = 0; i < BOARD_SIZE; i++) {
      for (var j = 0; j < BOARD_SIZE; j++) {
        if (this.isEmpty(i, j)) continue;
        var p = Piece(this.get(i, j));
        if (p.isBlack !== isBlack) continue;
        positions[p.piece] = positions[p.piece] || [];
        positions[p.piece].push([i, j]);
      }
    }
    return positions;
  }

  this.piecePosition = function(piece, isBlack, options, moveTo) {
    var positions = this.piecePositions(isBlack)[piece];
    if (positions.length == 1) {
      return positions[0];
    }

    for (var i = 0; i < positions.length; i++) {
      var pos = positions[i];

      if (options.y && pos[1] == options.y) return pos;
      if (options.x && pos[0] == options.x) return pos;
    }

    for (var i = 0; i < positions.length; i++) {
      var pos = positions[i];
      var suggests = this.suggests.possibleMoves(pos[0], pos[1]);
      for (var j = 0; j < suggests.length; j++) {
        if (suggests[j][0] == moveTo.x && suggests[j][1] == moveTo.y) {
          return pos;
        }
      }
    }

    console.error("which piece to move?", piece, isBlack, options, moveTo);
  }

  this.applySAN = function(san) {
    if (san.draw || san.wonByBlack || san.wonByWhite) return;
    if (san.castle) {
      var rank = '1';
      if (this.isBlack) {
        rank = '8';
      }
      var king = parseMove('e'+rank);
      if (Piece(board.get(king.x, king.y)).piece != KING) {
        console.error("can't castle: king is not in correct place", king)
      }
      if (san.kingSide) {
        var kingTo = parseMove('g'+rank);
        this.move(king.x, king.y, kingTo.x, kingTo.y);
        var rook = parseMove('h'+rank);
        var rookTo = parseMove('f'+rank);
        this.move(rook.x, rook.y, rookTo.x, rookTo.y);
      } else if (san.queenSide) {
        var kingTo = parseMove('c'+rank);
        this.move(king.x, king.y, kingTo.x, kingTo.y);
        var rook = parseMove('a'+rank);
        var rookTo = parseMove('d'+rank);
        this.move(rook.x, rook.y, rookTo.x, rookTo.y);
      }
    } else if (san.piece == PAWN) {
      // pawn movements
      var pos = this.pawnPosition(san.isCapture ? san.moveFrom.y : san.moveTo.y, san.moveTo.x, this.isBlack);
      if (!pos) {
        console.error("can't move pawn");
      }
      this.move(pos[0], pos[1], san.moveTo.x, san.moveTo.y);
    } else {
      var pos = this.piecePosition(san.piece, this.isBlack, san.moveFrom, san.moveTo);
      this.move(pos[0], pos[1], san.moveTo.x, san.moveTo.y);
    }

    this.switchTurn();
  }

  this.getPiece = function(x, y) {
    if (this.outOfBoard(x, y)) return null;
    if (this.isEmpty(x, y)) return null;
    return Piece(this.get(x, y))
  }

  this.eachPiece = function(block) {
    for (var i = 0; i < BOARD_SIZE; i++) {
      for (var j = 0; j < BOARD_SIZE; j++) {
        if (this.isEmpty(i, j)) continue;
        block(this.getPiece(i, j), i, j)
      }
    }
  }

  this.showAttackedFields = function() {
    this.view.clearMarks();
    this.eachPiece(function(piece, x, y) {
      var enemy = piece.isBlack != this.isBlack;
      if (enemy) return;
      var moves = this.suggests.possibleMoves(x, y);
      for (var i = 0; i < moves.length; i++) {
        var x = moves[i][0], y = moves[i][1];
        var attacked = this.suggests.isAttacked(x, y, this.isBlack);
        var mark;
        if (attacked) {
          mark = this.isEmpty(x, y) ? 'move_under_attack' : 'attack_under_attack';
        } else {
          mark = this.isEmpty(x, y) ? 'can_move' : 'attack';
        }
        this.view.mark(x, y, mark);
      }
    }.bind(this));
  }

  this.switchTurn = function() {
    this.isBlack = !this.isBlack;
  }

  this.back = function() {
    this.log.back();
  }
}
