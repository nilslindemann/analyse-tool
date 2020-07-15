/* Tool to analyse chess positions */

//[of]:HASH
let HASH = new class {

    private entries:{ [ key:number ]:Piece } = { };
    private uid:uid = 0;

    //[of]:add()
    public add( thing:Piece ):uid {
        this.entries[++this.uid] = thing;
        return this.uid;
    }
    //[cf]
    //[of]:get()
    public get( uid:uid ): Piece {
        return this.entries[uid];
    }
    //[cf]

};
//[cf]

//[c]( MVC
//[of]:State
/** The Application state. */
class State {

    public observers:Set<Observer> = new Set();
    public position:Chessposition | null = null;

    //[of]:reset()
    /** Call this after all observers have been registered - doing `<State>.observers.add(<Observer>)`. */
    public reset() {
        this.position = positionFromFen(STARTFEN);
        this.notifyObservers();
    }
    //[cf]
    //[of]:makeMove()
    public makeMove(from: boardindex, to: boardindex):this {
        let position = this.position;
        if (!position) { throw new Error("State has not been initialized"); }
    
        if (from == to) {
            return this.notifyObservers();
        }
    
        let board = position.board;
        let castling = position.castling;
        let whitetomove = position.whitetomove;
    
        let fromuid = board[from];
        let touid = board[to];
        let frompiece = HASH.get(fromuid);
        let topiece = HASH.get(touid);
    
        let iswhite = frompiece.iswhite;
    
        let enpassant = position.enpassant;
        let newenpassant = null;
    
        let movemade = false;
        let waslegalmove = false;
    
    
        //[of]:white castles short
        if (!movemade &&
            castling.whiteshort &&
            (
                (
                    from == 60 && (to == 62 || to == 63)
                ) ||
                (from == 63 && to == 60) 
            ) &&
            !(61 in board) && !(62 in board)
        ) {
            board[62] = board[60];
            board[61] = board[63];
            delete board[60];
            delete board[63];
            castling.whiteshort = false;
            castling.whitelong = false;
        
            movemade = true;
            if (whitetomove) {
                waslegalmove = true;
            }
        }
        //[cf]
        //[of]:white castles long
        if (!movemade &&
            castling.whitelong &&
            (
                (
                    from == 60 && (to > 55 && to < 59)
                ) ||
                (from == 56 && to == 60)
            ) &&
            !(57 in board) && !(58 in board) && !(59 in board)
        ) {
            board[58] = board[60];
            board[59] = board[56];
            delete board[60];
            delete board[56];
            castling.whiteshort = false;
            castling.whitelong = false;
        
            movemade = true;
            if (whitetomove) {
                waslegalmove = true;
            }
        }
        //[cf]
        //[of]:black castles short
        if (!movemade &&
            castling.blackshort &&
            (
                (
                    from == 4 && (to == 6 || to == 7)
                ) ||
                (from == 7 && to == 4) 
            ) &&
            !(5 in board) && !(6 in board)
        ) {
            board[6] = board[4];
            board[5] = board[7];
            delete board[4];
            delete board[7];
            castling.blackshort = false;
            castling.blacklong = false;
        
            movemade = true;
            if (!whitetomove) {
                waslegalmove = true;
            }
        }
        //[cf]
        //[of]:black castles long
        if (!movemade &&
            castling.blacklong &&
            (
                (
                    from == 4 && (to > -1 && to < 3)
                ) ||
                (from == 0 && to == 4) 
            ) &&
            !(1 in board) && !(2 in board) && !(3 in board)
        ) {
            board[2] = board[4];
            board[3] = board[0];
            delete board[4];
            delete board[0];
            castling.blackshort = false;
            castling.blacklong = false;
        
            movemade = true;
            if (!whitetomove) {
                waslegalmove = true;
            }
        }
        //[cf]
        //[of]:en passant
        if (
            !movemade && enpassant && !touid && frompiece.type=='p' && to==enpassant &&
            (
                (
                    iswhite && whitetomove &&
                    (from==enpassant+7 || from==enpassant+9) &&
                    HASH.get(board[enpassant+8]).type=='p' &&
                    !HASH.get(board[enpassant+8]).iswhite
                ) ||
                (
                    !frompiece.iswhite && !whitetomove &&
                    (from==enpassant-7 || from==enpassant-9) &&
                    HASH.get(board[enpassant-8]).type=='p' &&
                    HASH.get(board[enpassant-8]).iswhite
                )
            )
        ) {
            board[to] = fromuid;
            delete board[from];
            if (whitetomove) {
                delete board[enpassant+8]
            } else {
                delete board[enpassant-8]
            }
        
            movemade = true;
            waslegalmove = true;
        }
        //[cf]
        //[of]:white pawn moves two squares from start position
        if (
            !movemade && !touid && frompiece.type=='p' && frompiece.iswhite &&
            from > 47 && from < 56 && to==from-16
        ) {
            delete board[from];
            board[to] = fromuid;
            movemade = true;
            newenpassant = from-8;
            if (whitetomove) {
                waslegalmove = true;
            }
        }
        //[cf]
        //[of]:black pawn moves two squares from start position
        if (
            !movemade && !touid && frompiece.type=='p' && !frompiece.iswhite &&
            from > 7 && from < 16 && to==from+16
        ) {
            delete board[from];
            board[to] = fromuid;
            movemade = true;
            newenpassant = from+8;
            if (!whitetomove) {
                waslegalmove = true;
            }
        }
        //[cf]
        //[of]:normal move
        if (!movemade) {
            if (!(touid && frompiece.iswhite === topiece.iswhite)) {
                delete board[from];
                board[to] = fromuid;
                movemade = true;
                waslegalmove = true; // todo
            }
        }
        //[cf]
    
        if (waslegalmove) {
            position.whitetomove = !whitetomove;
            position.enpassant = newenpassant;
        } else if (newenpassant) {
            position.enpassant = newenpassant;
        }
    
        return this.notifyObservers();
    }
    
    //[cf]

    //[of]:notifyObservers()
    /** called internally when changes to the State were made */
    private notifyObservers():this {
        for (let observer of this.observers) {
            observer.update();
        }
        return this;
    }
    //[cf]

}
//[cf]
//[of]:Observer
/** An element on the page, listening to changes in the State */
abstract class Observer {

    protected readonly state: State;

    //[of]:constructor()
    constructor(state: State) {
        this.state = state;
        state.observers.add(this);
    }
    //[cf]

    //[of]:update()
    /** Called by the Application State when it has made changes to its state. */
    abstract update():void;
    //[cf]

}
//[cf]
//[of]:Board
class Board extends Observer {

    private pieces:{ [ uid:number ]:pieceelem } = { };
    private grabbedpiece:pieceelem|null = null;
    private elem:boardelem;
    private dimensions:Boarddimensions;
    
    //[of]:constructor()
    //[of]:grab()
    private grab( piece:pieceelem|null, mouse:Mouseinfos|null ):this {
        if (piece) {
            this.grabbedpiece = piece;
        } else {
            piece = this.grabbedpiece;
        }
        if (piece && mouse) {
            piece.css({
                zIndex: 1000,
                top: mouse.dragY,
                left: mouse.dragX,
            });
        }
        return this;
    }
    //[cf]
    //[of]:release()
    private release( mouse:Mouseinfos|null ):this {
        let piece = this.grabbedpiece;
        this.grabbedpiece = null;
        if (piece && mouse) {
            piece.css({
                zIndex: 1
            });
            let to = mouse.index;
            let from = parseInt(piece.data('index'));
            this.state.makeMove(from, to);
        } else {
            this.update();
        }
        return this;
    }
    
    //[cf]
    
    constructor ( boardid:elemid, state:State ) {
        super(state);
    
        let elem = this.elem = $(boardid);
    
        this.dimensions = this.updateDimensions();
    
        let self = this;
        elem.on('mousedown', 'chess-piece', function( event:mousedownevent ) {
            self.grab($(this), self.readMouseinfos(event));
            return handled(event);
        });
        elem.on('mousemove', function( event:mousemoveevent ) {
            if (self.grabbedpiece) {
                let mouseinfos = self.readMouseinfos(event);
                if (mouseinfos) {
                    let index = mouseinfos.index;
                    if (index < 8) {
                        self.togglePromo(true, true);
                    } else if (index > 55) {
                        self.togglePromo(true, false);
                    } else {
                        self.togglePromo(false, false);
                    }
                }
                self.grab(null, mouseinfos);
                return handled(event);
            }
        });
        elem.on('mouseup', function( event:mouseupevent ) {
            self.togglePromo(false);
            self.release(self.readMouseinfos(event));
            return handled(event);
        });
        $(window).on('resize', function() {
            self.dimensions = self.updateDimensions();
        });
    }
    //[cf]
    //[of]:update()
    //[of]:makePiece()
    private makePiece( id:uid ):pieceelem {
        let piece = HASH.get(id);
        let piecetype = piece.iswhite ? piece.type.toUpperCase() : piece.type;
        let elem = $(`<chess-piece class="${piecetype}" />`);
        elem.data({ id: id, index: 0 });
        this.pieces[id] = elem;
        this.elem.append(elem);
        return elem;
    }
    //[cf]
    //[of]:drop()
    private drop( elem:pieceelem ):this {
        elem.addClass('hidden');
        return this;
    }
    //[cf]
    //[of]:place()
    private place(
        elem: pieceelem,
        index: boardindex,
        options:{ smooth:boolean } = { smooth: false }
    ):this {
        let [x,y] = indexToCoords(index);
        if (options.smooth) {
            elem.animate({
                top: coordToPercent(y),
                left: coordToPercent(x)
            }, 100);
        } else {
            elem.css({
                top: coordToPercent(y),
                left: coordToPercent(x)
            });
        }
        elem.data('index', index);
        return this;
    }
    //[cf]
    
    public update() {
    
        let position = this.state.position;
        if (position === null) {
            throw new Error(
                'The application state has no defined a chess position. '
                + 'Do this by e.g. running <State>.reset()'
            );
        }
    
        let board = position.board;
        let pieces = this.pieces;
    
        // place new or existing pieces on the board
        for (const [index, id] of items(board)) {
            if (!(id in pieces)) {
                let elem = this.makePiece(id);
                this.place(elem, index);
            } else {
                let elem = pieces[id];
                this.place(elem, index, { 'smooth': true });
            }
        }
    
        // drop non existing pieces off the board
        for (const elem of values(pieces)) {
            let index = parseInt(elem.data('index'));
            if (!(index in board) || (parseInt(elem.data('id')) !== board[index])) {
                this.drop(elem);
            }
        }
    }
    //[cf]

    //[of]:readMouseinfos()
    private readMouseinfos( event:dragdropevent ):Mouseinfos|null {
        let x = event.pageX - event.delegateTarget.offsetLeft;
        let y = event.pageY - event.delegateTarget.offsetTop;
        let boardsize = this.dimensions.boardsize;
        if (x < 0 || y < 0 || x > boardsize || y > boardsize) {
            return null;
        }
    
        let halfpiecesize = this.dimensions.halfpiecesize;
        let dragX = x - halfpiecesize;
        let dragY = y - halfpiecesize;
    
        let piecesize = this.dimensions.piecesize;
        let colindex = Math.floor(x / piecesize);
        let rowindex = Math.floor(y / piecesize);
        let index = 8 * rowindex + colindex;
        
        return {
            x:x, y:y,
            dragX:dragX, dragY:dragY,
            index: index, colindex:colindex, rowindex:rowindex,
        };
    }
    //[cf]
    //[of]:updateDimensions()
    private updateDimensions():Boarddimensions {
        let boardsize = Math.round(this.elem.width() || 300);
        let piecesize = Math.round(boardsize / 8);
        let halfpiecesize = Math.round(piecesize / 2);
        return {
            boardsize:boardsize,
            piecesize:piecesize,
            halfpiecesize:halfpiecesize
        }
    }
    //[cf]
    //[of]:togglePromo()
    private promopiece:Piece|null = null;
    private togglingpromo:Function|null = null;
    
    private togglePromo(on:boolean, lastrank:boolean):void {
        if (on) {
            if (!this.togglingpromo) {
                let piece = HASH.get(parseInt(this.grabbedpiece.data('id')));
                if (
                    piece.type === 'p' &&
                    (
                        (lastrank && piece.iswhite) ||
                        (!lastrank && !piece.iswhite)
                    )
                )
                this.togglingpromo = setInterval(()=>{
                    console.log(piece);
                },500);
            }
        } else {
            this.promopiece = null;
            clearInterval(this.togglingpromo);
        }
    //[c]    ~ let piece = HASH.get(parseInt(self.grabbedpiece.data('id')))
    //[c]    ~ console.log(piece);
    
    }
    //[cf]
}

interface Mouseinfos {
    x:pixels, y:pixels,
    dragX:pixels, dragY:pixels,
    index:boardindex, colindex:colindex, rowindex:rowindex,
}

interface Boarddimensions {
    boardsize: pixels,
    piecesize: pixels,
    halfpiecesize: pixels
}
//[cf]
//[c])

//[c]( Constants
//[of]:STARTFEN
const STARTFEN : fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
//[cf]
//[of]:COLTRANSTABLE
const COLTRANSTABLE:{ [ key:string ]:int } = {
    'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7,
};
//[cf]
//[of]:ROWTRANSTABLE
const ROWTRANSTABLE:{ [ key:string ]:int } = {
    '8': 0, '7': 1, '6': 2, '5': 3, '4': 4, '3': 5, '2': 6, '1': 7,
};
//[cf]
//[of]:REVCOLTRANSTABLE
const REVCOLTRANSTABLE:string = 'abcdefgh';
//[cf]
//[of]:REVROWTRANSTABLE
const REVROWTRANSTABLE:string = '87654321';
//[cf]
//[c])

//[c]( Interfaces
//[of]:Chessposition
interface Chessposition {
    board:chessboard,
    whitetomove:boolean,
    castling:{
        whiteshort:boolean,
        whitelong:boolean,
        blackshort:boolean,
        blacklong:boolean
    },
    enpassant:boardindex|null
}

//[of]:positionFromFen()
function positionFromFen( fen:fen ):Chessposition {

    let [
        fenpieces,
        fentomove,
        fencastling,
        fenenpassant
    ] = fen.trim().split(/\s+/);
    
    let board:chessboard = { };
    let curindex = 0;
    for (const char of fenpieces) {
        let empty = parseInt(char);
        if (empty) {
            curindex += empty;
        } else if (char === '/') {
            continue;
        } else {
            board[curindex] = makePiece(char as fenpiecename, curindex);
            curindex++;
        }
    }

    let whitetomove = fentomove.toLowerCase() === 'w';

    let castling = {
        whiteshort: fencastling.includes('K'),
        whitelong: fencastling.includes('Q'),
        blackshort: fencastling.includes('k'),
        blacklong: fencastling.includes('q')
    };

    let enpassant = null;
    if (fenenpassant !== '-') {
        enpassant = coordsToIndex(
            COLTRANSTABLE[fenenpassant[0]],
            ROWTRANSTABLE[fenenpassant[1]],
        );
    }
    
    return {
        board: board,
        whitetomove: whitetomove,
        castling:castling,
        enpassant:enpassant
    };
}
//[cf]
//[cf]
//[of]:Piece
interface Piece {
    type: piecetype;
    id: uid;
    index: boardindex;
    iswhite: boolean;
    domelem?: pieceelem
}

function makePiece( name:fenpiecename, index:boardindex ) : uid {
    let piecetype = name.toLowerCase();
    if (!"kqrbnp".includes(piecetype)) {
        throw new Error("Illegal piecetype");
    }
    let iswhite = piecetype !== name;
    let piece:Piece = {
        type: piecetype as piecetype,
        id: -1,
        index: index,
        iswhite: iswhite,
    };

    let id = piece.id = HASH.add(piece);
    return id;
}
//[cf]
//[c])

//[c]( Iterators
type key = any;
type value = any;
//[of]:items()
/** Iterate over the keys and values of an 'iterable' (in the Python sense) */
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
//[of]:values()
/** Iterate over the values of an 'iterable' (in the Python sense) */
function* values(
    iterable: Map<key, value> | Iterable<value> | Object
): IterableIterator<value> {

    if (iterable instanceof Map) {
        for (const value of iterable.values()) {
            yield value;
        }
    }

    else if (
        // sorted by usage frequency
        iterable instanceof Array
        || typeof iterable === 'string'
        || iterable instanceof Set
        || iterable instanceof String
    ) {
        for (const value of iterable) {
            yield value;
        }
    }

    else if (iterable instanceof Object) {
        for (const value of Object.values(iterable)) {
            yield value;
        }
    }

    else {
        throw new Error(`Can not be used with '${typeof iterable}' type`);
    }
}
//[cf]
//[c])
//[c]
//[c]( Misc Tools
//[of]:indexToCoords()
function indexToCoords( index:boardindex ):[ colindex, rowindex ] {
    let x = index % 8;
    return [ x, (index-x)/8 ];
}
//[cf]
//[of]:coordsToIndex()
function coordsToIndex( x:colindex, y:rowindex ):boardindex {
    return y * 8 + x;
}
//[cf]
//[of]:coordToPercent()
function coordToPercent( coord:index ):string {
    return coord * 12.5 + '%';
}
//[cf]
//[of]:clone()
/** https://jsperf.com/cloning-an-object/79 */
function clone( object:any ):any {
    return JSON.parse(
        JSON.stringify(object)
    );
}
//[cf]
//[of]:handled()
function handled( event:dragdropevent ):boolean {
    event.preventDefault();
    event.stopPropagation();
    return false;
}
//[cf]
//[of]:squarename()
function squarename( index:boardinex|null ):string|null {
    if(index === null) {
        return null;
    }
    let [x,y] = indexToCoords(index);
    return REVCOLTRANSTABLE[x] + REVROWTRANSTABLE[y];
}
//[cf]
//[c])

//[c]( Types
//[of]:int
/** 'it shall be an integer, not a float' */
type int = number;
//[cf]
//[of]:pixels
/** 'these are pixels' */
type pixels = int;
//[cf]
//[of]:fen
/** A chess position encoded in Forsyth-Edwards notation. E.g. 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' for the starting position in chess games. */
type fen = string;
//[cf]
//[of]:fenpiecename
/** Short piece names used in FENs. Big letters are white pieces */
type fenpiecename = 'K'|'Q'|'R'|'B'|'N'|'P'|'k'|'q'|'r'|'b'|'n'|'p';
//[cf]
//[of]:piecetype
/** Short names for king, queen, rook, bishop, knight, pawn. */
type piecetype = 'k'|'q'|'r'|'b'|'n'|'p';
//[cf]
//[of]:chessboard
/** The internal chessboard representation. It does only contain indices for squares occupied by pieces. */
type chessboard = { [ index:number ]:uid };
//[cf]
//[of]:boardindex
/** The unit denoting the index of a square in the internal chessboard representation. 0 to 63. Equivalent to `rowindex * 8 + colindex`. 0 is 'a8' in algebraic chess notation. This is the top left square, when white is on bottom. 63 is 'h1', the bottom right square. Some functions also use 'index' to denote that it can be either a colindex or a rowindex. */
type boardindex = int;
//[cf]
//[of]:colindex
/** Horizontal index on an abstract chessboard. 0 to 7. Would be 'a' to 'h' in algebraic chess notation. */
type colindex = int;
//[cf]
//[of]:rowindex
/** Vertical index on an abstract chessboard. 0 to 7. Would be '8' to '1' in algebraic chess notation. */
type rowindex = int;
//[cf]
//[of]:index
/** either a colindex or a rowindex */
type index = colindex|rowindex;
//[cf]
//[of]:uid
/** An autogenerated unique positive integer pointing to a piece (see the Piece interface). The pieces are saved in a hash, because pieces can be taken from the board (e.g. when a piece takes another piece) and they can be added back to the board (e.g. when navigating back to a previous position). This allows smooth animations of piece movements. Both the Piece interface and the jQuery dom element for that piece on the board have a reference to the uid (`<piece>.id` and `<domelem>.data('id')`). To get the Piece for a specific uid do `HASH.get(<uid>)` */
type uid = int;
//[cf]
//[of]:elemid
/** an element id in CSS notation. E.g. '#chessboard'. */
type elemid = string;
//[cf]
//[of]:elem
/** a jQuery dom element */
type elem = JQuery<HTMLElement>;
//[cf]
//[of]:boardelem
/** the jQuery dom element for the chessboard */
type boardelem = elem;
//[cf]
//[of]:pieceelem
/** the jQuery dom element for a piece on the chessboard */
type pieceelem = elem;
//[cf]
//[of]:dragdropevent
/** Used in functions handling piece dragging */
type dragdropevent = mousedownevent|mousemoveevent|mouseupevent;

type mousedownevent = JQuery.MouseDownEvent
type mousemoveevent = JQuery.MouseMoveEvent
type mouseupevent = JQuery.MouseUpEvent
//[cf]
//[c])

window.onload = function () {
    $('#please-enable-js-message').remove();
    let state = new State();
    new Board('#board', state);
//[c]    ~ new ChessNotation('#notation', state);
//[c]    ~ new ChessToolbar('#toolbar', state);
    state.reset();
}

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
