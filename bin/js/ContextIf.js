var RTL$ = require("eberon/eberon_rtl.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var Types = require("js/Types.js");
var $scope = "ContextIf";
RTL$.extend(Type, ContextExpression.ExpressionHandler, $scope);

function handleIfExpression(e/*PType*/){
	var type = e.type();
	if (type != Types.basic().bool){
		Errors.raise("'BOOLEAN' expression expected, got '" + type.description() + "'");
	}
}
function Type(parent/*PNode*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	this.codeGenerator().write("if (");
}
Type.prototype.handleExpression = function(e/*PType*/){
	handleIfExpression(e);
	var gen = this.codeGenerator();
	gen.write(")");
	gen.openScope();
};
Type.prototype.handleLiteral = function(s/*STRING*/){
	var gen = this.codeGenerator();
	if (s == "ELSIF"){
		gen.closeScope("");
		gen.write("else if (");
	}
	else if (s == "ELSE"){
		gen.closeScope("");
		gen.write("else ");
		gen.openScope();
	}
};
Type.prototype.endParse = function(){
	this.codeGenerator().closeScope("");
	return true;
};
exports.Type = Type;
exports.handleIfExpression = handleIfExpression;
