/* Tool to analyze chess positions */



// SECTION Type Definitions

/** Used to document that it shall be an integer, not a float. E.g. 1 but not 1.5 */
type int = number;

/** Horizontal index on a chessboard. 0 to 7. Alias 'a' to 'h' in algebraic chess notation. */
type columnIndex = int;

/** Vertical index on a chessboard. 0 to 7. Alias '8' to '1' in algebraic chess notation. */
type rowIndex = int;

/** A vertical or horizontal index. 0 to 7. */
type index = columnIndex | rowIndex;
type pixels = int;

/** A chess position encoded in Forsyth-Edwards notation. E.g. 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' for the start position of a chess game. */
type fen = string;

/** A dom elements id attribute in css notation. E.g. '#chessboard'. */
type domElementId = string;

/** The internal board representation. */
type chessboard = [row, row, row, row, row, row, row, row];

/** A vertical row. */
type row = [uid, uid, uid, uid, uid, uid, uid, uid];

/** An autogenerated uid pointing to the actual chess piece. */
type uid = int;

/** Used in functions operating with events returned by JQuery. Makes Typescript happy.*/
type JQueryMouseEvent = JQuery.MouseDownEvent | JQuery.MouseMoveEvent | JQuery.MouseUpEvent;

/** Correspondents to the piece identifiers used in FENs. E.g. 'r' for a black rook or 'P' for a white pawn. */
type pieceType = string;

/** the key when iterating about the items of an iterable */
type key = any;

/** the value when iterating about the items of an iterable */
type value = any;



// SECTION Tools

/**
 * Iterate over the keys and values of an iterable ('iterable' in the Python
 * sense). Except on Maps and Objects the key will be an int denoting the
 * index of the value in the iterable.
 * */
function* items(
    iterable: Map<key, value> | Object | Iterable<value>
): IterableIterator<[key, value]> {

    let theType = iterable.constructor;

    if (theType === Map) {
        // @ts-ignore
        for (const entry of iterable.entries()) {
            yield entry;
        }
    }

    else if (theType === Object) {
        for (const entry of Object.entries(iterable)) {
            yield entry;
        }
    }

    else {
        let index = -1;
        // @ts-ignore
        for (const value of iterable) {
            yield [++index, value];
        }
    }
};



// CLASS State

/** The Application state. */
class State {

    public observers: Set<Observer> = new Set();
    public position: ChessPosition | null;
    // variation: ChessVariation | undefined;

    constructor() {
        this.position = null;
    }

    /** Call this after all observers have been registered (ApplicationState.obserers.add(Observer)). This is also executed when clicking the 'reset' button, therefore the name. */
    public reset() {
        this.position = new ChessPosition(ChessPosition.STARTFEN);
        // let move = new ChessMove(position);
        // let variation = new ChessVariation();
        // variation.appendMove(move);
        // this.variation = variation;
        this.notifyObservers();
    }

    /** called internally when Changes to the State have happened */
    private notifyObservers() {
        for (let observer of this.observers) {
            observer.update();
        }
    }

}



/** Element on the page listening to changes in the State. The View in MVC */
class Observer {

    protected state: State;

    constructor(state: State) {
        this.state = state;
        state.observers.add(this);
    }

    public update() {
        console.log('Observer.update() - to be implemented in subclasses');
    }

}



// Section Chess board

class ChessBoard extends Observer {

    private pieces: { [uid: number]: JQuery<HTMLElement> } = {};
    private grabbedPiece: JQuery<HTMLElement> | null = null;
    private domElement: JQuery<HTMLElement>;

    private dimensions: {
        boardSize: pixels,
        pieceSize: pixels,
        halfPieceSize: pixels,
    };

    constructor(id: domElementId, state: State) {
        super(state);

        let domElement = $(id);
        this.domElement = domElement;

        let dimensions = { boardSize: 0, pieceSize: 0, halfPieceSize: 0 };
        let boardSize = Math.round(domElement.width() || 300);
        dimensions.boardSize = boardSize;
        let pieceSize = Math.round(boardSize / 8);
        dimensions.pieceSize = pieceSize;
        dimensions.halfPieceSize = Math.round(pieceSize / 2);
        this.dimensions = dimensions;

        let self = this;

        domElement.on('mousedown', 'chess-piece', function (event: JQuery.MouseDownEvent) {
            let piece = $(this);
            self.grab(piece, event);
            event.stopPropagation()
        });

        domElement.on('mousemove', function (event: JQuery.MouseMoveEvent) {
            let piece = self.grabbedPiece;
            if (piece) {
                self.grab(piece, event);
                event.stopPropagation()
            }
        });

        domElement.on('mouseup', function (event: JQuery.MouseUpEvent) {
            let piece = self.grabbedPiece;
            if (piece) {
                self.release(piece, event);
                event.stopPropagation()
            }
        });

    }

    public update() {
        let position = this.state.position;
        let squares = null;
        if (position === null) {
            throw new Error("The application state has no defined a chess position. Do this by e.g. running ApplicationState.reset()");
        } else {
            squares = position.squares;
        }

        let pieces = this.pieces;

        for (let [y, row] of items(squares)) {
            for (let [x, uid] of items(row)) {
                if (!uid) {
                    continue;
                } else {
                    if (uid in pieces) {
                    } else {
                        let piece = HASH.get(uid);
                        let pieceDomElement = $(`<chess-piece class="${piece.type}" />`);
                        pieceDomElement.data({ uid: uid });
                        this.domElement.append(pieceDomElement);
                        pieces[uid] = pieceDomElement;
                        this.place(pieceDomElement, x, y);
                    }
                }
            }
        }


        // this.elem = elem;
        // board.chessposition[index] = this;

        // // remove unused pieces from self_position and the DOM
        // for (let [pos, piece] of Object.entries(self_position)) {
        //     if (state_position[pos] !== piece.data('name')) {
        //         delete self_position[pos];
        //         piece.remove();
        //     }
        // }

        // // add new pieces to self_position and the DOM
        // for (let [pos, name] of Object.entries(state_position)) {
        //     if (self_position[pos] === undefined) {
        //         this.place(this.createPiece(name, pos))
        //     }
        // }
    }

    static mouseX(event: JQueryMouseEvent) {
        return (event.pageX) - event.delegateTarget.offsetLeft;
    }

    static mouseY(event: JQueryMouseEvent) {
        return event.pageY - event.delegateTarget.offsetTop;
    }

    dragX(event: JQueryMouseEvent) {
        return ChessBoard.mouseX(event) - this.dimensions.halfPieceSize;
    }

    dragY(event: JQueryMouseEvent) {
        return ChessBoard.mouseY(event) - this.dimensions.halfPieceSize;
    }

    grab(piece: JQuery<HTMLElement>, event: JQueryMouseEvent) {
        this.grabbedPiece = piece;
        piece.css({
            top: this.dragY(event),
            left: this.dragX(event)
        });
    }

    static percentage(coordinate: index) {
        return coordinate * 12.5 + '%';
    }

    indexFromMousePos(mousePos: pixels) {
        return Math.floor(mousePos / this.dimensions.pieceSize);
    }

    release(piece: JQuery<HTMLElement>, event: JQueryMouseEvent) {
        this.grabbedPiece = null;
        piece.css({
            top: ChessBoard.percentage(this.indexFromMousePos(ChessBoard.mouseY(event))),
            left: ChessBoard.percentage(this.indexFromMousePos(ChessBoard.mouseX(event)))
        });
    }

    place(piece: JQuery<HTMLElement>, x: columnIndex, y: rowIndex) {
        piece.css({
            top: ChessBoard.percentage(y),
            left: ChessBoard.percentage(x)
        });
    }

    // createPiece(name) {
    //     return $(`<chess-piece class="${name}" />`);
    // }

    // coordsFromPos(pos) {
    // 	let x = pos % 8;
    // 	return [x, (pos-x)/8];
    // }
    //[c]

}


// class ChessNotation extends Observer {

//     private domElement: JQuery<HTMLElement>;


//     constructor(domElementId: string, state: ApplicationState) {
//         super(state);
//         this.domElement = $(domElementId);
//     }

// }



// class ChessToolbar extends Observer {

//     private domElement: JQuery<HTMLElement>;


//     constructor(domElementId: string, state: ApplicationState) {
//         super(state);
//         this.domElement = $(domElementId);
//     }

// }


// SECTION HASH

let HASH = new class {

    private items: { [key: number]: any } = {};
    private uid: uid = 0;

    add(thing: any): uid {
        this.items[++this.uid] = thing;
        return this.uid;
    }

    get(uid: uid): any {
        return this.items[uid];
    }

};


// CLASS ChessPosition

class ChessPosition {


    static STARTFEN: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    static COLUMN_TRANSPOSITION_TABLE: { [key: string]: number } = {
        'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7
    };

    static ROW_TRANSPOSITION_TABLE: { [key: string]: number } = {
        '8': 0, '7': 1, '6': 2, '5': 3, '4': 4, '3': 5, '2': 6, '1': 7
    };

    static PIECE_TRANSPOSITION_TABLE: { [key: string]: [string, string] } = {
        'k': ['b', 'k'], 'q': ['b', 'q'], 'r': ['b', 'r'], 'b': ['b', 'b'], 'n': ['b', 'n'], 'p': ['b', 'p'],
        'K': ['w', 'k'], 'Q': ['w', 'q'], 'R': ['w', 'r'], 'B': ['w', 'b'], 'N': ['w', 'n'], 'P': ['w', 'p']
    };


    public squares: chessboard;
    public whiteToMove: boolean;
    public castling: {
        whiteShort: boolean, whiteLong: boolean,
        blackShort: boolean, blackLong: boolean,
    };
    public enPassant: [columnIndex, rowIndex] | null;


    constructor(fen: fen) {

        let [
            piecePositions, toMove, castling, enPassant
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
        } else {
            this.enPassant = [
                ChessPosition.COLUMN_TRANSPOSITION_TABLE[enPassant[0]],
                ChessPosition.ROW_TRANSPOSITION_TABLE[enPassant[1]]
            ];
        }
    }
}


// CLASS Piece

class Piece {

    public type: pieceType;
    public x: columnIndex;
    public y: rowIndex;
    public uid: uid;

    constructor(type: pieceType, x: columnIndex, y: rowIndex) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.uid = HASH.add(this);
    }
}

// class ChessMove {

//     position: ChessPosition;


//     constructor(position: ChessPosition) {
//         this.position = position;
//     }

// }

// class ChessVariation {

//     constructor() {
//     }


//     appendMove(move: ChessMove) {
//         console.log(move);

//     }

// }

// SECTION init

window.onload = function () {
    $('#please-enable-js-message').remove();

    let state = new State();
    new ChessBoard('#chessboard', state);
    // new ChessNotation('#notation', state);
    // new ChessToolbar('#toolbar', state);

    state.reset();
}

