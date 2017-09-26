var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ConstValue = require("js/ConstValue.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Designator = require("js/Designator.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var ExpressionTree = require("js/ExpressionTree.js");
var Record = require("js/Record.js");
var Scope = require("js/Scope.js");
var String = require("js/String.js");
var Symbols = require("js/Symbols.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "ContextCase";
RTL$.extend(Type, ContextExpression.ExpressionHandler, $scope);
function Label(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(Label, ContextHierarchy.Node, $scope);
function LabelList(){
	ContextHierarchy.Node.apply(this, arguments);
	this.glue = '';
}
RTL$.extend(LabelList, ContextHierarchy.Node, $scope);
function Range(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
	this.from = null;
	this.to = null;
	this.typeGuardHandled = false;
}
RTL$.extend(Range, ContextExpression.ExpressionHandler, $scope);
RTL$.extend(GuardedVariable, Types.DeclaredVariable, $scope);
function Type(parent/*PNode*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	this.mCodeGenerator = CodeGenerator.nullGenerator();
	this.var = '';
	this.type = null;
	this.guardVar = null;
	this.typeTest = null;
	this.firstCaseParsed = false;
}
Type.prototype.codeGenerator = function(){
	return this.mCodeGenerator;
};
Type.prototype.handleExpression = function(e/*PType*/){
	var c = 0;
	var declVar = null;
	var normExp = e;
	var type = e.type();
	if (type instanceof Types.String && Types.stringAsChar(type, {set: function($v){c = $v;}, get: function(){return c;}})){
		normExp = Expression.makeSimple(String.fromInt(c), Types.basic().ch);
	}
	else {
		var info = e.info();
		if (info instanceof Types.DeclaredVariable){
			declVar = info;
			if (!info.isReference()){
				this.var = declVar.id();
			}
		}
		if (type instanceof Types.Record || type instanceof Record.Pointer){
			var isReference = info instanceof Types.Variable && info.isReference();
			if (type instanceof Types.Record && !isReference){
				Errors.raise("only records passed as VAR argument can be used to test type in CASE");
			}
			else if (!(type instanceof Record.Pointer) || !isReference){
				this.guardVar = declVar;
			}
			this.typeTest = e;
		}
		else if (!Types.isInt(type) && type != Types.basic().ch){
			Errors.raise("'RECORD' or 'POINTER' or " + Types.intsDescription() + " or 'CHAR' expected as CASE expression");
		}
	}
	this.type = normExp.type();
	this.mCodeGenerator = this.parent().codeGenerator();
	if (this.var.length == 0){
		this.var = this.root().currentScope().generateTempVar("case");
		this.mCodeGenerator.write("var " + this.var + " = " + Expression.deref(normExp).code() + ";" + Chars.ln);
		if (this.typeTest != null){
			this.typeTest = Expression.makeSimple(this.var, type);
		}
	}
};
Type.prototype.beginCase = function(){
	if (!this.firstCaseParsed){
		this.firstCaseParsed = true;
	}
	else {
		this.codeGenerator().write("else ");
	}
};
Type.prototype.handleLabelType = function(type/*PType*/){
	if (!Cast.areTypesMatch(type, this.type)){
		Errors.raise("label must be '" + this.type.description() + "' (the same as case expression), got '" + type.description() + "'");
	}
};
LabelList.prototype.handleRange = function(from/*PInt*/, to/*PInt*/){
	var cond = '';
	var parent = RTL$.typeGuard(this.parent(), Label);
	if (this.glue.length == 0){
		parent.caseLabelBegin();
	}
	if (from != null){
		var v = RTL$.typeGuard(parent.parent(), Type).var;
		if (to == null){
			cond = v + " === " + String.fromInt(from.value);
		}
		else {
			cond = "(" + v + " >= " + String.fromInt(from.value) + " && " + v + " <= " + String.fromInt(to.value) + ")";
		}
	}
	this.codeGenerator().write(this.glue + cond);
	this.glue = " || ";
};
LabelList.prototype.endParse = function(){
	RTL$.typeGuard(this.parent(), Label).caseLabelEnd();
	return true;
};

function contextFromLabel(l/*Label*/){
	return RTL$.typeGuard(l.parent(), Type);
}
Label.prototype.caseLabelBegin = function(){
	contextFromLabel(this).beginCase();
	this.codeGenerator().write("if (");
};
Label.prototype.caseLabelEnd = function(){
	var gen = this.codeGenerator();
	gen.write(")");
	gen.openScope();
};
Label.prototype.handleTypeGuard = function(e/*PType*/, info/*PType*/){
	this.caseLabelBegin();
	var guardVar = contextFromLabel(this).guardVar;
	if (guardVar != null){
		var root = this.root();
		var scope = new Scope.Procedure(root.language().stdSymbols);
		root.pushScope(scope);
		scope.addSymbol(new Symbols.Symbol(guardVar.id(), new GuardedVariable(guardVar, info.type())), false);
	}
	this.codeGenerator().write(ExpressionTree.typeTest(e, info, this).code());
};
Label.prototype.endParse = function(){
	if (contextFromLabel(this).guardVar != null){
		this.root().popScope();
	}
	this.codeGenerator().closeScope("");
	return true;
};

function labelContext(r/*VAR Range*/){
	return RTL$.typeGuard(r.parent().parent(), Label);
}

function caseContext(r/*VAR Range*/){
	return RTL$.typeGuard(labelContext(r).parent(), Type);
}

function handleLabel(r/*VAR Range*/, type/*PType*/, v/*PInt*/){
	caseContext(r).handleLabelType(type);
	if (r.from == null){
		r.from = v;
	}
	else {
		r.to = v;
	}
}
Range.prototype.codeGenerator = function(){
	return CodeGenerator.nullGenerator();
};
Range.prototype.handleExpression = function(e/*PType*/){
	var c = 0;
	if (caseContext(this).typeTest != null){
		Errors.raise("type's name expected in label, got expression: " + e.code());
	}
	var type = e.type();
	if (type instanceof Types.String){
		if (!Types.stringAsChar(type, {set: function($v){c = $v;}, get: function(){return c;}})){
			Errors.raise("single-character string expected");
		}
		handleLabel(this, Types.basic().ch, new ConstValue.Int(c));
	}
	else {
		handleLabel(this, type, RTL$.typeGuard(e.constValue(), ConstValue.Int));
	}
};
Range.prototype.handleQIdent = function(q/*QIdent*/){
	if (this.typeGuardHandled){
		Errors.raise("cannot use diapason (..) with type guard");
	}
	var found = ContextHierarchy.getQIdSymbolAndScope(this.root(), q);
	var info = found.symbol().info();
	var typeTest = caseContext(this).typeTest;
	if (typeTest != null){
		if (info instanceof TypeId.Type){
			labelContext(this).handleTypeGuard(typeTest, info);
			this.typeGuardHandled = true;
		}
		else {
			Errors.raise("'" + q.code + "' is not a type");
		}
	}
	else if (!(info instanceof Types.Const)){
		Errors.raise("'" + q.code + "' is not a constant");
	}
	else {
		var type = info.type;
		if (type instanceof Types.String){
			this.handleExpression(Expression.makeSimple("", type));
		}
		else {
			handleLabel(this, type, RTL$.typeGuard(info.value, ConstValue.Int));
		}
	}
};
Range.prototype.endParse = function(){
	if (this.from != null){
		RTL$.typeGuard(this.parent(), LabelList).handleRange(this.from, this.to);
	}
	return true;
};
function GuardedVariable(caseVariable/*PDeclaredVariable*/, guardedType/*PStorageType*/){
	Types.DeclaredVariable.call(this);
	this.caseVariable = caseVariable;
	this.guardedType = guardedType;
}
GuardedVariable.prototype.type = function(){
	return this.guardedType;
};
GuardedVariable.prototype.isReadOnly = function(){
	return this.caseVariable.isReadOnly();
};
GuardedVariable.prototype.isReference = function(){
	return this.caseVariable.isReference();
};
GuardedVariable.prototype.id = function(){
	return this.caseVariable.id();
};
exports.Type = Type;
exports.Label = Label;
exports.LabelList = LabelList;
exports.Range = Range;
