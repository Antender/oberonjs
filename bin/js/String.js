var JS = GLOBAL;

function fromChar(c/*CHAR*/){
	var result = '';
	result = JS.String.fromCharCode(c);
	return result;
}

function fromInt(i/*INTEGER*/){
	var result = '';
	result = '' + i;
	return result;
}

function fromReal(r/*REAL*/){
	var result = '';
	result = '' + r;
	return result;
}

function parseReal(s/*STRING*/){
	var result = 0;
	result = JS.Number(s);
	return result;
}

function parseHex(s/*STRING*/){
	var result = 0;
	result = JS.parseInt(s, 16);
	return result;
}

function indexOf(self/*STRING*/, c/*CHAR*/){
	var result = 0;
	result = self.indexOf(JS.String.fromCharCode(c));
	return result;
}

function indexOfFrom(self/*STRING*/, c/*CHAR*/, pos/*INTEGER*/){
	var result = 0;
	result = self.indexOf(JS.String.fromCharCode(c), pos);
	return result;
}

function lastIndexOfFrom(self/*STRING*/, c/*CHAR*/, pos/*INTEGER*/){
	var result = 0;
	result = self.lastIndexOf(JS.String.fromCharCode(c), pos);
	return result;
}

function substr(self/*STRING*/, pos/*INTEGER*/, len/*INTEGER*/){
	var result = '';
	result = self.substr(pos, len);
	return result;
}

function join(a/*ARRAY OF STRING*/, separator/*STRING*/){
	var result = '';
	result = a.join(separator);
	return result;
}
exports.fromChar = fromChar;
exports.fromInt = fromInt;
exports.fromReal = fromReal;
exports.parseReal = parseReal;
exports.parseHex = parseHex;
exports.indexOf = indexOf;
exports.indexOfFrom = indexOfFrom;
exports.lastIndexOfFrom = lastIndexOfFrom;
exports.substr = substr;
exports.join = join;
