var RTL$ = require("eberon/eberon_rtl.js");
var ContextCase = require("js/ContextCase.js");
var EberonScope = require("js/EberonScope.js");
var $scope = "EberonContextCase";
function Label(){
	ContextCase.Label.apply(this, arguments);
}
RTL$.extend(Label, ContextCase.Label, $scope);
Label.prototype.handleLiteral = function(s/*STRING*/){
	if (s == ":"){
		EberonScope.startOperatorScope(this);
	}
};
Label.prototype.endParse = function(){
	EberonScope.endOperatorScope(this);
	return ContextCase.Label.prototype.endParse.call(this);
};
exports.Label = Label;
