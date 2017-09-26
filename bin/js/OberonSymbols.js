var RTL$ = require("eberon/eberon_rtl.js");
var Procedure = require("js/Procedure.js");
var Scope = require("js/Scope.js");
var Symbols = require("js/Symbols.js");

function makeStd(){
	var result = Scope.makeStdSymbols();
	var proc = Procedure.makeLen(Procedure.lenArgumentCheck);
	result[proc.id()] = proc;
	return RTL$.clone(result, {map: null}, undefined);
}
exports.makeStd = makeStd;
