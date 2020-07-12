/* Tool to analyse chess positions */

//[of]:HASH
let HASH = new class {

    private entries: { [key: number]: Piece } = {};
    private uid: uid = 0;

    //[of]:public add()
    public add(thing: Piece): uid {
        this.entries[++this.uid] = thing;
        return this.uid;
    }
    //[cf]
    //[of]:public get()
    public get(uid: uid): Piece {
        return this.entries[uid];
    }
    //[cf]

};
//[cf]

//[of]:State
/** The Application state. */
class State {

    //[of]:constructor()
    constructor() {
        this.position = null;
    }
    //[cf]

    public observers: Set<Observer> = new Set();
    public position: ChessPosition | null;

    //[of]:reset()
    /**
     * Call this after all observers have been registered
     * (ApplicationState.obserers.add(Observer)). This is also executed when
     * clicking the 'reset' button, therefore the name.
     * */
    public reset() {
        this.position = new ChessPosition(ChessPosition.STARTFEN);
        this.notifyObservers();
    }
    //[cf]
    //[of]:makeMove()
    public makeMove(from: pos, to: pos) {
        let position = this.position;
        if (!position) {
            throw new Error("State has not been initialized");
        } else {
            let ps = position.piecePositions;
    
            let c = position.castling;
            //[of]:white castle short
            if (
                c.whiteShort
                &&
                (
                    (
                        from == 60 && (to == 62 || to == 63)
                    )
                    ||
                    (from == 63 && to == 60) 
                )
                &&
                !ps[61] && !ps[62]
            ) {
                ps[62] = ps[60];
                ps[61] = ps[63];
                delete ps[60];
                delete ps[63];
                position.castling.whiteShort = false;
                position.castling.whiteLong = false;
            }
            //[cf]
            //[of]:white castle long
            else if (
                c.whiteLong
                &&
                (
                    (
                        from == 60 && (to > 55 && to < 59)
                    )
                    ||
                    (from == 56 && to == 60) 
                )
                &&
                !ps[57] && !ps[58] && !ps[59]
            ) {
                ps[58] = ps[60];
                ps[59] = ps[56];
                delete ps[60];
                delete ps[56];
                position.castling.whiteShort = false;
                position.castling.whiteLong = false;
            }
            //[cf]
            //[of]:black castle short
            else if (
                c.blackShort
                &&
                (
                    (
                        from == 4 && (to == 6 || to == 7)
                    )
                    ||
                    (from == 7 && to == 4) 
                )
                &&
                !ps[5] && !ps[6]
            ) {
                ps[6] = ps[4];
                ps[5] = ps[7];
                delete ps[4];
                delete ps[7];
                position.castling.blackShort = false;
                position.castling.blackLong = false;
            }
            //[cf]
            //[of]:black castle long
            else if (
                c.blackLong
                &&
                (
                    (
                        from == 4 && (to > -1 && to < 3)
                    )
                    ||
                    (from == 0 && to == 4) 
                )
                &&
                !ps[1] && !ps[2] && !ps[3]
            ) {
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
                if (toUid ) {
                    let fromPiece = HASH.get(fromUid);
                    let toPiece = HASH.get(toUid);
                    if (
                        (fromPiece.isWhitePiece === toPiece.isWhitePiece)
                    ) {
                        isLegal = false
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
    private notifyObservers() {
        for (let observer of this.observers) {
            observer.update();
        }
    }
    //[cf]
    //[cf]

}
//[cf]
//[of]:Observer
/**
 * An element on the page, listening to changes in the State
 * */
class Observer {

    //[of]:constructor()
    constructor(state: State) {
        this.state = state;
        state.observers.add(this);
    }
    //[cf]
    //[of]:protected
    protected readonly state: State;
    //[cf]
    //[of]:public
    //[of]:update()
    /**
     * {@link State} calls this on every {@link Observer}, when it has
     * made changes to its state. Dont call it manually, as it assumes
     * that some things are set in the State.
     * */
    public update() {
        console.log('Observer.update() - to be implemented in subclasses');
    }
    //[cf]
    //[cf]

}
//[cf]
//[of]:Chess board
class Board extends Observer {

    //[of]:constructor()
    constructor(id: domElementId, state: State) {
        super(state);
    
        let boardElem = this.boardElem = $(id);
        this.dimensions = Board.calculateDimensions(boardElem);
        let self = this;
    
        //[of]:define mousedown handler
        boardElem.on('mousedown', 'chess-piece', function (
            event: JQuery.MouseDownEvent
        ) {
            event.stopPropagation();
            event.preventDefault();
            let piece = $(this);
            self.grab(piece, event);
        });
        //[cf]
        //[of]:define mousemovehandler
        boardElem.on('mousemove', function (event: JQuery.MouseMoveEvent) {
            event.stopPropagation();
            event.preventDefault();
            let piece = self.grabbedPiece;
            if (piece) {
                self.grab(piece, event);
            }
        });
        //[cf]
        //[of]:define mouseup handler
        boardElem.on('mouseup', function (event: JQuery.MouseUpEvent) {
            event.stopPropagation();
            event.preventDefault();
            let piece = self.grabbedPiece;
            if (piece) {
                self.release(piece, event);
            }
        });
        //[cf]
        //[of]:define resize handler
        $(window).on('resize', function() {
            self.dimensions = Board.calculateDimensions(self.boardElem);
        });
        //[cf]
    
    }
    //[cf]

    //[of]:update()
    public update() {
    
        let statePieceUidsByPos = null;
        {
            let position = this.state.position;
            if (position === null) {
                throw new Error(
                    'The application state has no defined a chess position. '
                    + 'Do this by e.g. running ApplicationState.reset()'
                );
            } else {
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
            } else {
                pieceElem = selfPieceElemsByUid[uid];
                this.place(pieceElem, pos, {'smooth':true});
            }
        }
    
        for (const [uid, pieceElem] of items(selfPieceElemsByUid)) {
            // if (!(uid in statePieceUidsByPos)) {
            let pos = pieceElem.data('pos');
            if (
                !(pos in statePieceUidsByPos)
                || (pieceElem.data('uid') !== statePieceUidsByPos[pos])
            ) {
                this.takeFromBoard(pieceElem);
            }
        }
    }
    //[cf]

    //[of]:private
    private pieceElemsByUid: { [uid: number]: JQuery<HTMLElement> } = {};
    private grabbedPiece: JQuery<HTMLElement> | null = null;
    private boardElem: JQuery<HTMLElement>;
    private dimensions: Dimensions;
    
    //[of]:dragX()
    private dragX(event: JQueryMouseEvent) {
        return Board.mouseX(event) - this.dimensions.halfPieceSize;
    }
    //[cf]
    //[of]:dragY()
    private dragY(event: JQueryMouseEvent) {
        return Board.mouseY(event) - this.dimensions.halfPieceSize;
    }
    //[cf]
    //[of]:grab()
    private grab(piece: JQuery<HTMLElement>, event: JQueryMouseEvent) {
        this.grabbedPiece = piece;
        piece.css({
            zIndex: 1000,
            top: this.dragY(event),
            left: this.dragX(event)
        });
    }
    //[cf]
    //[of]:indexFromMousePos()
    private indexFromMousePos(mousePos: pixels) {
        return Math.floor(mousePos / this.dimensions.pieceSize);
    }
    //[cf]
    //[of]:eventGetPos()
    private eventGetPos(event: JQueryMouseEvent): pos | null {
        let x = Board.mouseX(event);
        let y = Board.mouseY(event);
        let boardSize = this.dimensions.boardSize;
        if (x < 0 || y < 0 || x > boardSize || y > boardSize) {
            return null;
        } else {
            return Board.coordsToPos(
                this.indexFromMousePos(x),
                this.indexFromMousePos(y)
            );
        }
    }
    //[cf]
    //[of]:release()
    private release(piece: JQuery<HTMLElement>, event: JQueryMouseEvent) {
        this.grabbedPiece = null;
        piece.css({
            zIndex: 1
        });
        let to = this.eventGetPos(event);
        if (to !== null) {
            let from = piece.data('pos');
            this.state.makeMove(from, to);
        } else {
            this.update();
        }
    }
    //[cf]
    //[of]:takeFromBoard()
    private takeFromBoard(piece: JQuery<HTMLElement>) {
        piece.addClass('hidden');
    }
    //[cf]
    //[of]:place()
    private place(
        pieceElem: JQuery<HTMLElement>,
        pos: pos,
        options: {smooth: boolean} = {smooth:false}
    ) {
        let [x,y] = Board.posToCoords(pos);
        if (options.smooth) {
            pieceElem.animate({
                top: Board.coordToPercent(y),
                left: Board.coordToPercent(x)
            }, 100);
        } else {
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
    static mouseX(event: JQueryMouseEvent) {
        return event.pageX - event.delegateTarget.offsetLeft;
    }
    //[cf]
    //[of]:mouseY()
    static mouseY(event: JQueryMouseEvent) {
        return event.pageY - event.delegateTarget.offsetTop;
    }
    //[cf]
    //[of]:coordToPercent()
    static coordToPercent(coord: index) {
        return coord * 12.5 + '%';
    }
    //[cf]
    //[of]:posToCoords()
    static posToCoords(pos: pos) {
        let x = pos % 8;
        return [x, (pos-x)/8];
    }
    //[cf]
    //[of]:coordsToPos()
    static coordsToPos(x: columnIndex, y: rowIndex) {
        return y * 8 + x;
    }
    //[cf]
    //[of]:calculateDimensions()
    static calculateDimensions(
        boardElem: JQuery<HTMLElement>
    ): Dimensions {
        let dimensions = {boardSize: 0, pieceSize: 0, halfPieceSize: 0};
        let boardSize = Math.round(boardElem.width() || 300);
        dimensions.boardSize = boardSize;
        let pieceSize = Math.round(boardSize / 8);
        dimensions.pieceSize = pieceSize;
        dimensions.halfPieceSize = Math.round(pieceSize / 2);
        return dimensions;
    }
    //[cf]
    //[cf]
}
//[cf]
//[of]:ChessPosition
class ChessPosition {

    //[of]:constructor()
    constructor(fen: fen) {
    
        let [
            piecePositions,
            toMove,
            castling,
            enPassant
        ] = fen.trim().split(/\s+/);
    
        this.piecePositions = {};
        {
            let pos: pos = 0;
            for (const char of piecePositions) {
                let emptySquares = parseInt(char);
                if (emptySquares) {
                    pos += emptySquares
                } else if (char === '/') {
                    continue;
                } else {
                    this.piecePositions[pos] = new Piece(char as pieceType, pos).uid;
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
        } else {
            this.enPassant = [
                ChessPosition.
                    COLUMN_TRANSPOSITION_TABLE[enPassant[0]],
                ChessPosition.
                    ROW_TRANSPOSITION_TABLE[enPassant[1]]
            ];
        }
    }
    //[cf]

    public piecePositions: {[pos: number]: uid};
    public whiteToMove: boolean;
    public castling: {
        whiteShort: boolean, whiteLong: boolean,
        blackShort: boolean, blackLong: boolean,
    };
    public enPassant: [columnIndex, rowIndex] | null;

    public clone() {
    }

    //[of]:static
    static readonly STARTFEN: fen =
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    
    static readonly COLUMN_TRANSPOSITION_TABLE: { [key: string]: int } = {
        'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7,
    };
    
    static readonly ROW_TRANSPOSITION_TABLE: { [key: string]: int } = {
        '8': 0, '7': 1, '6': 2, '5': 3, '4': 4, '3': 5, '2': 6, '1': 7,
    };
    
    static readonly PIECE_TRANSPOSITION_TABLE: {
        [key: string]: [string, string]
    } = {
        'k': ['b', 'k'], 'q': ['b', 'q'], 'r': ['b', 'r'], 'b': ['b', 'b'],
        'n': ['b', 'n'], 'p': ['b', 'p'], 'K': ['w', 'k'], 'Q': ['w', 'q'],
        'R': ['w', 'r'], 'B': ['w', 'b'], 'N': ['w', 'n'], 'P': ['w', 'p'],
    };
    //[cf]

}
//[cf]
//[of]:Piece
class Piece {

    //[of]:constructor()
    constructor(pieceType: pieceType, pos: pos) {
        this.pieceType = pieceType;
        this.isWhitePiece = pieceType !== pieceType.toLowerCase();
        this.pos = pos;
        this.uid = HASH.add(this);
    }
    //[cf]

    public pieceType: pieceType;
    public isWhitePiece: boolean;
    public pos: pos;
    public uid: uid;

}
//[cf]

//[of]:Tools
//[of]:items()
/**
 * Iterate over the keys and values of an iterable
 * ('iterable' in the Python sense).
 * */
function* items(
    iterable: Map<key, value> | Iterable<value> | Object
): IterableIterator<[key, value]> {

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
        || iterable instanceof String
    ) {
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
}

//[of]:Type defs
/**
 * Document that it shall be an integer, not a float.
 * E.g. 1 but not 1.5
 * */
type int = number;

/** A rowIndex or a columnIndex. */
type index = columnIndex | rowIndex;

/**
 * Horizontal index on a chessboard. 0 to 7
 * ('a' to 'h' in algebraic chess notation).
 * */
type columnIndex = int;

/**
 * Vertical index on a chessboard. 0 to 7
 * ('8' to '1' in algebraic chess notation).
 * */
type rowIndex = int;

/**
 * flattened index on a chessboard. 0 to 63.
 * Equivalent to `rowIndex * 8 + columnIndex`
 * */
type pos = int

/** An autogenerated uid pointing to the actual chess piece. */
type uid = int;

/** Used to document that the unit is pixels */
type pixels = int;

/**
 * A chess position encoded in Forsyth-Edwards notation. E.g.
 * 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' for the start
 * position of a chess game.
 * */
type fen = string;

/** A dom elements id attribute in CSS notation. E.g. '#chessboard'. */
type domElementId = string;

/** Used in functions operating with events returned by JQuery. */
type JQueryMouseEvent =
    JQuery.MouseDownEvent
    | JQuery.MouseMoveEvent
    | JQuery.MouseUpEvent;

/**
 * Correspondents to the piece identifiers used in FENs.
 * E.g. 'r' for a black rook or 'P' for a white pawn. 
 * */
type pieceType =
    'K' | 'Q' | 'R' | 'B' | 'N' | 'P'
    | 'k' | 'q' | 'r' | 'b' | 'n' | 'p';

/** the key when iterating about the items of an iterable */
type key = any;

/** the value when iterating about the items of an iterable */
type value = any;

/** used in -> Board */
interface Dimensions {
    boardSize: pixels,
    pieceSize: pixels,
    halfPieceSize: pixels
}

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
