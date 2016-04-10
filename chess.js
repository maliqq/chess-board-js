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

function Piece(code) {
  var isEmpty = code == EMPTY;
  if (isEmpty) return {isEmpty: true};
  var isBlack = !isEmpty && (code >> B != 0);
  var piece = isBlack ? (code >> B) : code;
  var name;
  switch (piece) {
    case EMPTY:
      name = "empty"; break;
    case PAWN:
      name = "pawn"; break;
    case BISHOP:
      name = "bishop"; break;
    case KNIGHT:
      name = "knight"; break;
    case ROOK:
      name = "rook"; break;
    case QUEEN:
      name = "queen"; break;
    case KING:
      name = "king"; break;
  }
  return {
    isBlack: isBlack,
    piece: piece,
    name: name
  }
}

function Move(x, y) {
  return 'abcdefgh'.charAt(y)+'87654321'.charAt(x);
}
function Move2(a) {
  return Move(a[0], a[1]);
}

function BoardView(el) {
  this.el = $(el);

  this.draw = function(board) {
    var b = $('<div>').addClass('board');
    for (var i = 0; i < board.length; i++) {
      var row = board[i];
      var r = $('<div>').addClass('row');
      for (var j = 0; j < row.length; j++) {
        r.append(this.buildPiece(i, j, board[i][j]));
      }
      b.append(r);
    }
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

    eval(
    'var SYMBOLS ='+
      '{false: {'+KING+': "♔", '+QUEEN+': "♕", '+ROOK+': "♖", '+BISHOP+': "♗", '+KNIGHT+': "♘", '+PAWN+': "♙"},'+
        'true: {'+KING+': "♚", '+QUEEN+': "♛", '+ROOK+': "♜", '+BISHOP+': "♝", '+KNIGHT+': "♞", '+PAWN+': "♟"}};'
    )

    var symbol = SYMBOLS[p.isBlack][p.piece];
    b.html($('<span>').attr('class', 'piece ' + p.name + (p.isBlack ? ' black' : ' white')).text(symbol));
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
        console.log('ondeselect');
        ondeselect(x, y);
      } else {
        $('.selected').removeClass('selected');
        el.addClass('selected');
        console.log('onselect');
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
    if (typeof type != undefined) {
      el.addClass(type);
    }
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
    //return moves;
    var filtered = [];

    var directions = [BOARD_SIZE, BOARD_SIZE, BOARD_SIZE, BOARD_SIZE];

    function __direction(_x, _y) {
      if (isDiagonal) {
        var d = [Math.sign(_x - x), Math.sign(_y - y)];
        switch (d) {
          case [1, 1]: return 0;
          case [1, -1]: return 1;
          case [-1, -1]: return 2;
          case [-1, 1]: return 3;
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
      //console.log(Move(_x, _y))
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

  this.on = function(x, y) {
    var p = Piece(this.b.get(x, y));
    var isBlack = p.isBlack;

    var checkPossibleMove = function(x, y) {
      var moveType = this.b.canMove(x, y, isBlack);
      if (moveType == MoveType.POSSIBLE) {
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
        break;

      case ROOK:
        possibleMoves = possibleMoves.concat(this.filterShadows(x, y, isBlack, directMove(), false));
        break;

      case BISHOP:
        possibleMoves = possibleMoves.concat(this.filterShadows(x, y, isBlack, diagonalMove(), true));
        break;

      case KNIGHT:
        var moves = [
          [2, 1], [2, -1],
          [1, 2], [-1, 2],
          [-1, -2], [1, -2],
          [-2, -1], [-2, 1]
        ]
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
}

function Board() {
  this.board = [
    [ROOK << B, KNIGHT << B, BISHOP << B, QUEEN << B, KING << B, BISHOP << B, KNIGHT << B, ROOK << B],
    [PAWN << B, PAWN << B, PAWN << B, PAWN << B, PAWN << B, PAWN << B, PAWN << B, PAWN << B],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [PAWN, PAWN, PAWN, PAWN, PAWN, PAWN, PAWN, PAWN],
    [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK]
  ];

  this.log = new Log(this);
  this.view = new BoardView('#board');
  this.view.draw(this.board);

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
      var moves = this.suggests.on(x, y);
      for (var i = 0; i < moves.length; i++) {
        var _x = moves[i][0], _y = moves[i][1], type = moves[i][2];
        this.view.suggested(_x, _y, type);
      }
      this.selection = [x, y];
    }
  }.bind(this);

  this.suggests = new Suggests(this);
  this.whiteTurn = true;

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

  this.back = function() {
    this.log.back();
  }
}