var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var ConstValue = require("js/ConstValue.js");
var Context = require("js/Context.js");
var ContextExpression = require("js/ContextExpression.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var Symbols = require("js/Symbols.js");
var Types = require("js/Types.js");
var $scope = "ContextConst";
function Type(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
	this.id = null;
	this.type = null;
	this.value = null;
}
RTL$.extend(Type, ContextExpression.ExpressionHandler, $scope);
Type.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	this.id = id;
	this.codeGenerator().write("var " + id.id() + " = ");
};
Type.prototype.handleExpression = function(e/*PType*/){
	var value = e.constValue();
	if (value == null){
		Errors.raise("constant expression expected");
	}
	this.type = e.type();
	this.value = value;
};
Type.prototype.endParse = function(){
	var c = new Types.Const(this.type, this.value);
	this.root().currentScope().addSymbol(new Symbols.Symbol(this.id.id(), c), this.id.exported());
	this.codeGenerator().write(";" + Chars.ln);
	return true;
};
exports.Type = Type;
