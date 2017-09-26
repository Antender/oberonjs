var RTL$ = require("eberon/eberon_rtl.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var EberonContextDesignator = require("js/EberonContextDesignator.js");
var EberonContextExpression = require("js/EberonContextExpression.js");
var EberonContextLoop = require("js/EberonContextLoop.js");
var EberonRecord = require("js/EberonRecord.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var Symbols = require("js/Symbols.js");
var Types = require("js/Types.js");
var $scope = "EberonContextInPlace";
function VariableInit(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
	this.id = '';
	this.code = '';
	this.symbol = null;
}
RTL$.extend(VariableInit, ContextExpression.ExpressionHandler, $scope);
function VariableInitFor(){
	VariableInit.apply(this, arguments);
}
RTL$.extend(VariableInitFor, VariableInit, $scope);
VariableInit.prototype.codeGenerator = function(){
	return CodeGenerator.nullGenerator();
};
VariableInit.prototype.handleIdent = function(id/*STRING*/){
	this.id = id;
};
VariableInit.prototype.handleLiteral = function(s/*STRING*/){
	this.code = "var " + CodeGenerator.mangleId(this.id) + " = ";
};
VariableInit.prototype.handleExpression = function(e/*PType*/){
	var resultType = null;
	this.code = this.code + EberonContextExpression.initFromRValue(this, e, "variable '" + this.id + "'", {set: function($v){resultType = $v;}, get: function(){return resultType;}});
	var v = new EberonContextDesignator.TypeNarrowVariable(resultType, false, false, this.id);
	this.symbol = new Symbols.Symbol(this.id, v);
};
VariableInit.prototype.onParsed = function(){
	this.parent().codeGenerator().write(this.code);
};
VariableInit.prototype.endParse = function(){
	var result = false;
	if (this.symbol != null){
		this.root().currentScope().addSymbol(this.symbol, false);
		this.onParsed();
		result = true;
	}
	return result;
};
VariableInitFor.prototype.onParsed = function(){
	RTL$.typeGuard(this.parent(), EberonContextLoop.For).handleInPlaceInit(this.symbol, this.code);
};
exports.VariableInit = VariableInit;
exports.VariableInitFor = VariableInitFor;
