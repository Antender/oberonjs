var Chars = require("js/Chars.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Errors = require("js/Errors.js");
var Stream = require("js/Stream.js");
var String = require("js/String.js");
var $scope = "Lexer";
var doubleQuote = Chars.doubleQuote;
var commentBegin = "(*";
var commentEnd = "*)";
Literal.prototype.$scope = $scope;

function isDigit(c/*CHAR*/){
	return c >= 48 && c <= 57;
}

function isLetter(c/*CHAR*/){
	return c >= 97 && c <= 122 || c >= 65 && c <= 90;
}

function peekSeparator(stream/*VAR Type*/){
	var result = true;
	if (!Stream.eof(stream)){
		var c = Stream.peekChar(stream);
		if (isLetter(c)){
			result = false;
		}
		else if (c == 46){
			result = Stream.peekStr(stream, "..");
		}
	}
	return result;
}

function integer(stream/*VAR Type*/, cx/*VAR Integer*/){
	var hexDetected = false;
	var dec = 0;var hex = 0;
	
	function collect(c/*CHAR*/){
		var d = -1;
		if (isDigit(c)){
			d = c - 48 | 0;
		}
		else if (c >= 65 && c <= 70){
			d = (c - 65 | 0) + 10 | 0;
			hexDetected = true;
		}
		if (d != -1){
			hex = (hex * 16 | 0) + d | 0;
			if (!hexDetected){
				dec = (dec * 10 | 0) + d | 0;
			}
		}
		return d != -1;
	}
	var result = false;
	if (!Stream.eof(stream) && collect(Stream.getChar(stream)) && !hexDetected){
		while (true){
			if (!Stream.eof(stream) && collect(Stream.peekChar(stream))){
				Stream.next(stream, 1);
			} else break;
		}
		if (!Stream.eof(stream) && Stream.peekChar(stream) == 72){
			hexDetected = true;
			Stream.next(stream, 1);
		}
		else if (hexDetected){
			Errors.raise("integer constant looks like having hexadecimal format but 'H' suffix is missing");
		}
		if (peekSeparator(stream)){
			if (hexDetected){
				cx.handleInt(hex);
			}
			else {
				cx.handleInt(dec);
			}
			result = true;
		}
	}
	return result;
}

function real(stream/*VAR Type*/, cx/*VAR Real*/){
	var c = 0;
	var s = '';
	
	function peekChar(){
		var result = false;
		if (!Stream.eof(stream)){
			c = Stream.peekChar(stream);
			result = true;
		}
		return result;
	}
	
	function getChar(){
		var result = false;
		if (!Stream.eof(stream)){
			c = Stream.getChar(stream);
			result = true;
		}
		return result;
	}
	
	function next(){
		Stream.next(stream, 1);
	}
	
	function collectOptionalDigits(){
		while (true){
			if (peekChar() && isDigit(c)){
				s = s + String.fromChar(c);
				next();
			} else break;
		}
	}
	
	function collectDigits(){
		var result = false;
		if (getChar() && isDigit(c)){
			s = s + String.fromChar(c);
			collectOptionalDigits();
			result = true;
		}
		return result;
	}
	
	function collectScale(){
		
		function collectPlusOrMinus(){
			if (peekChar()){
				if (c == 45){
					s = s + "-";
					next();
				}
				else if (c == 43){
					next();
				}
			}
		}
		var result = true;
		if (peekChar() && c == 69){
			s = s + "E";
			next();
			collectPlusOrMinus();
			result = collectDigits();
		}
		return result;
	}
	var result = false;
	if (collectDigits() && getChar() && c == 46){
		s = s + ".";
		collectOptionalDigits();
		if (collectScale() && peekSeparator(stream)){
			cx.handleReal(String.parseReal(s));
			result = true;
		}
	}
	return result;
}

function isHexDigit(c/*CHAR*/){
	return isDigit(c) || c >= 65 && c <= 70;
}

function point(stream/*VAR Type*/, context/*Node*/){
	var result = false;
	if (!Stream.eof(stream) && Stream.getChar(stream) == 46 && (Stream.eof(stream) || Stream.peekChar(stream) != 46)){
		context.handleLiteral(".");
		result = true;
	}
	return result;
}

function string(stream/*VAR Type*/, cx/*VAR Str*/){
	
	function quotedString(){
		var c = 0;
		var s = '';
		if (!Stream.eof(stream)){
			c = Stream.getChar(stream);
			while (true){
				if (c != 34 && !Stream.eof(stream)){
					if (c != 34){
						s = s + String.fromChar(c);
					}
					c = Stream.getChar(stream);
				} else break;
			}
		}
		else {
			c = 0;
		}
		if (c != 34){
			Errors.raise("unexpected end of string");
		}
		cx.handleStr(s);
	}
	
	function hexString(firstChar/*CHAR*/){
		var result = false;
		var s = String.fromChar(firstChar);
		while (true){
			if (!Stream.eof(stream) && isHexDigit(Stream.peekChar(stream))){
				s = s + String.fromChar(Stream.getChar(stream));
			} else break;
		}
		if (!Stream.eof(stream) && Stream.getChar(stream) == 88){
			cx.handleStr(String.fromChar(String.parseHex(s)));
			result = true;
		}
		return result;
	}
	var result = false;
	if (!Stream.eof(stream)){
		var c = Stream.getChar(stream);
		if (c == 34){
			quotedString();
			result = true;
		}
		else if (isDigit(c)){
			result = hexString(c);
		}
	}
	return result;
}

function ident(stream/*VAR Type*/, context/*Node*/, reservedWords/*ARRAY OF STRING*/){
	var result = false;
	var c = 0;
	var s = '';
	if (!Stream.eof(stream)){
		c = Stream.getChar(stream);
		if (isLetter(c)){
			while (true){
				if (!Stream.eof(stream) && (isLetter(c) || isDigit(c))){
					s = s + String.fromChar(c);
					c = Stream.getChar(stream);
				} else break;
			}
			if (isLetter(c) || isDigit(c)){
				s = s + String.fromChar(c);
			}
			else {
				Stream.next(stream, -1);
			}
			if (reservedWords.indexOf(s) == -1){
				context.handleIdent(s);
				result = true;
			}
		}
	}
	return result;
}

function skipComment(stream/*VAR Type*/, context/*Node*/){
	var result = false;
	if (Stream.peekStr(stream, commentBegin)){
		Stream.next(stream, commentBegin.length);
		while (true){
			if (!Stream.peekStr(stream, commentEnd)){
				if (!skipComment(stream, context)){
					Stream.next(stream, 1);
					if (Stream.eof(stream)){
						Errors.raise("comment was not closed");
					}
				}
			} else break;
		}
		Stream.next(stream, commentEnd.length);
		result = true;
	}
	return result;
}

function readSpaces(c/*CHAR*/){
	return c == 32 || c == 8 || c == 9 || c == 10 || c == 13;
}

function skipSpaces(stream/*VAR Type*/, context/*Node*/){
	while (true){
		if (Stream.read(stream, readSpaces) && skipComment(stream, context)){
		} else break;
	}
}
function Literal(s/*STRING*/){
	this.s = s;
}

function literal(l/*Literal*/, stream/*VAR Type*/, context/*Node*/){
	var result = false;
	if (Stream.peekStr(stream, l.s)){
		Stream.next(stream, l.s.length);
		if (!isLetter(l.s.charCodeAt(l.s.length - 1 | 0)) || Stream.eof(stream) || !isLetter(Stream.peekChar(stream)) && !isDigit(Stream.peekChar(stream))){
			context.handleLiteral(l.s);
			result = true;
		}
	}
	return result;
}
exports.Literal = Literal;
exports.integer = integer;
exports.real = real;
exports.point = point;
exports.string = string;
exports.ident = ident;
exports.skipSpaces = skipSpaces;
exports.literal = literal;
