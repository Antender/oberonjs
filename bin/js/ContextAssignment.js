var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Errors = require("js/Errors.js");
var $scope = "ContextAssignment";
function Check(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(Check, ContextHierarchy.Node, $scope);
Check.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "="){
		Errors.raise("did you mean ':=' (statement expected, got expression)?");
	}
};

function emitEnd(cx/*Node*/){
	cx.codeGenerator().write(";" + Chars.ln);
}
exports.Check = Check;
exports.emitEnd = emitEnd;
