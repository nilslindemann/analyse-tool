"use strict";
/* Tool to analyse chess positions */
//[of]:HASH
/** Memory to save things and later access them again */
let HASH = new class {
    constructor() {
        this.entries = {};
        this.id = 0;
    }
    add(thing) {
        this.entries[++this.id] = thing;
        return this.id;
    }
    get(id) {
        return this.entries[id];
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
        let fromid = board[from];
        let toid = board[to];
        let frompiece = HASH.get(fromid);
        let topiece = HASH.get(toid);
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
        if (!movemade && enpassant && !toid && frompiece.type == 'p' && to == enpassant &&
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
        if (!movemade && !toid && frompiece.type == 'p' && frompiece.iswhite &&
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
        if (!movemade && !toid && frompiece.type == 'p' && !frompiece.iswhite &&
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
            if (!(to in board)) {
                board[to] = makepiece(promopiece, to);
                delete board[from];
                waslegalmove = true;
            }
            movemade = true;
        }
        //[cf]
        //[of]:normal move
        if (!movemade) {
            if (!(toid && frompiece.iswhite === topiece.iswhite)) {
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
        let fromid = board[from];
        HASH.get(fromid).index = to;
        board[to] = fromid;
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
        let elem = this.elem = $(boardid);
        this.updateDimensions();
        this.promochooserwhite = $('promo-chooser-white', elem);
        this.promochooserblack = $('promo-chooser-black', elem);
        //[c]    Todo: Implement 'drop off piece' functionality
        let self = this;
        //[of]:board  mouse down handler
        elem.on('mousedown', 'chess-piece', function (event) {
            self.grab($(this), event);
            return handled(event);
        });
        //[cf]
        //[of]:board  mouse up handler
        elem.on('mouseup', function (event) {
            if (self.grabbedelem) {
                self.release(event);
            }
            return handled(event);
        });
        //[cf]
        //[of]:body   mouse move handler
        $('body').on('mousemove', function (event) {
            if (self.grabbedelem) {
                self.drag(event);
            }
            return handled(event);
        });
        //[cf]
        //[of]:body   mouse leave handler
        $('body').on('mouseleave', function () {
            if (self.grabbedelem) {
                self.grabbedelem.hide();
            }
        });
        //[cf]
        //[of]:body   mouse enter handler
        $('body').on('mouseenter', function () {
            if (self.grabbedelem) {
                self.grabbedelem.show();
            }
        });
        //[cf]
        //[of]:window mouse up handler
        $(window).on('mouseup', function (event) {
            if (self.grabbedelem) {
                self.grabbedelem.show();
            }
            self.reset();
            return handled(event);
        });
        //[cf]
        //[of]:window rezise handler
        $(window).on('resize', function () {
            self.updateDimensions();
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
                let elem = this.makepiece(id);
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
        return this;
    }
    //[cf]
    //[of]:updateDimensions()
    /** read out the board size and piece size on document load and -resize */
    updateDimensions() {
        {
            let offset = this.elem.offset();
            let x = offset ? offset.left : 0;
            let y = offset ? offset.top : 0;
            this.position = { x: x, y: y };
        }
        let size = this.elem.width();
        if (!size) {
            throw new Error('could not detect board size');
        }
        else {
            size = this.size = Math.round(size);
            let piecesize = this.piecesize = Math.round(size / 8);
            this.halfpiecesize = Math.round(piecesize / 2);
        }
        return this;
    }
    //[cf]
    //[of]:grab(pieceelem, mousedownevent)
    /** grab a piece on the board */
    grab(elem, event) {
        this.grabbedelem = elem;
        let mousepos = this.mousepos(event);
        this.aligncursor(elem, mousepos);
        this.adjustpromochooser(elem, mousepos);
        return this;
    }
    //[cf]
    //[of]:drag(mousemoveevent)
    /** drag a grabbed piece */
    drag(event) {
        let elem = this.grabbedelem;
        if (elem) {
            let mousepos = this.mousepos(event);
            this.aligncursor(elem, mousepos);
            this.adjustpromochooser(elem, mousepos);
        }
        return this;
    }
    //[cf]
    //[of]:release(mouseupevent)
    /** release a grabbed piece */
    release(event) {
        let elem = this.grabbedelem;
        if (elem) {
            this.hidepromo();
            elem.css({ zIndex: 1 });
            let mouse = this.mousepos(event);
            if (mouse.inboard) {
                let [from, to, promopiece] = this.getmove(elem, mouse);
                this.state.makemove(from, to, promopiece);
            }
            else {
                this.update();
            }
            this.grabbedelem = null;
        }
        return this;
    }
    //[of]:getmove(elem, mousepos)
    getmove(elem, mousepos) {
        let piece = getpiece(elem);
        let from = piece.index;
        let to = this.getindex(mousepos);
        let promopiece = null;
        {
            let iswhite = piece.iswhite;
            if (piece.type == 'p' && ((iswhite && to < 8) ||
                (!iswhite && to > 55))) {
                promopiece = this.getpromopiece(mousepos);
            }
        }
        return [from, to, promopiece];
    }
    //[of]:getpromopiece(Mousepos)
    /** read the desired promopiece from where the mouse was released */
    getpromopiece(mouse) {
        let x = mouse.x;
        let y = mouse.y;
        let row = this.getrow(mouse);
        let col = this.getcol(mouse);
        let piecesize = this.piecesize;
        let halfpiecesize = this.halfpiecesize;
        let promocolsep = col * piecesize + halfpiecesize;
        let promorowsep = row * piecesize + halfpiecesize;
        let promopiece = (x < promocolsep)
            ? (y < promorowsep)
                ? 'q'
                : 'b'
            : (y < promorowsep)
                ? 'r'
                : 'n';
        if (row === 0) {
            promopiece = promopiece.toUpperCase();
        }
        return promopiece;
    }
    //[cf]
    //[cf]
    //[cf]
    //[of]:adjustpromochooser(pieceelem, Mousepos)
    adjustpromochooser(elem, mouse) {
        let piece = getpiece(elem);
        if (piece.type === 'p') {
            if (mouse.inboard) {
                let to = this.getindex(mouse);
                let iswhite = piece.iswhite;
                let board = this.state.position.board;
                if (iswhite) {
                    if (to < 8 && !(to in board)) {
                        this.showpromo(this.promochooserwhite, to);
                    }
                    else if (to > 7 && to < 16 && !(to - 8 in board)) {
                        this.showpromo(this.promochooserwhite, to - 8);
                    }
                    else if (to > 15) {
                        this.hidepromo();
                    }
                }
                else {
                    if (to > 55 && !(to in board)) {
                        this.showpromo(this.promochooserblack, to);
                    }
                    else if (to > 47 && to < 56 && !(to + 8 in board)) {
                        this.showpromo(this.promochooserblack, to + 8);
                    }
                    else if (to < 48) {
                        this.hidepromo();
                    }
                }
            }
            else {
                this.hidepromo();
            }
        }
        return this;
    }
    //[cf]
    //[of]:showpromo(elem, index)
    /** Show the promotion indicator */
    showpromo(chooser, index) {
        let [x, y] = indexToCoords(index);
        chooser.css({
            top: coordToPercent(y),
            left: coordToPercent(x)
        });
        chooser.show();
        return this;
    }
    //[cf]
    //[of]:hidepromo()
    hidepromo() {
        this.promochooserblack.hide();
        this.promochooserwhite.hide();
        return this;
    }
    //[cf]
    //[of]:reset()
    /** a mouse up in weird locations calls this */
    reset() {
        let elem = this.grabbedelem;
        if (elem) {
            elem.css({ zIndex: 1 });
            this.grabbedelem = null;
            this.promochooserblack.hide();
            this.promochooserwhite.hide();
            this.update();
        }
        return this;
    }
    //[cf]
    //[of]:place(pieceelem, index?)
    /** place a piece according to its index */
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
    //[of]:dropoff(pieceelem)
    /** remove a piece from the board (the piece actually just gets hidden) */
    dropoff(elem) {
        elem.hide();
        return this;
    }
    //[cf]
    //[of]:aligncursor(pieceelem, Mousepos)
    /** align a piece at the cursor */
    aligncursor(elem, mousepos) {
        let halfpiecesize = this.halfpiecesize;
        elem.css({
            zIndex: 1000,
            top: mousepos.y - halfpiecesize,
            left: mousepos.x - halfpiecesize,
        });
        return this;
    }
    //[cf]
    //[of]:mousepos(dragdropevent)
    /** return the mouse position relative to the board. Returns null when
    strict === true and the mouse is not inside the board */
    mousepos(event) {
        let position = this.position;
        let x = event.pageX - position.x;
        let y = event.pageY - position.y;
        let boardsize = this.size;
        let inboard = x > 0 && y > 0 && x < boardsize && y < boardsize;
        return {
            x: x,
            y: y,
            inboard: inboard,
        };
    }
    //[cf]
    //[of]:getindex(Mousepos)
    /** get the board index correlating to this mouse position */
    getindex(mouse) {
        return 8 * this.getrow(mouse) + this.getcol(mouse);
    }
    //[cf]
    //[of]:getrow(Mousepos)
    /** get the row index correlating to this mouse position */
    getrow(mouse) {
        return Math.floor(mouse.y / this.piecesize);
    }
    //[cf]
    //[of]:getcol(Mousepos)
    /** get the column index correlating to this mouse position */
    getcol(mouse) {
        return Math.floor(mouse.x / this.piecesize);
    }
    //[cf]
    //[of]:makepiece(uid)
    /** create the dom element for a piece and append it to the board */
    makepiece(id) {
        let piece = HASH.get(id);
        let piecetype = piece.iswhite ? piece.type.toUpperCase() : piece.type;
        let elem = $(`<chess-piece class="${piecetype}" />`);
        elem.data({ id: id, index: 0 });
        this.pieces[id] = elem;
        this.elem.append(elem);
        return elem;
    }
}
//[c]( Tools
//[of]:getindex(pieceelem)
function getindex(elem) {
    return parseInt(elem.data('index'));
}
//[cf]
//[of]:getid(pieceelem)
function getid(elem) {
    return parseInt(elem.data('id'));
}
//[cf]
//[of]:getpiece(pieceelem)
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
            board[curindex] = makepiece(char, curindex);
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
//[cf]
//[of]:ischessposition()
function ischessposition(object) {
    if ('board' in object) {
        return true;
    }
    return false;
}
//[of]:makepiece()
function makepiece(name, index) {
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
//[cf]
//[of]:ispiece()
function ispiece(object) {
    if ('type' in object && 'id' in object &&
        'index' in object && 'iswhite' in object) {
        return true;
    }
    return false;
}
;
;
//[of]:function ispos()
function ispos(object) {
    if ('x' in object && 'y' in object) {
        return true;
    }
    return false;
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
/** Convert a index to the representation of the square name in algebraic
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
