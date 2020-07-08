"use strict";

// generate uids
function uid() {
    let u = 0;
    return function () {
        return ++u;
    }
}
uid = uid();

class Model {
    observers = new Set();
    pieces = null;

    constructor() {
        this.pieces = {
            0: 'br', 1: 'bn', 2: 'bb', 3: 'bq', 4: 'bk', 5: 'bb', 6: 'bn', 7: 'br',
            8: 'bp', 9: 'bp', 10: 'bp', 11: 'bp', 12: 'bp', 13: 'bp', 14: 'bp', 15: 'bp',
            48: 'wp', 49: 'wp', 50: 'wp', 51: 'wp', 52: 'wp', 53: 'wp', 54: 'wp', 55: 'wp',
            56: 'wr', 57: 'wn', 58: 'wb', 59: 'wq', 60: 'wk', 61: 'wb', 62: 'wn', 63: 'wr',
        }
    }

    notifyObservers() {
        for (let observer of this.observers) {
            observer.update();
        }
    }
}

class Piece {
    name = null;
    x = null;
    y = null;

    constructor(name, x, y) {
        this.name = name;
        this.x = x;
        this.y = y;
    }
}

class Observer {
    constructor(model) {
        this.model = model;
        model.observers.add(this);
    }
    update() {
        throw Error('Not Implemented');
        // console.log('Hi vom Observer ' + uid());
    }
}

class Coordinates {
    x = null;
    y = null;
    static pieceSize = null;
    static halfPieceSize = null;

    constructor(board) {
        this.pieceSize = board.pieceSize;
        let width = elem.width();
        this.pieceSize = Math.round(width / 8);
        this.halfPieceSize = Math.round(width / 16);
    }
    
    static mouseX(event) {
        return event.pageX - event.delegateTarget.offsetLeft;
    } 
    static mouseY(event) {
        return event.pageY - event.delegateTarget.offsetTop;
    } 
    
    set pos(pos) {
        this.x = pos % 8;
        this.y = (pos - this.x) / 8;
    }

    get pos() {
        return this.y * 8 + this.x;
    }

    get xPercent() {
        return (this.x * 12.5) + '%';
    }

    get yPercent() {
        return (this.y * 12.5) + '%';
    }

    fromEvent(event) {
        let pieceSize = this.pieceSize;
        this.x = Math.floor(this.mouseX(event) / pieceSize);
        this.y = Math.floor(this.mouseY(event) / pieceSize);
    }
}

class Board extends Observer {
    elem = null;
    pieces = {};
    pieceSize = null; // used for calculating the normalized indices of a square
    halfPieceSize = null; // used for posititioning the element at the cursor
    selectedPiece = null;

    _coordinatesFromPos(pos) {
        let x = pos % 8;
        return [x, (pos-x)/8];
    }
    _mouseCordinates(event) {
        return [
            event.pageX - event.delegateTarget.offsetLeft,
            event.pageY - event.delegateTarget.offsetTop
        ];
    }
    _percentageCoordinates(event) {
        let [mousePosX, mousePosY] = this._mouseCordinates(event);
        let pieceSize = this.pieceSize;
        return [
            (Math.floor(mousePosX / pieceSize) * 12.5) + '%',
            (Math.floor(mousePosY / pieceSize) * 12.5) + '%'
        ];
    }

    constructor(elemId, model) {
        super(model);
        let self = this;
        {
            let elem = $(elemId);
            let width = elem.width();
            this.elem = elem;
            this.pieceSize = Math.round(width / 8);
            this.halfPieceSize = Math.round(width / 16);
        }

        this.elem.on('mousedown', 'chess-piece', function(event){
            self.selectedPiece = this;

            let [mousePosX, mousePosY] = self._mouseCordinates(event);
            let halfPieceSize = self.halfPieceSize;
            $(this).css({
                top: mousePosY - halfPieceSize,
                left: mousePosX - halfPieceSize
            });
            $(this).css({
                top: Coordinates.dragX(event),
                left: Coordinates.dragY(event)
            });
            event.stopPropagation()
        });
        this.elem.on('mouseup', function(event){
            let [piecePosX, piecePosY] = self._percentageCoordinates(event);
            $(self.selectedPiece).css({
                top: piecePosY,
                left: piecePosX
            });
            self.selectedPiece = null;
            event.stopPropagation()
        });
        this.elem.on('mousemove', function(event){
            let piece = self.selectedPiece;
            if (piece) {
                let [mousePosX, mousePosY] = self._mouseCordinates(event);
                let halfPieceSize = self.halfPieceSize;
                piece.style.top = (mousePosY - halfPieceSize) + 'px';
                piece.style.left = (mousePosX - halfPieceSize) + 'px';
                event.stopPropagation()
            }
        });
    }

    update() {
        let model_pieces = this.model.pieces;
        let self_pieces = this.pieces;

        // remove unused pieces from self_pieces
        for (let [pos,piece] of Object.entries(self_pieces)) {
            if (model_pieces[pos] !== piece.name) {
                delete self_pieces[pos];
                piece.remove();
            }
        }

        // add new pieces to self_pieces
        for (let [pos,name] of Object.entries(model_pieces)) {
            if (self_pieces[pos] === undefined) {
                let piece = $(`<chess-piece class="${name}" />`);
                piece.data({'name':name,'pos':pos});
                self_pieces[pos] = piece;
                this.elem.append(piece);
                let [x,y] = this._coordinatesFromPos(pos);
                piece.css({
                    top:`${y * 12.5}%`,
                    left:`${x * 12.5}%`,
                });
            }
        }
    }
}

window.onload = function () {
    $('#please-enable-js-message').remove();

    let m = new Model;
    new Board('#board', m);

    m.notifyObservers();
}
