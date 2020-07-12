"use strict";
/* Tool to analyse chess positions */
//[of]:HASH
let HASH = new class {
    constructor() {
        this.entries = {};
        this.uid = 0;
        //[cf]
    }
    //[of]:public add()
    add(thing) {
        this.entries[++this.uid] = thing;
        return this.uid;
    }
    //[cf]
    //[of]:public get()
    get(uid) {
        return this.entries[uid];
    }
};
//[cf]
//[of]:State
/** The Application state. */
class State {
    //[of]:constructor()
    constructor() {
        //[cf]
        this.observers = new Set();
        this.position = null;
    }
    //[of]:reset()
    /**
     * Call this after all observers have been registered
     * (ApplicationState.obserers.add(Observer)). This is also executed when
     * clicking the 'reset' button, therefore the name.
     * */
    reset() {
        this.position = new ChessPosition(ChessPosition.STARTFEN);
        this.notifyObservers();
    }
    //[cf]
    //[of]:makeMove()
    makeMove(from, to) {
        let position = this.position;
        if (!position) {
            throw new Error("State has not been initialized");
        }
        else {
            let ps = position.piecePositions;
            let c = position.castling;
            //[of]:white castle short
            if (c.whiteShort
                &&
                    ((from == 60 && (to == 62 || to == 63))
                        ||
                            (from == 63 && to == 60))
                &&
                    !ps[61] && !ps[62]) {
                ps[62] = ps[60];
                ps[61] = ps[63];
                delete ps[60];
                delete ps[63];
                position.castling.whiteShort = false;
                position.castling.whiteLong = false;
            }
            //[cf]
            //[of]:white castle long
            else if (c.whiteLong
                &&
                    ((from == 60 && (to > 55 && to < 59))
                        ||
                            (from == 56 && to == 60))
                &&
                    !ps[57] && !ps[58] && !ps[59]) {
                ps[58] = ps[60];
                ps[59] = ps[56];
                delete ps[60];
                delete ps[56];
                position.castling.whiteShort = false;
                position.castling.whiteLong = false;
            }
            //[cf]
            //[of]:black castle short
            else if (c.blackShort
                &&
                    ((from == 4 && (to == 6 || to == 7))
                        ||
                            (from == 7 && to == 4))
                &&
                    !ps[5] && !ps[6]) {
                ps[6] = ps[4];
                ps[5] = ps[7];
                delete ps[4];
                delete ps[7];
                position.castling.blackShort = false;
                position.castling.blackLong = false;
            }
            //[cf]
            //[of]:black castle long
            else if (c.blackLong
                &&
                    ((from == 4 && (to > -1 && to < 3))
                        ||
                            (from == 0 && to == 4))
                &&
                    !ps[1] && !ps[2] && !ps[3]) {
                ps[2] = ps[4];
                ps[3] = ps[0];
                delete ps[4];
                delete ps[0];
                position.castling.blackShort = false;
                position.castling.blackLong = false;
            }
            //[cf]
            //[of]:normal move
            else {
                let fromUid = ps[from];
                let toUid = ps[to];
                let isLegal = true;
                if (toUid) {
                    let fromPiece = HASH.get(fromUid);
                    let toPiece = HASH.get(toUid);
                    if ((fromPiece.isWhitePiece === toPiece.isWhitePiece)) {
                        isLegal = false;
                    }
                }
                if (isLegal) {
                    delete ps[from];
                    ps[to] = fromUid;
                }
            }
            //[cf]
            this.notifyObservers();
        }
    }
    //[cf]
    //[of]:private
    //[of]:notifyObservers()
    /** called internally when changes to the State were made */
    notifyObservers() {
        for (let observer of this.observers) {
            observer.update();
        }
    }
}
//[cf]
//[of]:Observer
/**
 * An element on the page, listening to changes in the State
 * */
class Observer {
    //[of]:constructor()
    constructor(state) {
        this.state = state;
        state.observers.add(this);
    }
    //[cf]
    //[of]:public
    //[of]:update()
    /**
     * {@link State} calls this on every {@link Observer}, when it has
     * made changes to its state. Dont call it manually, as it assumes
     * that some things are set in the State.
     * */
    update() {
        console.log('Observer.update() - to be implemented in subclasses');
    }
}
//[cf]
//[of]:Chess board
class Board extends Observer {
    //[of]:constructor()
    constructor(id, state) {
        super(state);
        //[cf]
        //[of]:private
        this.pieceElemsByUid = {};
        this.grabbedPiece = null;
        let boardElem = this.boardElem = $(id);
        this.dimensions = Board.calculateDimensions(boardElem);
        let self = this;
        //[of]:define mousedown handler
        boardElem.on('mousedown', 'chess-piece', function (event) {
            event.stopPropagation();
            event.preventDefault();
            let piece = $(this);
            self.grab(piece, event);
        });
        //[cf]
        //[of]:define mousemovehandler
        boardElem.on('mousemove', function (event) {
            event.stopPropagation();
            event.preventDefault();
            let piece = self.grabbedPiece;
            if (piece) {
                self.grab(piece, event);
            }
        });
        //[cf]
        //[of]:define mouseup handler
        boardElem.on('mouseup', function (event) {
            event.stopPropagation();
            event.preventDefault();
            let piece = self.grabbedPiece;
            if (piece) {
                self.release(piece, event);
            }
        });
        //[cf]
        //[of]:define resize handler
        $(window).on('resize', function () {
            self.dimensions = Board.calculateDimensions(self.boardElem);
        });
        //[cf]
    }
    //[cf]
    //[of]:update()
    update() {
        let statePieceUidsByPos = null;
        {
            let position = this.state.position;
            if (position === null) {
                throw new Error('The application state has no defined a chess position. '
                    + 'Do this by e.g. running ApplicationState.reset()');
            }
            else {
                statePieceUidsByPos = position.piecePositions;
            }
        }
        let selfPieceElemsByUid = this.pieceElemsByUid;
        for (const [pos, uid] of items(statePieceUidsByPos)) {
            let pieceElem;
            let piece = HASH.get(uid);
            if (!(uid in selfPieceElemsByUid)) {
                pieceElem = $(`<chess-piece class="${piece.pieceType}" />`);
                pieceElem.data({ uid: uid, pos: 0 });
                this.pieceElemsByUid[uid] = pieceElem;
                this.boardElem.append(pieceElem);
                this.place(pieceElem, pos);
            }
            else {
                pieceElem = selfPieceElemsByUid[uid];
                this.place(pieceElem, pos, { 'smooth': true });
            }
        }
        for (const [uid, pieceElem] of items(selfPieceElemsByUid)) {
            // if (!(uid in statePieceUidsByPos)) {
            let pos = pieceElem.data('pos');
            if (!(pos in statePieceUidsByPos)
                || (pieceElem.data('uid') !== statePieceUidsByPos[pos])) {
                this.takeFromBoard(pieceElem);
            }
        }
    }
    //[of]:dragX()
    dragX(event) {
        return Board.mouseX(event) - this.dimensions.halfPieceSize;
    }
    //[cf]
    //[of]:dragY()
    dragY(event) {
        return Board.mouseY(event) - this.dimensions.halfPieceSize;
    }
    //[cf]
    //[of]:grab()
    grab(piece, event) {
        this.grabbedPiece = piece;
        piece.css({
            zIndex: 1000,
            top: this.dragY(event),
            left: this.dragX(event)
        });
    }
    //[cf]
    //[of]:indexFromMousePos()
    indexFromMousePos(mousePos) {
        return Math.floor(mousePos / this.dimensions.pieceSize);
    }
    //[cf]
    //[of]:eventGetPos()
    eventGetPos(event) {
        let x = Board.mouseX(event);
        let y = Board.mouseY(event);
        let boardSize = this.dimensions.boardSize;
        if (x < 0 || y < 0 || x > boardSize || y > boardSize) {
            return null;
        }
        else {
            return Board.coordsToPos(this.indexFromMousePos(x), this.indexFromMousePos(y));
        }
    }
    //[cf]
    //[of]:release()
    release(piece, event) {
        this.grabbedPiece = null;
        piece.css({
            zIndex: 1
        });
        let to = this.eventGetPos(event);
        if (to !== null) {
            let from = piece.data('pos');
            this.state.makeMove(from, to);
        }
        else {
            this.update();
        }
    }
    //[cf]
    //[of]:takeFromBoard()
    takeFromBoard(piece) {
        piece.addClass('hidden');
    }
    //[cf]
    //[of]:place()
    place(pieceElem, pos, options = { smooth: false }) {
        let [x, y] = Board.posToCoords(pos);
        if (options.smooth) {
            pieceElem.animate({
                top: Board.coordToPercent(y),
                left: Board.coordToPercent(x)
            }, 100);
        }
        else {
            pieceElem.css({
                top: Board.coordToPercent(y),
                left: Board.coordToPercent(x)
            });
        }
        pieceElem.data('pos', pos);
    }
    //[cf]
    //[of]:~ createPiece()
    //[c]~ private createPiece(pieceType: pieceType, uid: uid): JQuery<HTMLElement> {
    //[c]    ~ let pieceDomElement = $(`<chess-piece class="${pieceType}" />`);
    //[c]    ~ pieceDomElement.data({ uid: uid });
    //[c]    ~ this.pieces[uid] = pieceDomElement;
    //[c]    ~ return pieceDomElement;
    //[c]~ }
    //[cf]
    //[cf]
    //[of]:static
    //[of]:mouseX()
    static mouseX(event) {
        return event.pageX - event.delegateTarget.offsetLeft;
    }
    //[cf]
    //[of]:mouseY()
    static mouseY(event) {
        return event.pageY - event.delegateTarget.offsetTop;
    }
    //[cf]
    //[of]:coordToPercent()
    static coordToPercent(coord) {
        return coord * 12.5 + '%';
    }
    //[cf]
    //[of]:posToCoords()
    static posToCoords(pos) {
        let x = pos % 8;
        return [x, (pos - x) / 8];
    }
    //[cf]
    //[of]:coordsToPos()
    static coordsToPos(x, y) {
        return y * 8 + x;
    }
    //[cf]
    //[of]:calculateDimensions()
    static calculateDimensions(boardElem) {
        let dimensions = { boardSize: 0, pieceSize: 0, halfPieceSize: 0 };
        let boardSize = Math.round(boardElem.width() || 300);
        dimensions.boardSize = boardSize;
        let pieceSize = Math.round(boardSize / 8);
        dimensions.pieceSize = pieceSize;
        dimensions.halfPieceSize = Math.round(pieceSize / 2);
        return dimensions;
    }
}
//[cf]
//[of]:ChessPosition
class ChessPosition {
    //[of]:constructor()
    constructor(fen) {
        let [piecePositions, toMove, castling, enPassant] = fen.trim().split(/\s+/);
        this.piecePositions = {};
        {
            let pos = 0;
            for (const char of piecePositions) {
                let emptySquares = parseInt(char);
                if (emptySquares) {
                    pos += emptySquares;
                }
                else if (char === '/') {
                    continue;
                }
                else {
                    this.piecePositions[pos] = new Piece(char, pos).uid;
                    pos++;
                }
            }
        }
        this.whiteToMove = toMove.toLowerCase() === 'w';
        this.castling = {
            whiteShort: castling.includes('K'),
            whiteLong: castling.includes('Q'),
            blackShort: castling.includes('k'),
            blackLong: castling.includes('q')
        };
        if (enPassant === '-') {
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
    clone() {
    }
}
//[of]:static
ChessPosition.STARTFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
ChessPosition.COLUMN_TRANSPOSITION_TABLE = {
    'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7,
};
ChessPosition.ROW_TRANSPOSITION_TABLE = {
    '8': 0, '7': 1, '6': 2, '5': 3, '4': 4, '3': 5, '2': 6, '1': 7,
};
ChessPosition.PIECE_TRANSPOSITION_TABLE = {
    'k': ['b', 'k'], 'q': ['b', 'q'], 'r': ['b', 'r'], 'b': ['b', 'b'],
    'n': ['b', 'n'], 'p': ['b', 'p'], 'K': ['w', 'k'], 'Q': ['w', 'q'],
    'R': ['w', 'r'], 'B': ['w', 'b'], 'N': ['w', 'n'], 'P': ['w', 'p'],
};
//[cf]
//[of]:Piece
class Piece {
    //[of]:constructor()
    constructor(pieceType, pos) {
        this.pieceType = pieceType;
        this.isWhitePiece = pieceType !== pieceType.toLowerCase();
        this.pos = pos;
        this.uid = HASH.add(this);
    }
}
//[cf]
//[of]:Tools
//[of]:items()
/**
 * Iterate over the keys and values of an iterable
 * ('iterable' in the Python sense).
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
    new Board('#board', state);
    //[c]    ~ new ChessNotation('#notation', state);
    //[c]    ~ new ChessToolbar('#toolbar', state);
    state.reset();
};
//[c]~ interface ChessPosition {
//[c]    ~ piecePositions: {[pos: number]: uid},
//[c]    ~ whiteToMove: boolean,
//[c]    ~ castling: {
//[c]        ~ whiteShort: boolean, whiteLong: boolean,
//[c]        ~ blackShort: boolean, blackLong: boolean
//[c]    ~ },
//[c]    ~ enPassant: pos
//[c]~ }
//[cf]
//[of]:~ ChessNotation
//[c]~ class ChessNotation extends Observer {
//[c]    ~ constructor(id: domElementId, state: State) {
//[c]        ~ super(state);
//[c]        ~ this.domElem = $(id);
//[c]        ~ this.variation = null;
//[c]    ~ }
//[c]    ~ private domElem: JQuery<HTMLElement>;
//[c]    ~ private variation: ChessVariation | null;
//[c]    ~ public update() {
//[c]        ~ if (! this.variation) {
//[c]            ~ let move = new ChessMove(position);
//[c]            ~ let variation = new ChessVariation();
//[c]            ~ variation.appendMove(move);
//[c]            ~ this.variation = variation;
//[c]        ~ } else {
//[c]        ~ }
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
