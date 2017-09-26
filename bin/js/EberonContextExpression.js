var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var CodePrecedence = require("js/CodePrecedence.js");
var ConstValue = require("js/ConstValue.js");
var Context = require("js/Context.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var EberonArray = require("js/EberonArray.js");
var EberonContextDesignator = require("js/EberonContextDesignator.js");
var EberonMap = require("js/EberonMap.js");
var EberonOperator = require("js/EberonOperator.js");
var EberonRecord = require("js/EberonRecord.js");
var EberonString = require("js/EberonString.js");
var EberonTypePromotion = require("js/EberonTypePromotion.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var ExpressionTree = require("js/ExpressionTree.js");
var LanguageContext = require("js/LanguageContext.js");
var JS = GLOBAL;
var Object$ = require("js/Object.js");
var Record = require("js/Record.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "EberonContextExpression";
RTL$.extend(ExpressionNode, ContextExpression.ExpressionHandler, $scope);
RTL$.extend(RelationExpression, ContextExpression.ExpressionNode, $scope);
function Array(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
	this.size = 0;
	this.type = null;
	this.code = '';
}
RTL$.extend(Array, ContextExpression.ExpressionHandler, $scope);
function ArrayConst(){
	ConstValue.Type.call(this);
}
RTL$.extend(ArrayConst, ConstValue.Type, $scope);
function Ops(){
	ExpressionTree.Ops.call(this);
}
RTL$.extend(Ops, ExpressionTree.Ops, $scope);
RTL$.extend(TermList, ExpressionTree.TermList, $scope);
RTL$.extend(SimpleList, ExpressionTree.SimpleList, $scope);
RTL$.extend(Node, ExpressionTree.Node, $scope);
RTL$.extend(ETFactor, ExpressionTree.Factor, $scope);
RTL$.extend(TernaryOperatorResult, Variable.TypedVariable, $scope);
var setTermTypePromotion = null;
var globalOps = null;

function hierarchyDepth(t/*Type*/){
	var result = 0;
	var base = t.base;
	while (true){
		if (base != null){
			++result;
			base = base.base;
		} else break;
	}
	return result;
}

function getNthBase(t/*PType*/, n/*INTEGER*/){
	var result = t;
	var i = n;
	while (true){
		if (i != 0){
			result = result.base;
			--i;
		} else break;
	}
	return result;
}

function findCommonBaseRecord(t1/*PType*/, t2/*PType*/){
	var depth1 = hierarchyDepth(t1);
	var depth2 = hierarchyDepth(t2);
	var commonBase1 = t1;
	var commonBase2 = t2;
	if (depth1 > depth2){
		commonBase1 = getNthBase(commonBase1, depth1 - depth2 | 0);
	}
	else {
		commonBase2 = getNthBase(commonBase2, depth2 - depth1 | 0);
	}
	while (true){
		if (commonBase1 != commonBase2){
			commonBase1 = commonBase1.base;
			commonBase2 = commonBase2.base;
		} else break;
	}
	return commonBase1;
}

function findCommonBase(t1/*PType*/, t2/*PType*/){
	return t1 instanceof Types.String || t2 instanceof Types.String ? EberonString.string() : t1;
}

function ternaryCodeImpl(condition/*PType*/, left/*STRING*/, right/*STRING*/){
	return condition.code() + " ? " + left + " : " + right;
}

function ternaryCode(t/*TernaryOperatorResult*/){
	return ternaryCodeImpl(t.condition, Expression.deref(t.left).code(), Expression.deref(t.right).code());
}

function parentTerm(maybeFactor/*VAR Node*/){
	return maybeFactor instanceof ContextExpression.Factor ? RTL$.typeGuard(maybeFactor.factor, ETFactor).termList : null;
}
function ExpressionNode(parent/*PNode*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	this.currentNode = new Node(parentTerm(parent));
	this.typePromotion = null;
	this.condition = null;
	this.first = null;
	this.second = null;
}

function processTypePromotion(node/*Node*/){
	var typePromotion = node.combinedTypePromotion;
	return typePromotion != null ? typePromotion : node.varTypePromotion;
}
ExpressionNode.prototype.handleExpression = function(e/*PType*/){
	if (this.condition == null){
		this.condition = e;
		this.typePromotion = processTypePromotion(this.currentNode);
	}
	else if (this.first == null){
		this.first = e;
	}
	else {
		this.second = e;
	}
	this.currentNode = new Node(this.currentNode.parentTerm);
};
ExpressionNode.prototype.handleLiteral = function(s/*STRING*/){
	var parentTerm = this.currentNode.parentTerm;
	if (parentTerm != null){
		parentTerm.typePromotion = null;
	}
	if (this.typePromotion != null){
		if (s == "?"){
			this.typePromotion.and();
		}
		else {
			this.typePromotion.reset();
			this.typePromotion.or();
		}
	}
};
ExpressionNode.prototype.endParse = function(){
	var resultType = null;
	var op = null;
	var result = this.first;
	if (result == null){
		result = this.condition;
		if (this.typePromotion != null && this.currentNode.parentTerm == null){
			var msg = new EberonContextDesignator.TransferPromotedTypesMsg(this.typePromotion);
			var void$ = this.parent().handleMessage(msg);
		}
	}
	else {
		var firstType = this.first.type();
		var secondType = this.second.type();
		if (firstType instanceof Record.Type && secondType instanceof Record.Type){
			resultType = findCommonBaseRecord(firstType, secondType);
		}
		else if (firstType instanceof Record.Pointer && secondType instanceof Record.Pointer){
			resultType = EberonContextDesignator.makePointer(findCommonBaseRecord(Record.pointerBase(firstType), Record.pointerBase(secondType)));
		}
		else if (firstType == Types.nil() && secondType instanceof Record.Pointer){
			resultType = secondType;
		}
		else if (secondType == Types.nil() && firstType instanceof Record.Pointer){
			resultType = firstType;
		}
		if (resultType == null){
			if (this.root().language().types.implicitCast(firstType, secondType, false, {set: function($v){op = $v;}, get: function(){return op;}}) != Cast.errNo){
				Errors.raise("incompatible types in ternary operator: '" + firstType.description() + "' and '" + secondType.description() + "'");
			}
			resultType = findCommonBase(firstType, secondType);
		}
		var checkResultType = resultType;
		if (!(checkResultType instanceof Types.StorageType)){
			Errors.raise("cannot use '" + checkResultType.description() + "' as a result of ternary operator");
		}
		else {
			var v = new TernaryOperatorResult(checkResultType, this.condition, this.first, this.second);
			result = new Expression.Type(ternaryCode(v), resultType, v, null, CodePrecedence.conditional);
		}
	}
	RTL$.typeGuard(this.parent(), ContextExpression.ExpressionHandler).handleExpression(result);
	return true;
};
function RelationExpression(parent/*PExpressionNode*/){
	ContextExpression.ExpressionNode.call(this, parent, parent.currentNode);
}

function optimizeRecordRValue(info/*VAR Id*/, l/*Language*/){
	var result = '';
	if (info instanceof TernaryOperatorResult){
		var lTemp = Expression.isTemporary(info.left);
		var rTemp = Expression.isTemporary(info.right);
		if (lTemp && rTemp){
			result = ternaryCode(info);
		}
		else if (lTemp){
			result = ternaryCodeImpl(info.condition, info.left.code(), l.rtl.clone(info.right.code(), l.types.typeInfo(info.type()), "undefined"));
		}
		else if (rTemp){
			result = ternaryCodeImpl(info.condition, l.rtl.clone(info.left.code(), l.types.typeInfo(info.type()), "undefined"), info.right.code());
		}
	}
	return result;
}

function initFromRValue(cx/*PNode*/, e/*PType*/, lval/*STRING*/, resultType/*VAR PStorageType*/){
	var result = '';
	var cloneOp = null;
	var type = e.type();
	if (type instanceof Types.String){
		resultType.set(EberonString.string());
	}
	else if (type instanceof Types.StorageType){
		resultType.set(type);
	}
	else {
		Errors.raise("cannot use " + type.description() + " to initialize " + lval);
	}
	if (type instanceof Types.OpenArray){
		Errors.raise("cannot initialize " + lval + " with open array");
	}
	else if (type instanceof EberonRecord.Record){
		EberonRecord.ensureCanBeInstantiated(cx, type, EberonRecord.instantiateForCopy);
		if (Expression.isTemporary(e)){
			result = e.code();
		}
		else {
			var info = e.info();
			var l = cx.root().language();
			var code = optimizeRecordRValue(info, l);
			result = code.length == 0 ? l.rtl.clone(e.code(), l.types.typeInfo(type), "undefined") : code;
		}
	}
	else {
		if (Expression.isTemporary(e) && type instanceof Types.Array){
			result = e.code();
		}
		else {
			var l = cx.root().language();
			var void$ = l.types.implicitCast(type, type, false, {set: function($v){cloneOp = $v;}, get: function(){return cloneOp;}});
			result = cloneOp.clone(ContextHierarchy.makeLanguageContext(cx), e);
		}
	}
	return result;
}
Array.prototype.handleExpression = function(e/*PType*/){
	var checkType = null;
	if (this.type == null){
		this.code = "[" + initFromRValue(this, e, "array's element", RTL$.makeRef(this, "type"));
	}
	else {
		this.code = this.code + ", " + initFromRValue(this, e, "array's element", {set: function($v){checkType = $v;}, get: function(){return checkType;}});
		if (this.type != checkType){
			Errors.raise("array's elements should have the same type: expected '" + this.type.description() + "', got '" + checkType.description() + "'");
		}
	}
	++this.size;
};
Array.prototype.endParse = function(){
	this.code = this.code + "]";
	RTL$.typeGuard(this.parent(), ContextExpression.ExpressionHandler).handleExpression(Expression.make(this.code, new EberonArray.StaticArray("", this.type, this.size), null, new ArrayConst()));
	return true;
};
Ops.prototype.in = function(left/*PType*/, right/*PType*/, cx/*Node*/){
	var result = null;
	if (right instanceof EberonMap.Type){
		EberonContextDesignator.checkMapKeyType(left);
		result = EberonOperator.inMap;
	}
	else {
		result = ExpressionTree.Ops.prototype.in.call(this, left, right, cx);
	}
	return result;
};

function setSimpleExpressionTypePromotion(e/*VAR SimpleList*/){
	if (e.currentPromotion == null){
		if (e.parentTerm != null){
			var p = setTermTypePromotion(e.parentTerm);
			if (p != null){
				e.typePromotion = p.makeOr();
			}
		}
		else {
			e.typePromotion = new EberonTypePromotion.Or(false);
		}
		if (e.typePromotion != null){
			if (e.orHandled){
				var unused = e.typePromotion.next();
			}
			e.currentPromotion = e.typePromotion.next();
		}
	}
	return e.currentPromotion;
}

function setTermTypePromotionProc(term/*VAR TermList*/){
	if (term.currentPromotion == null){
		var p = setSimpleExpressionTypePromotion(term.parentSimple);
		if (p != null){
			term.typePromotion = p.makeAnd();
		}
		if (term.typePromotion != null){
			if (term.andHandled){
				var unused = term.typePromotion.next();
			}
			term.currentPromotion = term.typePromotion.next();
		}
	}
	return term.currentPromotion;
}
TermList.prototype.addOp = function(op/*STRING*/){
	ExpressionTree.TermList.prototype.addOp.call(this, op);
	if (this.typePromotion != null){
		this.currentPromotion = this.typePromotion.next();
	}
	else {
		this.andHandled = true;
	}
};
Ops.prototype.plus = function(type/*PType*/){
	return type == EberonString.string() || type instanceof Types.String ? EberonOperator.addStr : ExpressionTree.Ops.prototype.plus.call(this, type);
};
Ops.prototype.plusExpect = function(){
	return "numeric type or SET or STRING";
};
Ops.prototype.eq = function(type/*PType*/){
	return type == EberonString.string() ? EberonOperator.equalStr : ExpressionTree.Ops.prototype.eq.call(this, type);
};
Ops.prototype.notEq = function(type/*PType*/){
	return type == EberonString.string() ? EberonOperator.notEqualStr : ExpressionTree.Ops.prototype.notEq.call(this, type);
};
Ops.prototype.less = function(type/*PType*/){
	return type == EberonString.string() ? EberonOperator.lessStr : ExpressionTree.Ops.prototype.less.call(this, type);
};
Ops.prototype.greater = function(type/*PType*/){
	return type == EberonString.string() ? EberonOperator.greaterStr : ExpressionTree.Ops.prototype.greater.call(this, type);
};
Ops.prototype.lessEq = function(type/*PType*/){
	return type == EberonString.string() ? EberonOperator.lessEqualStr : ExpressionTree.Ops.prototype.lessEq.call(this, type);
};
Ops.prototype.greaterEq = function(type/*PType*/){
	return type == EberonString.string() ? EberonOperator.greaterEqualStr : ExpressionTree.Ops.prototype.greaterEq.call(this, type);
};
Ops.prototype.coalesceType = function(leftType/*PType*/, rightType/*PType*/){
	return leftType == EberonString.string() && rightType instanceof Types.String || rightType == EberonString.string() && leftType instanceof Types.String ? EberonString.string() : ExpressionTree.Ops.prototype.coalesceType.call(this, leftType, rightType);
};
function Node(parentTerm/*PTermList*/){
	ExpressionTree.Node.call(this, globalOps);
	this.parentTerm = parentTerm;
	this.combinedTypePromotion = null;
	this.varTypePromotion = null;
}
Node.prototype.makeSimple = function(){
	return new SimpleList(this.parentTerm);
};
Node.prototype.addSimple = function(s/*PSimpleList*/){
	this.combinedTypePromotion = RTL$.typeGuard(s, SimpleList).typePromotion;
	if (this.left != null && this.right.op == "IS"){
		var v = this.left.term.factor.expression.info();
		if (v instanceof EberonTypePromotion.Variable){
			var type = ExpressionTree.unwrapType(s.term.factor.expression.info());
			if (this.parentTerm == null){
				this.varTypePromotion = new EberonTypePromotion.ForVariable(v, type, false);
			}
			else {
				var p = setTermTypePromotion(this.parentTerm);
				p.promote(v, type);
			}
		}
	}
	ExpressionTree.Node.prototype.addSimple.call(this, s);
};
Node.prototype.addOp = function(op/*STRING*/){
	if (this.combinedTypePromotion != null){
		this.combinedTypePromotion.clear();
	}
	ExpressionTree.Node.prototype.addOp.call(this, op);
};
function SimpleList(parentTerm/*PTermList*/){
	ExpressionTree.SimpleList.call(this);
	this.parentTerm = parentTerm;
	this.typePromotion = null;
	this.currentPromotion = null;
	this.orHandled = false;
}
SimpleList.prototype.makeTerm = function(){
	return new TermList(this);
};
SimpleList.prototype.addOp = function(op/*STRING*/){
	ExpressionTree.SimpleList.prototype.addOp.call(this, op);
	if (this.typePromotion != null){
		this.currentPromotion = this.typePromotion.next();
	}
	else {
		this.orHandled = true;
	}
};
function TermList(parentSimple/*PSimpleList*/){
	ExpressionTree.TermList.call(this);
	this.parentSimple = parentSimple;
	this.typePromotion = null;
	this.currentPromotion = null;
	this.andHandled = false;
}
TermList.prototype.makeFactor = function(){
	return new ETFactor(this);
};
function ETFactor(termList/*PTermList*/){
	ExpressionTree.Factor.call(this);
	this.termList = termList;
}
ETFactor.prototype.logicalNot = function(){
	ExpressionTree.Factor.prototype.logicalNot.call(this);
	var p = setTermTypePromotion(this.termList);
	if (p != null){
		p.invert();
	}
};
function TernaryOperatorResult(type/*PStorageType*/, condition/*PType*/, l/*PType*/, r/*PType*/){
	Variable.TypedVariable.call(this, type);
	this.condition = condition;
	this.left = l;
	this.right = r;
}
TernaryOperatorResult.prototype.isReference = function(){
	return false;
};
TernaryOperatorResult.prototype.isReadOnly = function(){
	return true;
};
TernaryOperatorResult.prototype.idType = function(){
	return "ternary operator result";
};
setTermTypePromotion = setTermTypePromotionProc;
globalOps = new Ops();
exports.ExpressionNode = ExpressionNode;
exports.RelationExpression = RelationExpression;
exports.Array = Array;
exports.initFromRValue = initFromRValue;
