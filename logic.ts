/* Tool to analyse chess positions */

//[of]:HASH
/** Memory to save things and later access them again */
let HASH = new class {

    private entries:{ [ key:number ]:Piece } = { };
    private id:uid = 0;

    public add( thing:Piece ):uid {
        this.entries[++this.id] = thing;
        return this.id;
    }

    public get( id:uid ): Piece {
        return this.entries[id];
    }

};
//[cf]

//[c]( MVC
//[of]:State
/** The Application state. */
class State {

    public observers:Set<Observer> = new Set();
    public position:Chessposition;

    //[of]:constructor()
    constructor(){
        this.position = positionFromFen(STARTFEN);
    }
    //[cf]
    //[of]:start()
    public start() {
        this.notifyObservers();
    }
    //[cf]
    //[of]:reset()
    public reset() {
        this.position = positionFromFen(STARTFEN);
        this.notifyObservers();
    }
    //[cf]
    //[of]:makemove()
    public makemove(from: index, to: index, promopiece:promopiece) {
    
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
            (
                (
                    from == 60 && (to == 62 || to == 63)
                ) ||
                (from == 63 && to == 60) 
            ) &&
            !(61 in board) && !(62 in board)
        ) {
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
            (
                (
                    from == 60 && (to > 55 && to < 59)
                ) ||
                (from == 56 && to == 60)
            ) &&
            !(57 in board) && !(58 in board) && !(59 in board)
        ) {
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
            (
                (
                    from == 4 && (to == 6 || to == 7)
                ) ||
                (from == 7 && to == 4) 
            ) &&
            !(5 in board) && !(6 in board)
        ) {
        
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
            (
                (
                    from == 4 && (to > -1 && to < 3)
                ) ||
                (from == 0 && to == 4) 
            ) &&
            !(1 in board) && !(2 in board) && !(3 in board)
        ) {
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
        if (
            !movemade && enpassant && !toid && frompiece.type=='p' && to==enpassant &&
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
            this.movepiece(from, to);
        
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
            !movemade && !toid && frompiece.type=='p' && frompiece.iswhite &&
            from > 47 && from < 56 && to==from-16
        ) {
            this.movepiece(from, to);
            movemade = true;
            newenpassant = from-8;
            if (whitetomove) {
                waslegalmove = true;
            }
        }
        //[cf]
        //[of]:black pawn moves two squares from start position
        if (
            !movemade && !toid && frompiece.type=='p' && !frompiece.iswhite &&
            from > 7 && from < 16 && to==from+16
        ) {
            this.movepiece(from, to);
            movemade = true;
            newenpassant = from+8;
            if (!whitetomove) {
                waslegalmove = true;
            }
        }
        //[cf]
        //[of]:pawn promotion
        if (!movemade && promopiece) {
            if (!(to in board)) {
                board[to] = makepiece(promopiece as fenpiece, to);
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
        } else if (newenpassant) {
            position.enpassant = newenpassant;
        }
    
        this.notifyObservers();
    }
    
    //[cf]
    //[of]:movepiece()
    private movepiece( from:index, to:index) {
        let board = this.position.board;
        let fromid = board[from];
        HASH.get(fromid).index = to;
        board[to] = fromid;
        delete board[from];
    }
    //[cf]

    //[of]:notifyObservers()
    /** called internally when changes to the State were made */
    private notifyObservers() {
        for (let observer of this.observers) {
            observer.update();
        }
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

    private pieces:{ [ id:number ]:pieceelem } = { };
    private elem:boardelem;
    private grabbedelem:pieceelem|null = null;
    private promochooserwhite:elem;
    private promochooserblack:elem;
    private position!: Pos;
    private size!: pixels;
    private piecesize!: pixels;
    private halfpiecesize!: pixels;

    //[of]:constructor()
    constructor ( boardid:elemid, state:State ) {
        super(state);
    
        let elem = this.elem = $(boardid);
        this.updateDimensions();
    
        this.promochooserwhite = $('promo-chooser-white', elem);
        this.promochooserblack = $('promo-chooser-black', elem);
    
    //[c]    Todo: Implement 'drop off piece' functionality
        let self = this;
        //[of]:board  mouse down handler
        elem.on('mousedown', 'chess-piece', function( event:mousedownevent ) {
            self.grab($(this), event);
            return handled(event);
        });
        //[cf]
        //[of]:board  mouse up handler
        elem.on('mouseup', function( event:mouseupevent ) {
            if (self.grabbedelem) {
                self.release(event);
            }
            return handled(event);
        });
        //[cf]
        //[of]:body   mouse move handler
        $('body').on('mousemove', function( event:mousemoveevent ) {
            if (self.grabbedelem) {
                self.drag(event);
            }
            return handled(event);
        });
        
        
        //[cf]
        //[of]:body   mouse leave handler
        $('body').on('mouseleave', function() {
            if (self.grabbedelem) {
                self.grabbedelem.hide();
            }
        });
        //[cf]
        //[of]:body   mouse enter handler
        $('body').on('mouseenter', function() {
            if (self.grabbedelem) {
                self.grabbedelem.show();
            }
        });
        //[cf]
        //[of]:window mouse up handler
        $(window).on('mouseup', function( event:mouseupevent ) {
            if (self.grabbedelem) {
                self.grabbedelem.show();
            }
            self.reset();
            return handled(event);
        });
        //[cf]
        //[of]:window rezise handler
        $(window).on('resize', function() {
            self.updateDimensions();
        });
        //[cf]
    }
    //[cf]
    //[of]:update()
    public update() {
    
        let board = this.state.position.board;
        let pieces = this.pieces;
    
        //[of]:create new pieces, append them to the board
        let f = null;
        
        for (const id of values(board)) {
            if (!(id in pieces)) {
                let elem = this.makeelem(id);
                if (!f) { f = document.createDocumentFragment(); }
                elem.appendTo(f);
            }
        }
        
        if (f) {
            this.elem.append(f);
        }
        //[cf]
        //[of]:place the pieces
        for (const id of values(board)) {
            let elem = pieces[id];
            this.place(elem);
        }
        //[cf]
        //[of]:drop non existing pieces off the board
        for (const elem of values(pieces)) {
            let index = getindex(elem);
            if (!(index in board) || getid(elem)!==board[index]) {
                this.dropoff(elem);
            }
        }
        //[cf]
    
    }
    //[cf]
    //[of]:updateDimensions()
    /** read out the board size and piece size on document load and -resize */
    
    private updateDimensions() {
        {
            let offset = this.elem.offset();
            let x = offset ? offset.left : 0;
            let y = offset ? offset.top : 0;
            this.position = {x:x, y:y};
        }
        
        let size = this.elem.width();
        if (!size) {
            throw new Error('could not detect board size');
        } else {
            size = this.size = Math.round(size);
            let piecesize = this.piecesize = Math.round(size / 8);
            this.halfpiecesize = Math.round(piecesize / 2);
        }
    }
    //[cf]

    //[of]:grab(pieceelem, mousedownevent)
    /** grab a piece on the board */
    
    private grab( elem:pieceelem, event:mousedownevent ) {
        this.grabbedelem = elem;
        
        // So that the element later gets adjusted in the `place` function.
        elem.data('index', -2);
    
        let mousepos = this.mousepos(event);
        this.aligncursor(elem, mousepos);
        this.adjustpromochooser(elem, mousepos);
    }
    
    //[cf]
    //[of]:drag(mousemoveevent)
    /** drag a grabbed piece */
    
    private drag( event:mousemoveevent ) {
        let elem = this.grabbedelem;
        if (elem) {
            let mousepos = this.mousepos(event);
            this.aligncursor(elem, mousepos);
            this.adjustpromochooser(elem, mousepos);
        }
    }
    //[cf]
    //[of]:release(mouseupevent)
    /** release a grabbed piece */
    
    private release( event:mouseupevent ) {
        let elem = this.grabbedelem;
        this.grabbedelem = null;
        if (elem) {
            this.hidepromo();
            elem.css({ zIndex: 1 });
            let mouse = this.mousepos(event);
            if (mouse.inboard) {
                let [from, to, promopiece] = this.getmove(elem, mouse);
    //[c]            ~ setTimeout(()=>{
                    this.state.makemove( from, to, promopiece );
    //[c]            ~ },0);
            } else {
                this.update();
            }
        }
    }
    
    //[of]:getmove(elem, mousepos)
    private getmove( elem:pieceelem, mousepos:Mousepos ):[index, index, promopiece] {
        let piece = getpiece(elem);
    
        let from = piece.index;
        let to = this.getindex(mousepos);
    
        let promopiece:promopiece = null;
        {
            let iswhite = piece.iswhite;
            if (
                piece.type=='p' && (
                    (iswhite && to<8 ) ||
                    (!iswhite && to>55)
                )
            ) {
                promopiece = this.getpromopiece(mousepos);
            }
        }
        return [from, to, promopiece];
    }
    
    //[of]:getpromopiece(Mousepos)
    /** read the desired promopiece from where the mouse was released */
    
    private getpromopiece( mouse:Mousepos ):promopiece {
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
                : 'n'
        ;
        if (row === 0) {
            promopiece = promopiece.toUpperCase();
        }
        return promopiece as promopiece;
    }
    //[cf]
    //[cf]
    //[cf]

    //[of]:adjustpromochooser(pieceelem, Mousepos)
    private adjustpromochooser(elem:pieceelem, mouse:Mousepos) {
        let piece = getpiece(elem);
        if (piece.type === 'p') {
            if (mouse.inboard) {
                let to = this.getindex(mouse);
                let iswhite = piece.iswhite;
                let board = this.state.position.board;
        
                if ( iswhite ) {
                    if ( to<8 && !(to in board) ) {
                        this.showpromo(this.promochooserwhite, to);
                    } else if ( to>7 && to<16 && !(to-8 in board) ) {
                        this.showpromo(this.promochooserwhite, to-8);
                    } else if (to>15) {
                        this.hidepromo();
                    }
                } else {
                    if ( to>55 && !(to in board) ) {
                        this.showpromo(this.promochooserblack, to);
                    } else if ( to>47 && to<56 && !(to+8 in board) ) {
                        this.showpromo(this.promochooserblack, to+8);
                    } else if (to<48) {
                        this.hidepromo();
                    }
                }
            } else {
                this.hidepromo();
            }
        }
    }
    //[cf]
    //[of]:showpromo(elem, index)
    /** Show the promotion indicator */
    
    private showpromo(chooser:elem, index:index) {
        let [x,y] = indexToCoords(index);
        chooser.css({
            top:coordToPercent(y),
            left:coordToPercent(x)
        });
        chooser.show();
    }
    //[cf]
    //[of]:hidepromo()
    private hidepromo() {
        this.promochooserblack.hide();
        this.promochooserwhite.hide();
    }
    //[cf]

    //[of]:reset()
    /** a mouse up in weird locations calls this */
    
    private reset() {
        let elem = this.grabbedelem;
        if (elem) {
            elem.css({ zIndex: 1 });
            this.grabbedelem = null;
            this.promochooserblack.hide();
            this.promochooserwhite.hide();
            this.update();
        }
    }
    
    //[cf]
    //[of]:place(pieceelem, index?)
    /** place a piece dom element on the board according to the index of its
    related Piece read from the hash. */
    
    private place( elem:pieceelem ) {
        let to = getpiece(elem).index;
        let from = getindex(elem);
        if (from !== to) {
            let [x,y] = indexToCoords(to);
            if (from === -1) { // -1 means, the element was newly created.
                elem.css({
                    top: coordToPercent(y),
                    left: coordToPercent(x)
                });
            } else {
                elem.animate({
                    top: coordToPercent(y),
                    left: coordToPercent(x)
                }, 100);
            }
            elem.data('index', to);
        }
    }
    //[cf]
    //[of]:dropoff(pieceelem)
    /** remove a piece from the board (the piece actually just gets hidden) */
    
    private dropoff( elem:pieceelem ) {
        elem.hide();
    }
    //[cf]

    //[of]:aligncursor(pieceelem, Mousepos)
    /** align a piece at the cursor */
    
    private aligncursor( elem:pieceelem, mousepos:Mousepos ) {
        let halfpiecesize = this.halfpiecesize;
        elem.css({
            zIndex: 1000,
            top: mousepos.y - halfpiecesize,
            left: mousepos.x - halfpiecesize,
        });
    }
    //[cf]
    //[of]:mousepos(dragdropevent)
    /** return the mouse position relative to the board. Returns null when
    strict === true and the mouse is not inside the board */
    
    private mousepos( event:dragdropevent ):Mousepos {
        let position = this.position;
        let x = event.pageX - position.x;
        let y = event.pageY - position.y;
        let boardsize = this.size;
        let inboard = x>0 && y>0 && x<boardsize && y<boardsize;
        return {
            x: x,
            y: y,
            inboard: inboard,
        };
    }
    //[cf]
    //[of]:getindex(Mousepos)
    /** get the board index correlating to this mouse position */
    
    private getindex(mouse:Mousepos):index {
        return 8 * this.getrow(mouse) + this.getcol(mouse);
    }
    //[cf]
    //[of]:getrow(Mousepos)
    /** get the row index correlating to this mouse position */
    
    private getrow( mouse:Mousepos ):row {
        return Math.floor(mouse.y / this.piecesize);
    }
    //[cf]
    //[of]:getcol(Mousepos)
    /** get the column index correlating to this mouse position */
    
    private getcol( mouse:Mousepos ):col {
        return Math.floor(mouse.x / this.piecesize);
    }
    //[cf]
    //[of]:makeelem(uid)
    /** create the dom element for a piece and add it to <Board>.pieces. Return the
    element (It wont get appended to the boards dom element). */
    
    private makeelem( id:uid ):pieceelem {
        let piece = HASH.get(id);
        let piecetype = piece.iswhite ? piece.type.toUpperCase() : piece.type;
        let elem = $(`<chess-piece class="${piecetype}" />`);
        elem.data({ id: id, index: -1 });
        this.pieces[id] = elem;
        return elem;
    }
    //[cf]
}

//[c]( Tools
//[of]:getindex(pieceelem)
function getindex( elem:pieceelem ):index {
    return parseInt(elem.data('index'));
}
//[cf]
//[of]:getid(pieceelem)
function getid( elem:pieceelem ):uid {
    return parseInt(elem.data('id'));
}
//[cf]
//[of]:getpiece(pieceelem)
function getpiece( elem:pieceelem ):Piece {
    return HASH.get( getid(elem) );
}
//[cf]
//[c])
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
/** The abstract chess position representation, saved in <State>.position */
interface Chessposition {
    board:chessboard,
    whitetomove:boolean,
    castling:{
        whiteshort:boolean,
        whitelong:boolean,
        blackshort:boolean,
        blacklong:boolean
    },
    enpassant:index|null
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
            board[curindex] = makepiece(char as fenpiece, curindex);
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
//[of]:ischessposition()
function ischessposition(object:any): object is Chessposition {
    if ('board' in object) {
        return true;
    }
    return false;
}
//[cf]
//[cf]
//[of]:Piece
/** the abstract piece representation. This is what `HASH.get(<uid>)` returns. */
interface Piece {
    type: piecetype,
    id: uid,
    index: index,
    iswhite: boolean
}

//[of]:makepiece()
function makepiece( name:fenpiece, index:index ) : uid {
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
//[of]:ispiece()
function ispiece(object:any): object is Piece {
    if (
        'type' in object && 'id' in object &&
        'index' in object && 'iswhite' in object
    ) {
        return true;
    }
    return false;
}
//[cf]
//[cf]
//[of]:Pos
interface Pos { x:pixels, y:pixels };
interface Mousepos { x:pixels, y:pixels, inboard:boolean };

//[of]:function ispos()
function ispos(object:any): object is Pos|Mousepos {
    if ('x' in object && 'y' in object) {
        return true;
    }
    return false;
}
//[cf]
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

//[c]( Misc Tools
//[of]:indexToCoords()
function indexToCoords( index:index ):[ col, row ] {
    let x = index % 8;
    return [ x, (index-x)/8 ];
}
//[cf]
//[of]:coordsToIndex()
function coordsToIndex( x:col, y:row ):index {
    return y * 8 + x;
}
//[cf]
//[of]:coordToPercent()
function coordToPercent( coord:col|row ):string {
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
/** Convert a index to the representation of the square name in algebraic
chess notation. Eg `0` becomes `'a8'`, `63` becomes `'h1'`. */
function squarename( index:index|null ):string|null {
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
/** A chess position encoded in Forsyth-Edwards notation. E.g.
'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' for the starting
position in chess games. */
type fen = string;
//[cf]
//[of]:fenpiece
/** Short piece names used in FENs. Big letters are white pieces */
type fenpiece = 'K'|'Q'|'R'|'B'|'N'|'P'|'k'|'q'|'r'|'b'|'n'|'p';
//[cf]
//[of]:promopiece
/** the possible target pieces when promoting a pawn, in algebraic notation */
type promopiece = 'Q'|'R'|'B'|'N'|'q'|'r'|'b'|'n'|null;
//[cf]
//[of]:piecetype
/** Short names for king, queen, rook, bishop, knight, pawn. */
type piecetype = 'k'|'q'|'r'|'b'|'n'|'p';
//[cf]
//[of]:chessboard
/** The internal chessboard representation. Its keys are the indices of squares
occupied by pieces. Its values are the uids of those pieces. `HASH.get(<uid>)`
then returns the abstract representation of the piece (not its dom element).
`<Board>.pieces[<uid>]` returns the dom element of the piece on the board.*/
type chessboard = { [ index:number ]:uid };
//[cf]
//[of]:index
/** The unit denoting the index of a square in the internal chessboard
representation. 0 to 63. Equivalent to `row * 8 + col`. 0 is 'a8' in
algebraic chess notation. This is the top left square, when white is on bottom.
63 is 'h1', the bottom right square. */
type index = int;
//[cf]
//[of]:col
/** Horizontal index on an abstract chessboard. 0 to 7. Would be 'a' to 'h' in
algebraic chess notation. */
type col = int;
//[cf]
//[of]:row
/** Vertical index on an abstract chessboard. 0 to 7. Would be '8' to '1' in
algebraic chess notation. */
type row = int;
//[cf]
//[of]:uid
/** An autogenerated unique positive integer pointing to a piece (see the Piece
interface). The pieces are saved in a hash, because pieces can be taken from the
board (e.g. when a piece takes another piece) and they can be added back to the
board (e.g. when navigating back to a previous position). This allows smooth
animations of piece movements. Both the Piece interface and the jQuery dom
element for that piece on the board have a reference to the uid (`<Piece>.id` and
`<domelem>.data('id')`). To get the Piece for a specific uid do `HASH.get(<uid>)`.
To get the dom element do `<Board instance>.pieces[<uid>]` */
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
    $('#please-enable-javascript').remove();
    let state = new State();
    new Board('#board', state);
//[c]    ~ new ChessNotation('#notation', state);
//[c]    ~ new ChessToolbar('#toolbar', state);
    state.start();
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
