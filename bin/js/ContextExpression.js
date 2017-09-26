var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ConstValue = require("js/ConstValue.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Designator = require("js/Designator.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var ExpressionTree = require("js/ExpressionTree.js");
var Scope = require("js/Scope.js");
var String = require("js/String.js");
var Types = require("js/Types.js");
var $scope = "ContextExpression";
function ExpressionHandler(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(ExpressionHandler, ContextHierarchy.Node, $scope);
RTL$.extend(SimpleExpression, ContextHierarchy.Node, $scope);
RTL$.extend(ExpressionNode, ContextHierarchy.Node, $scope);
RTL$.extend(Factor, ExpressionHandler, $scope);
RTL$.extend(Term, ContextHierarchy.Node, $scope);
function MulOperator(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(MulOperator, ContextHierarchy.Node, $scope);
function AddOperator(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(AddOperator, ContextHierarchy.Node, $scope);
function Const(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(Const, ContextHierarchy.Node, $scope);
function Integer(){
	Const.apply(this, arguments);
}
RTL$.extend(Integer, Const, $scope);
function Real(){
	Const.apply(this, arguments);
}
RTL$.extend(Real, Const, $scope);
function Str(){
	Const.apply(this, arguments);
}
RTL$.extend(Str, Const, $scope);
RTL$.extend(SetElement, ExpressionHandler, $scope);
function Set(){
	ContextHierarchy.Node.apply(this, arguments);
	this.value = 0;
	this.expression = '';
}
RTL$.extend(Set, ContextHierarchy.Node, $scope);
var globalOps = null;
function ExpressionNode(parent/*PExpressionHandler*/, node/*PNode*/){
	ContextHierarchy.Node.call(this, parent);
	this.node = node;
	if (this.node == null){
		this.node = new ExpressionTree.Node(globalOps);
	}
}
ExpressionNode.prototype.handleLiteral = function(s/*STRING*/){
	this.node.addOp(s);
};
ExpressionNode.prototype.codeGenerator = function(){
	return CodeGenerator.nullGenerator();
};
ExpressionNode.prototype.endParse = function(){
	var expression = this.node.asExpression(this);
	var parent = RTL$.typeGuard(this.parent(), ExpressionHandler);
	parent.codeGenerator().write(expression.code());
	parent.handleExpression(expression);
	return true;
};
function SimpleExpression(parent/*PNode*/){
	ContextHierarchy.Node.call(this, parent);
	this.list = RTL$.typeGuard(parent, ExpressionNode).node.makeSimple();
}
SimpleExpression.prototype.handleLiteral = function(s/*STRING*/){
	this.list.unaryOp = s;
};
SimpleExpression.prototype.handleOperator = function(op/*STRING*/){
	this.list.addOp(op);
};
SimpleExpression.prototype.endParse = function(){
	RTL$.typeGuard(this.parent(), ExpressionNode).node.addSimple(this.list);
	return true;
};

function expressionFromConst(type/*PType*/, value/*PType*/, code/*STRING*/){
	return Expression.make(code, type, null, value);
}
function Factor(parent/*PNode*/){
	ExpressionHandler.call(this, parent);
	this.factor = null;
	if (parent instanceof Factor){
		this.factor = parent.factor;
	}
	else {
		this.factor = RTL$.typeGuard(parent, Term).list.makeFactor();
	}
}
Factor.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "NIL"){
		this.handleExpression(expressionFromConst(Types.nil(), null, "null"));
	}
	else if (s == "TRUE"){
		this.handleExpression(expressionFromConst(Types.basic().bool, new ConstValue.Int(1), "true"));
	}
	else if (s == "FALSE"){
		this.handleExpression(expressionFromConst(Types.basic().bool, new ConstValue.Int(0), "false"));
	}
	else if (s == "~"){
		this.factor.logicalNot();
	}
};
Factor.prototype.handleExpression = function(e/*PType*/){
	this.factor.expression = e;
};
Factor.prototype.endParse = function(){
	var const$ = null;
	if (this.factor.expression == null){
		var d = this.attributes.designator;
		var info = d.info();
		if (info instanceof Types.Const){
			const$ = info.value;
		}
		this.factor.expression = Expression.make(d.code(), d.type(), d.info(), const$);
	}
	var parent = this.parent();
	if (parent instanceof Term){
		parent.list.addFactor(this.factor);
	}
	return true;
};
function Term(parent/*PNode*/){
	ContextHierarchy.Node.call(this, parent);
	this.list = RTL$.typeGuard(parent, SimpleExpression).list.makeTerm();
}
Term.prototype.endParse = function(){
	RTL$.typeGuard(this.parent(), SimpleExpression).list.addTerm(this.list);
	return true;
};
MulOperator.prototype.handleLiteral = function(s/*STRING*/){
	RTL$.typeGuard(this.parent(), Term).list.addOp(s);
};
AddOperator.prototype.handleLiteral = function(s/*STRING*/){
	var parent = RTL$.typeGuard(this.parent(), SimpleExpression);
	parent.handleOperator(s);
};
Integer.prototype.handleInt = function(n/*INTEGER*/){
	RTL$.typeGuard(this.parent(), ExpressionHandler).handleExpression(expressionFromConst(Types.basic().integer, new ConstValue.Int(n), String.fromInt(n)));
};
Real.prototype.handleReal = function(r/*REAL*/){
	RTL$.typeGuard(this.parent(), ExpressionHandler).handleExpression(expressionFromConst(Types.basic().real, new ConstValue.Real(r), String.fromReal(r)));
};

function escapeString(s/*STRING*/){
	var doubleQuote = Chars.doubleQuote;
	var ln = Chars.ln;
	var cr = Chars.cr;
	var tab = Chars.tab;
	var backspace = Chars.backspace;
	var feed = Chars.feed;
	var backslash = Chars.backslash;
	var result = '';
	result = doubleQuote;
	var from = 0;
	for (var i = 0; i <= s.length - 1 | 0; ++i){
		var escape = 0;
		var $case1 = s.charCodeAt(i);
		if ($case1 === 92){
			escape = 92;
		}
		else if ($case1 === 34){
			escape = 34;
		}
		else if ($case1 === 10){
			escape = 110;
		}
		else if ($case1 === 13){
			escape = 114;
		}
		else if ($case1 === 9){
			escape = 116;
		}
		else if ($case1 === 8){
			escape = 98;
		}
		else if ($case1 === 12){
			escape = 102;
		}
		if (escape != 0){
			result = result + String.substr(s, from, i - from | 0) + backslash + String.fromChar(escape);
			from = i + 1 | 0;
		}
	}
	return result + String.substr(s, from, s.length - from | 0) + doubleQuote;
}
Str.prototype.handleStr = function(s/*STRING*/){
	RTL$.typeGuard(this.parent(), ExpressionHandler).handleExpression(expressionFromConst(new Types.String(s), new ConstValue.String(s), escapeString(s)));
};
function SetElement(parent/*PSet*/){
	ExpressionHandler.call(this, parent);
	this.from = '';
	this.to = '';
	this.fromValue = null;
	this.toValue = null;
	this.code = new CodeGenerator.SimpleGenerator();
}
SetElement.prototype.codeGenerator = function(){
	return this.code;
};
SetElement.prototype.handleExpression = function(e/*PType*/){
	var value = RTL$.typeGuard(e.constValue(), ConstValue.Int);
	if (this.from.length == 0){
		this.from = this.code.result();
		this.fromValue = value;
		this.code = new CodeGenerator.SimpleGenerator();
	}
	else {
		this.to = this.code.result();
		this.toValue = value;
	}
};
SetElement.prototype.endParse = function(){
	RTL$.typeGuard(this.parent(), Set).handleElement(this);
	return true;
};
Set.prototype.handleElement = function(s/*SetElement*/){
	if (s.fromValue != null && (s.to.length == 0 || s.toValue != null)){
		if (s.to.length != 0){
			for (var i = s.fromValue.value; i <= s.toValue.value; ++i){
				this.value |= 1 << i;
			}
		}
		else {
			this.value |= 1 << s.fromValue.value;
		}
	}
	else {
		if (this.expression.length != 0){
			this.expression = this.expression + ", ";
		}
		if (s.to.length != 0){
			this.expression = this.expression + "[" + s.from + ", " + s.to + "]";
		}
		else {
			this.expression = this.expression + s.from;
		}
	}
};
Set.prototype.endParse = function(){
	var parent = RTL$.typeGuard(this.parent(), Factor);
	if (this.expression.length == 0){
		parent.handleExpression(expressionFromConst(Types.basic().set, new ConstValue.Set(this.value), String.fromInt(this.value)));
	}
	else {
		var code = this.root().language().rtl.makeSet(this.expression);
		if (this.value != 0){
			code = code + " | " + String.fromInt(this.value);
		}
		var e = Expression.makeSimple(code, Types.basic().set);
		parent.handleExpression(e);
	}
	return true;
};

function designatorAsExpression(d/*PType*/){
	var value = null;
	var info = d.info();
	if (info instanceof Types.ProcedureId){
		if (!info.canBeReferenced()){
			Errors.raise(info.idType() + " cannot be referenced");
		}
	}
	else if (info instanceof Types.Const){
		value = info.value;
	}
	return Expression.make(d.code(), d.type(), d.info(), value);
}
globalOps = new ExpressionTree.Ops();
exports.ExpressionHandler = ExpressionHandler;
exports.SimpleExpression = SimpleExpression;
exports.ExpressionNode = ExpressionNode;
exports.Factor = Factor;
exports.Term = Term;
exports.MulOperator = MulOperator;
exports.AddOperator = AddOperator;
exports.Integer = Integer;
exports.Real = Real;
exports.Str = Str;
exports.SetElement = SetElement;
exports.Set = Set;
exports.designatorAsExpression = designatorAsExpression;
