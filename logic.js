"use strict";
/* Tool to analyse chess positions */
//[of]:HASH
/** Memory to save things and later access them again */
let HASH = new class {
    constructor() {
        this.entries = {};
        this.uid = 0;
    }
    add(thing) {
        this.entries[++this.uid] = thing;
        return this.uid;
    }
    get(uid) {
        return this.entries[uid];
    }
};
//[cf]
//[c]( MVC
//[of]:State
/** The Application state. */
class State {
    //[of]:constructor()
    constructor() {
        this.observers = new Set();
        this.position = positionFromFen(STARTFEN);
    }
    //[cf]
    //[of]:start()
    start() {
        return this.notifyObservers();
    }
    //[cf]
    //[of]:reset()
    reset() {
        this.position = positionFromFen(STARTFEN);
        return this.notifyObservers();
    }
    //[cf]
    //[of]:makemove()
    makemove(from, to, promopiece) {
        if (from === to) {
            return this.notifyObservers();
        }
        let position = this.position;
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
            ((from == 60 && (to == 62 || to == 63)) ||
                (from == 63 && to == 60)) &&
            !(61 in board) && !(62 in board)) {
            this.movepiece(60, 62);
            this.movepiece(63, 61);
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
            ((from == 60 && (to > 55 && to < 59)) ||
                (from == 56 && to == 60)) &&
            !(57 in board) && !(58 in board) && !(59 in board)) {
            this.movepiece(60, 58);
            this.movepiece(56, 59);
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
            ((from == 4 && (to == 6 || to == 7)) ||
                (from == 7 && to == 4)) &&
            !(5 in board) && !(6 in board)) {
            this.movepiece(4, 6);
            this.movepiece(7, 5);
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
            ((from == 4 && (to > -1 && to < 3)) ||
                (from == 0 && to == 4)) &&
            !(1 in board) && !(2 in board) && !(3 in board)) {
            this.movepiece(4, 2);
            this.movepiece(0, 3);
            castling.blackshort = false;
            castling.blacklong = false;
            movemade = true;
            if (!whitetomove) {
                waslegalmove = true;
            }
        }
        //[cf]
        //[of]:en passant
        if (!movemade && enpassant && !touid && frompiece.type == 'p' && to == enpassant &&
            ((iswhite && whitetomove &&
                (from == enpassant + 7 || from == enpassant + 9) &&
                HASH.get(board[enpassant + 8]).type == 'p' &&
                !HASH.get(board[enpassant + 8]).iswhite) ||
                (!frompiece.iswhite && !whitetomove &&
                    (from == enpassant - 7 || from == enpassant - 9) &&
                    HASH.get(board[enpassant - 8]).type == 'p' &&
                    HASH.get(board[enpassant - 8]).iswhite))) {
            this.movepiece(from, to);
            if (whitetomove) {
                delete board[enpassant + 8];
            }
            else {
                delete board[enpassant - 8];
            }
            movemade = true;
            waslegalmove = true;
        }
        //[cf]
        //[of]:white pawn moves two squares from start position
        if (!movemade && !touid && frompiece.type == 'p' && frompiece.iswhite &&
            from > 47 && from < 56 && to == from - 16) {
            this.movepiece(from, to);
            movemade = true;
            newenpassant = from - 8;
            if (whitetomove) {
                waslegalmove = true;
            }
        }
        //[cf]
        //[of]:black pawn moves two squares from start position
        if (!movemade && !touid && frompiece.type == 'p' && !frompiece.iswhite &&
            from > 7 && from < 16 && to == from + 16) {
            this.movepiece(from, to);
            movemade = true;
            newenpassant = from + 8;
            if (!whitetomove) {
                waslegalmove = true;
            }
        }
        //[cf]
        //[of]:pawn promotion
        if (!movemade && promopiece) {
            board[to] = makePiece(promopiece, to);
            delete board[from];
            movemade = true;
            waslegalmove = true;
        }
        //[cf]
        //[of]:normal move
        if (!movemade) {
            if (!(touid && frompiece.iswhite === topiece.iswhite)) {
                this.movepiece(from, to);
                movemade = true;
                waslegalmove = true; // todo
            }
        }
        //[cf]
        if (waslegalmove) {
            position.whitetomove = !whitetomove;
            position.enpassant = newenpassant;
        }
        else if (newenpassant) {
            position.enpassant = newenpassant;
        }
        return this.notifyObservers();
    }
    //[cf]
    //[of]:movepiece()
    movepiece(from, to) {
        let board = this.position.board;
        let fromuid = board[from];
        HASH.get(fromuid).index = to;
        board[to] = fromuid;
        delete board[from];
    }
    //[cf]
    //[of]:notifyObservers()
    /** called internally when changes to the State were made */
    notifyObservers() {
        for (let observer of this.observers) {
            observer.update();
        }
        return this;
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
}
//[cf]
//[of]:Board
class Board extends Observer {
    //[of]:constructor()
    constructor(boardid, state) {
        super(state);
        this.pieces = {};
        this.grabbedelem = null;
        this.grabbedpiece = null;
        let elem = this.elem = $(boardid);
        this.dimensions = this.updateDimensions();
        this.promochooserwhite = $('promo-chooser-white', elem);
        this.promochooserblack = $('promo-chooser-black', elem);
        //[c]    Todo: Better handling of pieces dragged outside of the board
        //[c]    (mouse leaves window)
        //[c]    Todo: Implement 'drop off piece' functionality
        let self = this;
        //[of]:board mouse down handler
        elem.on('mousedown', 'chess-piece', function (event) {
            self.grab($(this), self.readMouseinfos(event));
            return handled(event);
        });
        //[cf]
        //[of]:board mouse move handler
        elem.on('mousemove', function (event) {
            if (self.grabbedpiece) {
                self.drag(self.readDraginfos(event));
                return handled(event);
            }
        });
        //[cf]
        //[of]:board mouse up handler
        elem.on('mouseup', function (event) {
            self.release(self.readMouseinfos(event));
            return handled(event);
        });
        //[cf]
        //[of]:window rezise handler
        $(window).on('resize', function () {
            self.dimensions = self.updateDimensions();
        });
        //[cf]
    }
    //[cf]
    //[of]:update()
    update() {
        let board = this.state.position.board;
        let pieces = this.pieces;
        //[of]:place new or existing pieces on the board
        for (const [index, id] of items(board)) {
            if (!(id in pieces)) {
                let elem = this.makePiece(id);
                this.place(elem, index);
            }
            else {
                let elem = pieces[id];
                this.place(elem, index, { 'smooth': true });
            }
        }
        //[cf]
        //[of]:drop non existing pieces off the board
        for (const elem of values(pieces)) {
            let index = getindex(elem);
            if (!(index in board) || getid(elem) !== board[index]) {
                this.dropoff(elem);
            }
        }
        //[cf]
    }
    //[cf]
    //[of]:grab()
    /** Mouse down over piece */
    grab(elem, mouseinfos) {
        this.grabbedelem = elem;
        let piece = this.grabbedpiece = getpiece(elem);
        if (mouseinfos) {
            elem.css({
                zIndex: 1000,
                top: mouseinfos.dragY,
                left: mouseinfos.dragX,
            });
            //[of]:pawn promotion
            if (piece.type == 'p') {
                let index = piece.index;
                let board = this.state.position.board;
                if (piece.iswhite && index > 7 && index < 16 && !(index - 8 in board)) {
                    let promochooser = this.promochooserwhite;
                    let [x, y] = indexToCoords(index - 8);
                    promochooser.css({
                        top: coordToPercent(y),
                        left: coordToPercent(x)
                    });
                    promochooser.show();
                }
                else if (!piece.iswhite && index > 47 && index < 56 && !(index + 8 in board)) {
                    let promochooser = this.promochooserblack;
                    let [x, y] = indexToCoords(index + 8);
                    promochooser.css({
                        top: coordToPercent(y),
                        left: coordToPercent(x)
                    });
                    promochooser.show();
                }
            }
            //[cf]
        }
        return this;
    }
    //[cf]
    //[of]:drag()
    /** moving mouse while piece `grab()`bed */
    drag(draginfos) {
        let elem = this.grabbedelem;
        if (elem && draginfos) {
            elem.css({
                zIndex: 1000,
                top: draginfos.dragY,
                left: draginfos.dragX,
            });
        }
        return this;
    }
    //[cf]
    //[of]:release()
    /** mouse up while piece `grab()`bed */
    release(mouseinfos) {
        let elem = this.grabbedelem;
        if (elem) {
            this.promochooserblack.hide();
            this.promochooserwhite.hide();
            this.grabbedelem = null;
            this.grabbedpiece = null;
        }
        if (elem && mouseinfos) {
            elem.css({
                zIndex: 1
            });
            let to = mouseinfos.index;
            let from = getindex(elem);
            this.state.makemove(from, to, mouseinfos.promopiece);
        }
        else {
            this.update();
        }
        return this;
    }
    //[cf]
    //[of]:place()
    /** make sure a piece is placed according to its index */
    place(elem, index, options = { smooth: false }) {
        if (!index) {
            index = getpiece(elem).index;
        }
        let [x, y] = indexToCoords(index);
        if (options.smooth) {
            elem.animate({
                top: coordToPercent(y),
                left: coordToPercent(x)
            }, 100);
        }
        else {
            elem.css({
                top: coordToPercent(y),
                left: coordToPercent(x)
            });
        }
        elem.data('index', index);
        return this;
    }
    //[cf]
    //[of]:dropoff()
    /** remove a piece from the board (the piece actually just gets hidden) */
    dropoff(elem) {
        elem.addClass('hidden');
        return this;
    }
    //[cf]
    //[of]:makePiece()
    /** create the dom element for a piece and append it to the board */
    makePiece(id) {
        let piece = HASH.get(id);
        let piecetype = piece.iswhite ? piece.type.toUpperCase() : piece.type;
        let elem = $(`<chess-piece class="${piecetype}" />`);
        elem.data({ id: id, index: 0 });
        this.pieces[id] = elem;
        this.elem.append(elem);
        return elem;
    }
    //[cf]
    //[of]:readMouseinfos()
    /** read the needed mouse infos from an event. Used in `grab()` and `release()` */
    readMouseinfos(event) {
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
        let promopiece = null;
        if (rowindex === 0 || rowindex === 7) {
            promopiece = (x < (colindex * piecesize + halfpiecesize))
                ? (y < (rowindex * piecesize + halfpiecesize))
                    ? 'q'
                    : 'b'
                : (y < (rowindex * piecesize + halfpiecesize))
                    ? 'r'
                    : 'n';
            if (rowindex === 0) {
                promopiece = promopiece.toUpperCase();
            }
        }
        return {
            promopiece: promopiece,
            x: x, y: y,
            dragX: dragX, dragY: dragY,
            index: index, colindex: colindex, rowindex: rowindex,
        };
    }
    //[cf]
    //[of]:readDraginfos()
    /** light version of `readMouseinfos()`, used when `drag()`ging a piece */
    readDraginfos(event) {
        let x = event.pageX - event.delegateTarget.offsetLeft;
        let y = event.pageY - event.delegateTarget.offsetTop;
        let boardsize = this.dimensions.boardsize;
        if (x < 0 || y < 0 || x > boardsize || y > boardsize) {
            return null;
        }
        let halfpiecesize = this.dimensions.halfpiecesize;
        let dragX = x - halfpiecesize;
        let dragY = y - halfpiecesize;
        return { dragX: dragX, dragY: dragY };
    }
    //[cf]
    //[of]:updateDimensions()
    /** read out the board size and piece size on document load and -resize */
    updateDimensions() {
        let boardsize = Math.round(this.elem.width() || 300);
        let piecesize = Math.round(boardsize / 8);
        let halfpiecesize = Math.round(piecesize / 2);
        return {
            boardsize: boardsize,
            piecesize: piecesize,
            halfpiecesize: halfpiecesize
        };
    }
}
//[c]( Tools
//[of]:getindex()
function getindex(elem) {
    return parseInt(elem.data('index'));
}
//[cf]
//[of]:getid()
function getid(elem) {
    return parseInt(elem.data('id'));
}
//[cf]
//[of]:getpiece()
function getpiece(elem) {
    return HASH.get(getid(elem));
}
//[cf]
//[c])
//[cf]
//[c])
//[c]( Constants
//[of]:STARTFEN
const STARTFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
//[cf]
//[of]:COLTRANSTABLE
const COLTRANSTABLE = {
    'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7,
};
//[cf]
//[of]:ROWTRANSTABLE
const ROWTRANSTABLE = {
    '8': 0, '7': 1, '6': 2, '5': 3, '4': 4, '3': 5, '2': 6, '1': 7,
};
//[cf]
//[of]:REVCOLTRANSTABLE
const REVCOLTRANSTABLE = 'abcdefgh';
//[cf]
//[of]:REVROWTRANSTABLE
const REVROWTRANSTABLE = '87654321';
//[of]:positionFromFen()
function positionFromFen(fen) {
    let [fenpieces, fentomove, fencastling, fenenpassant] = fen.trim().split(/\s+/);
    let board = {};
    let curindex = 0;
    for (const char of fenpieces) {
        let empty = parseInt(char);
        if (empty) {
            curindex += empty;
        }
        else if (char === '/') {
            continue;
        }
        else {
            board[curindex] = makePiece(char, curindex);
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
        enpassant = coordsToIndex(COLTRANSTABLE[fenenpassant[0]], ROWTRANSTABLE[fenenpassant[1]]);
    }
    return {
        board: board,
        whitetomove: whitetomove,
        castling: castling,
        enpassant: enpassant
    };
}
function makePiece(name, index) {
    let piecetype = name.toLowerCase();
    if (!"kqrbnp".includes(piecetype)) {
        throw new Error("Illegal piecetype");
    }
    let iswhite = piecetype !== name;
    let piece = {
        type: piecetype,
        id: -1,
        index: index,
        iswhite: iswhite,
    };
    let id = piece.id = HASH.add(piece);
    return id;
}
//[of]:items()
/** Iterate over the keys and values of an 'iterable' (in the Python sense) */
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
//[of]:values()
/** Iterate over the values of an 'iterable' (in the Python sense) */
function* values(iterable) {
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
        || iterable instanceof String) {
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
//[c]( Misc Tools
//[of]:indexToCoords()
function indexToCoords(index) {
    let x = index % 8;
    return [x, (index - x) / 8];
}
//[cf]
//[of]:coordsToIndex()
function coordsToIndex(x, y) {
    return y * 8 + x;
}
//[cf]
//[of]:coordToPercent()
function coordToPercent(coord) {
    return coord * 12.5 + '%';
}
//[cf]
//[of]:clone()
/** https://jsperf.com/cloning-an-object/79 */
function clone(object) {
    return JSON.parse(JSON.stringify(object));
}
//[cf]
//[of]:handled()
function handled(event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
}
//[cf]
//[of]:squarename()
/** Convert a boardindex to the representation of the square name in algebraic
chess notation. Eg `0` becomes `'a8'`, `63` becomes `'h1'`. */
function squarename(index) {
    if (index === null) {
        return null;
    }
    let [x, y] = indexToCoords(index);
    return REVCOLTRANSTABLE[x] + REVROWTRANSTABLE[y];
}
//[cf]
//[c])
window.onload = function () {
    $('#please-enable-js-message').remove();
    let state = new State();
    new Board('#board', state);
    //[c]    ~ new ChessNotation('#notation', state);
    //[c]    ~ new ChessToolbar('#toolbar', state);
    state.start();
};
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
