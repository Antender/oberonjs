var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ConstValue = require("js/ConstValue.js");
var Context = require("js/Context.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextIf = require("js/ContextIf.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var Operator = require("js/Operator.js");
var String = require("js/String.js");
var Types = require("js/Types.js");
var $scope = "ContextLoop";
RTL$.extend(While, ContextExpression.ExpressionHandler, $scope);
RTL$.extend(Repeat, ContextHierarchy.Node, $scope);
RTL$.extend(Until, ContextExpression.ExpressionHandler, $scope);
RTL$.extend(For, ContextExpression.ExpressionHandler, $scope);
function While(parent/*PNode*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	var gen = this.codeGenerator();
	gen.write("while (true)");
	gen.openScope();
	gen.write("if (");
}
While.prototype.handleExpression = function(e/*PType*/){
	ContextIf.handleIfExpression(e);
	var gen = this.codeGenerator();
	gen.write(")");
	gen.openScope();
};
While.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "ELSIF"){
		var gen = this.codeGenerator();
		gen.closeScope("");
		gen.write("else if (");
	}
};
While.prototype.endParse = function(){
	var gen = this.codeGenerator();
	gen.closeScope(" else break;" + Chars.ln);
	gen.closeScope("");
	return true;
};
function Repeat(parent/*PNode*/){
	ContextHierarchy.Node.call(this, parent);
	var gen = this.codeGenerator();
	gen.write("do ");
	gen.openScope();
}
function Until(parent/*PNode*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	parent.codeGenerator().closeScope(" while (");
}
Until.prototype.codeGenerator = function(){
	return CodeGenerator.nullGenerator();
};
Until.prototype.handleExpression = function(e/*PType*/){
	ContextIf.handleIfExpression(e);
	this.parent().codeGenerator().write(Operator.not(e).code());
};
Until.prototype.endParse = function(){
	this.parent().codeGenerator().write(");" + Chars.ln);
	return true;
};
function For(parent/*PNode*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	this.toExpr = new CodeGenerator.SimpleGenerator();
	this.var = '';
	this.initExprParsed = false;
	this.toParsed = false;
	this.byParsed = false;
	this.by = 1;
}
For.prototype.handleIdent = function(id/*STRING*/){
	var s = ContextHierarchy.getSymbol(this.root(), id);
	var info = s.info();
	if (!(info instanceof Types.Variable)){
		Errors.raise("'" + s.id() + "' is not a variable");
	}
	else {
		var type = info.type();
		if (type != Types.basic().integer){
			Errors.raise("'" + s.id() + "' is a '" + type.description() + "' variable, 'FOR' control variable must be 'INTEGER'");
		}
		this.doHandleInitCode(id, "for (" + id + " = ");
	}
};
For.prototype.doHandleInitCode = function(id/*STRING*/, code/*STRING*/){
	this.var = id;
	this.codeGenerator().write(code);
};
For.prototype.doHandleInitExpression = function(type/*PType*/){
	if (type != Types.basic().integer){
		Errors.raise("'INTEGER' expression expected to assign '" + this.var + "', got '" + type.description() + "'");
	}
	this.initExprParsed = true;
};
For.prototype.handleExpression = function(e/*PType*/){
	var type = e.type();
	if (!this.initExprParsed){
		this.doHandleInitExpression(type);
	}
	else if (!this.toParsed){
		if (type != Types.basic().integer){
			Errors.raise("'INTEGER' expression expected as 'TO' parameter, got '" + type.description() + "'");
		}
		this.toParsed = true;
	}
	else {
		if (type != Types.basic().integer){
			Errors.raise("'INTEGER' expression expected as 'BY' parameter, got '" + type.description() + "'");
		}
		var value = e.constValue();
		if (value == null){
			Errors.raise("constant expression expected as 'BY' parameter");
		}
		this.by = RTL$.typeGuard(value, ConstValue.Int).value;
	}
};
For.prototype.codeGenerator = function(){
	var result = null;
	if (this.initExprParsed && !this.toParsed){
		result = this.toExpr;
	}
	else if (this.toParsed && !this.byParsed){
		result = CodeGenerator.nullGenerator();
	}
	else {
		result = this.parent().codeGenerator();
	}
	return result;
};
For.prototype.endParse = function(){
	this.codeGenerator().closeScope("");
	return true;
};

function emitForBegin(cx/*VAR For*/){
	var relation = '';var step = '';
	cx.byParsed = true;
	if (cx.by < 0){
		relation = " >= ";
	}
	else {
		relation = " <= ";
	}
	if (cx.by == 1){
		step = "++" + cx.var;
	}
	else if (cx.by == -1){
		step = "--" + cx.var;
	}
	else if (cx.by < 0){
		step = cx.var + " -= " + String.fromInt(-cx.by | 0);
	}
	else {
		step = cx.var + " += " + String.fromInt(cx.by);
	}
	var s = "; " + cx.var + relation + cx.toExpr.result() + "; " + step + ")";
	var gen = cx.codeGenerator();
	gen.write(s);
	gen.openScope();
}
exports.While = While;
exports.Repeat = Repeat;
exports.Until = Until;
exports.For = For;
exports.emitForBegin = emitForBegin;
