var RTL$ = require("eberon/eberon_rtl.js");
var ContextType = require("js/ContextType.js");
var R = require("js/Record.js");
var ScopeBase = require("js/ScopeBase.js");
var $scope = "OberonContextType";
RTL$.extend(Record, ContextType.Record, $scope);

function recordTypeFactory(name/*STRING*/, cons/*STRING*/, scope/*PType*/){
	return new R.Type(name, cons, scope);
}
function Record(parent/*PDeclaration*/){
	ContextType.Record.call(this, parent, recordTypeFactory);
}
exports.Record = Record;
