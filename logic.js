"use strict";
/* Tool to analyse chess positions */
//[of]:HASH
let HASH = new class {
    constructor() {
        this.items = {};
        this.uid = 0;
        //[cf]
    }
    //[of]:public add()
    add(thing) {
        this.items[++this.uid] = thing;
        return this.uid;
    }
    //[cf]
    //[of]:public get()
    get(uid) {
        return this.items[uid];
    }
};
//[cf]
//[of]:State
/** The Application state. */
class State {
    //[c]    ~ variation: ChessVariation | undefined;
    //[of]:constructor()
    constructor() {
        this.observers = new Set();
        this.position = null;
    }
    //[cf]
    //[of]:private notifyObservers()
    /** called internally when changes to the State were made */
    notifyObservers() {
        for (let observer of this.observers) {
            observer.update();
        }
    }
    //[cf]
    //[of]:public reset()
    /** Call this after all observers have been registered (ApplicationState.obserers.add(Observer)). This is also executed when clicking the 'reset' button, therefore the name. */
    reset() {
        this.position = new ChessPosition(ChessPosition.STARTFEN);
        //[c]    ~ let move = new ChessMove(position);
        //[c]    ~ let variation = new ChessVariation();
        //[c]    ~ variation.appendMove(move);
        //[c]    ~ this.variation = variation;
        this.notifyObservers();
    }
}
//[cf]
//[of]:Observer
/** An element on the page, listening to changes in the State */
class Observer {
    //[of]:constructor()
    constructor(state) {
        this.state = state;
        state.observers.add(this);
    }
    //[cf]
    //[of]:public update()
    /** {@link State} calls this on every {@link Observer}, when it has made changes to its state. Dont call it manually, as it assumes that some things are set in the State. */
    update() {
        console.log('Observer.update() - to be implemented in subclasses');
    }
}
//[cf]
//[of]:Chess board
class ChessBoard extends Observer {
    //[cf]
    //[of]:constructor()
    constructor(id, state) {
        super(state);
        this.pieces = {};
        this.grabbedPiece = null;
        //[of]:define .dimensions
        let domElement = $(id);
        this.domElement = domElement;
        let dimensions = { boardSize: 0, pieceSize: 0, halfPieceSize: 0 };
        let boardSize = Math.round(domElement.width() || 300);
        dimensions.boardSize = boardSize;
        let pieceSize = Math.round(boardSize / 8);
        dimensions.pieceSize = pieceSize;
        dimensions.halfPieceSize = Math.round(pieceSize / 2);
        this.dimensions = dimensions;
        //[cf]
        let self = this;
        //[of]:define mousedown handler
        domElement.on('mousedown', 'chess-piece', function (event) {
            let piece = $(this);
            self.grab(piece, event);
            event.stopPropagation();
        });
        //[cf]
        //[of]:define mousemovehandler
        domElement.on('mousemove', function (event) {
            let piece = self.grabbedPiece;
            if (piece) {
                self.grab(piece, event);
                event.stopPropagation();
            }
        });
        //[cf]
        //[of]:define mouseup handler
        domElement.on('mouseup', function (event) {
            let piece = self.grabbedPiece;
            if (piece) {
                self.release(piece, event);
                event.stopPropagation();
            }
        });
        //[cf]
    }
    //[of]:static mouseX()
    static mouseX(event) {
        return (event.pageX) - event.delegateTarget.offsetLeft;
    }
    //[cf]
    //[of]:static mouseY()
    static mouseY(event) {
        return event.pageY - event.delegateTarget.offsetTop;
    }
    //[cf]
    //[of]:static percentage()
    static percentage(coordinate) {
        return coordinate * 12.5 + '%';
    }
    //[cf]
    //[of]:static coordsFromPos()
    static coordsFromPos(pos) {
        let x = pos % 8;
        return [x, (pos - x) / 8];
    }
    //[cf]
    //[of]:private dragX()
    dragX(event) {
        return ChessBoard.mouseX(event) - this.dimensions.halfPieceSize;
    }
    //[cf]
    //[of]:private dragY()
    dragY(event) {
        return ChessBoard.mouseY(event) - this.dimensions.halfPieceSize;
    }
    //[cf]
    //[of]:private grab()
    grab(piece, event) {
        this.grabbedPiece = piece;
        piece.css({
            top: this.dragY(event),
            left: this.dragX(event)
        });
    }
    //[cf]
    //[of]:private indexFromMousePos()
    indexFromMousePos(mousePos) {
        return Math.floor(mousePos / this.dimensions.pieceSize);
    }
    //[cf]
    //[of]:private release()
    release(piece, event) {
        this.grabbedPiece = null;
        piece.css({
            top: ChessBoard.percentage(this.indexFromMousePos(ChessBoard.mouseY(event))),
            left: ChessBoard.percentage(this.indexFromMousePos(ChessBoard.mouseX(event)))
        });
    }
    //[cf]
    //[of]:private place()
    place(piece, x, y) {
        piece.css({
            top: ChessBoard.percentage(y),
            left: ChessBoard.percentage(x)
        });
    }
    //[cf]
    //[of]:private createPiece()
    createPiece(pieceType, uid) {
        let pieceDomElement = $(`<chess-piece class="${pieceType}" />`);
        pieceDomElement.data({ uid: uid });
        this.pieces[uid] = pieceDomElement;
        return pieceDomElement;
    }
    //[cf]
    //[of]:public update()
    update() {
        let position = this.state.position;
        //[of]:squares
        let squares = null;
        if (position === null) {
            throw new Error("The application state has no defined a chess position. Do this by e.g. running ApplicationState.reset()");
        }
        else {
            squares = position.squares;
        }
        //[cf]
        let pieces = this.pieces;
        for (let [y, row] of items(squares)) {
            for (let [x, uid] of items(row)) {
                if (!uid) {
                    continue;
                }
                else {
                    if (uid in pieces) {
                    }
                    else {
                        let piece = HASH.get(uid);
                        let pieceDomElement = this.createPiece(piece.pieceType, uid);
                        this.domElement.append(pieceDomElement);
                        this.place(pieceDomElement, x, y);
                    }
                }
            }
        }
    }
}
//[cf]
//[of]:ChessPosition
class ChessPosition {
    //[of]:constructor()
    constructor(fen) {
        let [piecePositions, toMove, castling, enPassant] = fen.trim().split(/\s+/);
        this.squares = [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
        ];
        let x = 0;
        let y = 0;
        for (const char of piecePositions) {
            let emptySquares = parseInt(char);
            if (emptySquares) {
                x += emptySquares;
            }
            else if (char === '/') {
                x = 0;
                y += 1;
            }
            else {
                this.squares[y][x] = new Piece(char, x, y).uid;
                x++;
            }
        }
        this.whiteToMove = toMove.toLowerCase() === 'w';
        this.castling = {
            whiteShort: castling.includes('K'),
            whiteLong: castling.includes('Q'),
            blackShort: castling.includes('k'),
            blackLong: castling.includes('q')
        };
        if (enPassant = '-') {
            this.enPassant = null;
        }
        else {
            this.enPassant = [
                ChessPosition.
                    COLUMN_TRANSPOSITION_TABLE[enPassant[0]],
                ChessPosition.
                    ROW_TRANSPOSITION_TABLE[enPassant[1]]
            ];
        }
    }
}
//[of]:STARTFEN
ChessPosition.STARTFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
//[cf]
//[of]:COLUMN_TRANSPOSITION_TABLE
ChessPosition.COLUMN_TRANSPOSITION_TABLE = {
    'a': 0, 'b': 1, 'c': 2, 'd': 3,
    'e': 4, 'f': 5, 'g': 6, 'h': 7,
};
//[cf]
//[of]:ROW_TRANSPOSITION_TABLE
ChessPosition.ROW_TRANSPOSITION_TABLE = {
    '8': 0, '7': 1, '6': 2, '5': 3,
    '4': 4, '3': 5, '2': 6, '1': 7,
};
//[cf]
//[of]:PIECE_TRANSPOSITION_TABLE
ChessPosition.PIECE_TRANSPOSITION_TABLE = {
    'k': ['b', 'k'], 'q': ['b', 'q'],
    'r': ['b', 'r'], 'b': ['b', 'b'],
    'n': ['b', 'n'], 'p': ['b', 'p'],
    'K': ['w', 'k'], 'Q': ['w', 'q'],
    'R': ['w', 'r'], 'B': ['w', 'b'],
    'N': ['w', 'n'], 'P': ['w', 'p'],
};
//[cf]
//[of]:Piece
class Piece {
    //[of]:constructor()
    constructor(type, x, y) {
        this.pieceType = type;
        this.x = x;
        this.y = y;
        this.uid = HASH.add(this);
    }
}
//[cf]
//[of]:Tools
//[of]:items()
/**
 * Iterate over the keys and values of an iterable ('iterable' in the Python sense).
 * */
function* items(iterable) {
    if (iterable instanceof Map) {
        for (const entry of iterable.entries()) {
            yield entry;
        }
    }
    else if (
    // sorted by usage frequency
    iterable instanceof Array
        || typeof iterable === 'string'
        || iterable instanceof Set
        || iterable instanceof String) {
        let index = -1;
        for (const value of iterable) {
            yield [++index, value];
        }
    }
    else if (iterable instanceof Object) {
        for (const entry of Object.entries(iterable)) {
            yield entry;
        }
    }
    else {
        throw new Error(`Can not be used with '${typeof iterable}' type`);
    }
}
//[cf]
//[cf]
window.onload = function () {
    $('#please-enable-js-message').remove();
    let state = new State();
    new ChessBoard('#chessboard', state);
    //[c]    ~ new ChessNotation('#notation', state);
    //[c]    ~ new ChessToolbar('#toolbar', state);
    state.reset();
};
//[cf]
//[of]:~ ChessNotation
//[c]~ class ChessNotation extends Observer {
//[c]    ~ private domElement: JQuery<HTMLElement>;
//[c]    ~ constructor(domElementId: string, state: State) {
//[c]        ~ super(state);
//[c]        ~ this.domElement = $(domElementId);
//[c]    ~ }
//[c]~ }
//[cf]
//[of]:~ ChessToolbar
//[c]~ class ChessToolbar extends Observer {
//[c]    ~ private domElement: JQuery<HTMLElement>;
//[of]:~ constructor()
//[c]~ constructor(domElementId: string, state: State) {
//[c]    ~ super(state);
//[c]    ~ this.domElement = $(domElementId);
//[c]~ }
//[cf]
//[c]~ }
//[cf]
//[of]:~ ChessMove
//[c]~ class ChessMove {
//[c]    ~ position: ChessPosition;
//[of]:~ constructor()
//[c]~ constructor(position: ChessPosition) {
//[c]    ~ this.position = position;
//[c]~ }
//[cf]
//[c]~ }
//[cf]
//[of]:~ ChessVariation
//[c]~ class ChessVariation {
//[of]:~ constructor()
//[c]~ constructor() {
//[c]~ }
//[cf]
//[of]appendMove(move\: ChessMove):~ appendMove()
//[c]~ appendMove(move: ChessMove) {
//[c]    ~ console.log(move);
//[c]~ }
//[cf]
//[c]~ }
//[cf]
