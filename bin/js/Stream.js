var RTL$ = require("eberon/eberon_rtl.js");
var String = require("js/String.js");
var $scope = "Stream";
var kCR = "\n";
Type.prototype.$scope = $scope;
function Type(text/*STRING*/){
	this.s = text;
	this.pos = 0;
}

function eof(self/*Type*/){
	return self.pos == self.s.length;
}

function pos(self/*Type*/){
	return self.pos;
}

function setPos(self/*VAR Type*/, pos/*INTEGER*/){
	RTL$.assert(pos <= self.s.length);
	self.pos = pos;
}

function next(self/*VAR Type*/, n/*INTEGER*/){
	RTL$.assert((self.pos + n | 0) <= self.s.length);
	self.pos = self.pos + n | 0;
}

function peekChar(self/*Type*/){
	RTL$.assert(!eof(self));
	return self.s.charCodeAt(self.pos);
}

function getChar(self/*VAR Type*/){
	var result = 0;
	RTL$.assert(!eof(self));
	result = self.s.charCodeAt(self.pos);
	++self.pos;
	return result;
}

function peekStr(self/*Type*/, s/*STRING*/){
	var result = false;
	var i = 0;
	if (s.length <= (self.s.length - self.pos | 0)){
		while (true){
			if (i < s.length && s.charCodeAt(i) == self.s.charCodeAt(self.pos + i | 0)){
				++i;
			} else break;
		}
		result = i == s.length;
	}
	return result;
}

function read(self/*VAR Type*/, f/*ReaderProc*/){
	while (true){
		if (!eof(self) && f(peekChar(self))){
			next(self, 1);
		} else break;
	}
	return !eof(self);
}

function lineNumber(self/*Type*/){
	var line = 0;
	var lastPos = 0;
	lastPos = String.indexOf(self.s, 10);
	while (true){
		if (lastPos != -1 && lastPos < self.pos){
			++line;
			lastPos = String.indexOfFrom(self.s, 10, lastPos + 1 | 0);
		} else break;
	}
	return line + 1 | 0;
}

function currentLine(self/*Type*/){
	var from = String.lastIndexOfFrom(self.s, 10, self.pos);
	if (from == -1){
		from = 0;
	}
	else {
		from = from + 1 | 0;
	}
	var to = String.indexOfFrom(self.s, 10, self.pos);
	if (to == -1){
		to = self.s.length;
	}
	return String.substr(self.s, from, to - from | 0);
}
exports.kCR = kCR;
exports.Type = Type;
exports.eof = eof;
exports.pos = pos;
exports.setPos = setPos;
exports.next = next;
exports.peekChar = peekChar;
exports.getChar = getChar;
exports.peekStr = peekStr;
exports.read = read;
exports.lineNumber = lineNumber;
exports.currentLine = currentLine;
