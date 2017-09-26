var RTL$ = require("eberon/eberon_rtl.js");
var EberonMap = require("js/EberonMap.js");
var EberonString = require("js/EberonString.js");
var Procedure = require("js/Procedure.js");
var Scope = require("js/Scope.js");
var Symbols = require("js/Symbols.js");
var Types = require("js/Types.js");

function lenArgumentCheck(argType/*PType*/){
	return Procedure.lenArgumentCheck(argType) || argType == EberonString.string();
}

function makeStd(){
	var result = Scope.makeStdSymbols();
	var proc = Procedure.makeLen(lenArgumentCheck);
	result[proc.id()] = proc;
	Scope.addSymbolForType(EberonString.string(), result);
	return RTL$.clone(result, {map: null}, undefined);
}
exports.makeStd = makeStd;
