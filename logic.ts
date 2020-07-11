/* Tool to analyse chess positions */

//[of]:HASH
let HASH = new class {

    private items: { [key: number]: Piece } = {};
    private uid: uid = 0;

    //[of]:public add()
    public add(thing: Piece): uid {
        this.items[++this.uid] = thing;
        return this.uid;
    }
    //[cf]
    //[of]:public get()
    public get(uid: uid): Piece {
        return this.items[uid];
    }
    //[cf]

};
//[cf]

//[of]:State
/** The Application state. */
class State {

    public observers: Set<Observer> = new Set();
    public position: ChessPosition | null;
//[c]    ~ variation: ChessVariation | undefined;

    //[of]:constructor()
    constructor() {
        this.position = null;
    }
    //[cf]

    //[of]:private notifyObservers()
    /** called internally when changes to the State were made */
    private notifyObservers() {
        for (let observer of this.observers) {
            observer.update();
        }
    }
    //[cf]

    //[of]:public reset()
    /** Call this after all observers have been registered (ApplicationState.obserers.add(Observer)). This is also executed when clicking the 'reset' button, therefore the name. */
    public reset() {
        this.position = new ChessPosition(ChessPosition.STARTFEN);
    //[c]    ~ let move = new ChessMove(position);
    //[c]    ~ let variation = new ChessVariation();
    //[c]    ~ variation.appendMove(move);
    //[c]    ~ this.variation = variation;
        this.notifyObservers();
    }
    //[cf]

}
//[cf]
//[of]:Observer
/** An element on the page, listening to changes in the State */
class Observer {

    protected readonly state: State;

    //[of]:constructor()
    constructor(state: State) {
        this.state = state;
        state.observers.add(this);
    }
    //[cf]

    //[of]:public update()
    /** {@link State} calls this on every {@link Observer}, when it has made changes to its state. Dont call it manually, as it assumes that some things are set in the State. */
    public update() {
        console.log('Observer.update() - to be implemented in subclasses');
    }
    //[cf]

}
//[cf]
//[of]:Chess board
class ChessBoard extends Observer {

    private pieces: { [uid: number]: JQuery<HTMLElement> } = {};
    private grabbedPiece: JQuery<HTMLElement> | null = null;
    private domElement: JQuery<HTMLElement>;

    private dimensions: {
        boardSize: pixels,
        pieceSize: pixels,
        halfPieceSize: pixels,
    };

    //[of]:static mouseX()
    static mouseX(event: JQueryMouseEvent) {
        return (event.pageX) - event.delegateTarget.offsetLeft;
    }
    //[cf]
    //[of]:static mouseY()
    static mouseY(event: JQueryMouseEvent) {
        return event.pageY - event.delegateTarget.offsetTop;
    }
    //[cf]
    //[of]:static percentage()
    static percentage(coordinate: index) {
        return coordinate * 12.5 + '%';
    }
    //[cf]
    //[of]:static coordsFromPos()
    static coordsFromPos(pos: int) {
        let x = pos % 8;
        return [x, (pos-x)/8];
    }
    //[cf]

    //[of]:private dragX()
    private dragX(event: JQueryMouseEvent) {
        return ChessBoard.mouseX(event) - this.dimensions.halfPieceSize;
    }
    //[cf]
    //[of]:private dragY()
    private dragY(event: JQueryMouseEvent) {
        return ChessBoard.mouseY(event) - this.dimensions.halfPieceSize;
    }
    //[cf]
    //[of]:private grab()
    private grab(piece: JQuery<HTMLElement>, event: JQueryMouseEvent) {
        this.grabbedPiece = piece;
        piece.css({
            top: this.dragY(event),
            left: this.dragX(event)
        });
    }
    //[cf]
    //[of]:private indexFromMousePos()
    private indexFromMousePos(mousePos: pixels) {
        return Math.floor(mousePos / this.dimensions.pieceSize);
    }
    //[cf]
    //[of]:private release()
    private release(piece: JQuery<HTMLElement>, event: JQueryMouseEvent) {
        this.grabbedPiece = null;
        piece.css({
            top: ChessBoard.percentage(this.indexFromMousePos(ChessBoard.mouseY(event))),
            left: ChessBoard.percentage(this.indexFromMousePos(ChessBoard.mouseX(event)))
        });
    }
    //[cf]
    //[of]:private place()
    private place(piece: JQuery<HTMLElement>, x: columnIndex, y: rowIndex) {
        piece.css({
            top: ChessBoard.percentage(y),
            left: ChessBoard.percentage(x)
        });
    }
    //[cf]
    //[of]:private createPiece()
    private createPiece(pieceType: pieceType, uid: uid): JQuery<HTMLElement> {
        let pieceDomElement = $(`<chess-piece class="${pieceType}" />`);
        pieceDomElement.data({ uid: uid });
        this.pieces[uid] = pieceDomElement;
        return pieceDomElement;
    }
    //[cf]

    //[of]:constructor()
    constructor(id: domElementId, state: State) {
        super(state);
    
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
        domElement.on('mousedown', 'chess-piece', function (event: JQuery.MouseDownEvent) {
            let piece = $(this);
            self.grab(piece, event);
            event.stopPropagation()
        });
        //[cf]
        //[of]:define mousemovehandler
        domElement.on('mousemove', function (event: JQuery.MouseMoveEvent) {
            let piece = self.grabbedPiece;
            if (piece) {
                self.grab(piece, event);
                event.stopPropagation()
            }
        });
        //[cf]
        //[of]:define mouseup handler
        domElement.on('mouseup', function (event: JQuery.MouseUpEvent) {
            let piece = self.grabbedPiece;
            if (piece) {
                self.release(piece, event);
                event.stopPropagation()
            }
        });
        //[cf]
    
    }
    //[cf]

    //[of]:public update()
    public update() {
        let position = this.state.position;
    
        //[of]:squares
        let squares = null;
        
        if (position === null) {
            throw new Error("The application state has no defined a chess position. Do this by e.g. running ApplicationState.reset()");
        } else {
            squares = position.squares;
        }
        //[cf]
    
        let pieces = this.pieces;
    
        for (let [y, row] of items(squares)) {
            for (let [x, uid] of items(row)) {
                if (!uid) {
                    continue;
                } else {
                    if (uid in pieces) {
                    } else {
                        let piece = HASH.get(uid);
                        let pieceDomElement = this.createPiece(piece.pieceType, uid);
                        this.domElement.append(pieceDomElement);
                        this.place(pieceDomElement, x, y);
                    }
                }
            }
        }
    }
    //[cf]

}
//[cf]
//[of]:ChessPosition
class ChessPosition {

    //[of]:STARTFEN
    static readonly STARTFEN: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    //[cf]
    //[of]:COLUMN_TRANSPOSITION_TABLE
    static readonly COLUMN_TRANSPOSITION_TABLE: { [key: string]: int } = {
        'a': 0, 'b': 1, 'c': 2, 'd': 3,
        'e': 4, 'f': 5, 'g': 6, 'h': 7,
    };
    //[cf]
    //[of]:ROW_TRANSPOSITION_TABLE
    static readonly ROW_TRANSPOSITION_TABLE: { [key: string]: int } = {
        '8': 0, '7': 1, '6': 2, '5': 3,
        '4': 4, '3': 5, '2': 6, '1': 7,
    };
    //[cf]
    //[of]:PIECE_TRANSPOSITION_TABLE
    static readonly PIECE_TRANSPOSITION_TABLE: { [key: string]: [string, string] } = {
        'k': ['b', 'k'], 'q': ['b', 'q'],
        'r': ['b', 'r'], 'b': ['b', 'b'],
        'n': ['b', 'n'], 'p': ['b', 'p'],
        'K': ['w', 'k'], 'Q': ['w', 'q'],
        'R': ['w', 'r'], 'B': ['w', 'b'],
        'N': ['w', 'n'], 'P': ['w', 'p'],
    };
    //[cf]

    public squares: chessboard;
    public whiteToMove: boolean;
    public castling: {
        whiteShort: boolean, whiteLong: boolean,
        blackShort: boolean, blackLong: boolean,
    };
    public enPassant: [columnIndex, rowIndex] | null;

    //[of]:constructor()
    constructor(fen: fen) {
    
        let [
            piecePositions,
            toMove,
            castling,
            enPassant
        ] = fen.trim().split(/\s+/);
    
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
    
        let x: columnIndex = 0;
        let y: rowIndex = 0;
    
        for (const char of piecePositions) {
    
            let emptySquares = parseInt(char);
    
            if (emptySquares) {
                x += emptySquares
            } else if (char === '/') {
                x = 0;
                y += 1;
            } else {
                this.squares[y][x] = new Piece(<pieceType>char , x, y).uid;
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
}
//[cf]
//[of]:Piece
class Piece {

    public pieceType: pieceType;
    public x: columnIndex;
    public y: rowIndex;
    public uid: uid;

    //[of]:constructor()
    constructor(type: pieceType, x: columnIndex, y: rowIndex) {
        this.pieceType = type;
        this.x = x;
        this.y = y;
        this.uid = HASH.add(this);
    }
    //[cf]

}
//[cf]

//[of]:Tools
//[of]:items()
/**
 * Iterate over the keys and values of an iterable ('iterable' in the Python sense).
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
    new ChessBoard('#chessboard', state);
//[c]    ~ new ChessNotation('#notation', state);
//[c]    ~ new ChessToolbar('#toolbar', state);

    state.reset();
}

//[of]:Type defs
/** Used to document that it shall be an integer, not a float. E.g. 1 but not 1.5 */
type int = number;

/** Horizontal index on a chessboard. 0 to 7. 'a' to 'h' in algebraic chess notation. */
type columnIndex = int;

/** Vertical index on a chessboard. 0 to 7. '8' to '1' in algebraic chess notation. */
type rowIndex = int;

/** flattened index on a chessboard. 0 to 63. Equivalent to `rowIndex * 8 + columnIndex` */
type flatIndex = int

/** A rowIndex or a columnIndex. */
type index = columnIndex | rowIndex;

/** Used to document that the unit is pixels */
type pixels = int;

/** A chess position encoded in Forsyth-Edwards notation. E.g. 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' for the start position of a chess game. */
type fen = string;

/** A dom elements id attribute in CSS notation. E.g. '#chessboard'. */
type domElementId = string;

/** The internal board representation. */
type chessboard = [row, row, row, row, row, row, row, row];

/** A vertical row of the chessboard. */
type row = [uid, uid, uid, uid, uid, uid, uid, uid];

/** An autogenerated uid pointing to the actual chess piece. */
type uid = int;

/** Used in functions operating with events returned by JQuery. */
type JQueryMouseEvent = JQuery.MouseDownEvent | JQuery.MouseMoveEvent | JQuery.MouseUpEvent;

/** Correspondents to the piece identifiers used in FENs. E.g. 'r' for a black rook or 'P' for a white pawn. */
type pieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p';

/** the key when iterating about the items of an iterable */
type key = any;

/** the value when iterating about the items of an iterable */
type value = any;
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
