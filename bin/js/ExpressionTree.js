var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var Context = require("js/Context.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var JS = GLOBAL;
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var Operator = require("js/Operator.js");
var Record = require("js/Record.js");
var String = require("js/String.js");
var Types = require("js/Types.js");
var TypeId = require("js/TypeId.js");
var $scope = "ExpressionTree";
function Ops(){
}
Ops.prototype.$scope = $scope;
function Factor(){
	this.not = false;
	this.expression = null;
}
Factor.prototype.$scope = $scope;
function TermItem(){
	this.factor = null;
	this.next = null;
}
TermItem.prototype.$scope = $scope;
RTL$.extend(TermItemOp, TermItem, $scope);
function TermList(){
	TermItem.call(this);
	this.last = null;
}
RTL$.extend(TermList, TermItem, $scope);
function SimpleItem(){
	this.term = null;
	this.next = null;
}
SimpleItem.prototype.$scope = $scope;
RTL$.extend(SimpleItemOp, SimpleItem, $scope);
function SimpleList(){
	SimpleItem.call(this);
	this.unaryOp = '';
	this.last = null;
}
RTL$.extend(SimpleList, SimpleItem, $scope);
Node.prototype.$scope = $scope;
RightNode.prototype.$scope = $scope;
function OpTypeCheck(){
}
OpTypeCheck.prototype.$scope = $scope;
function IntOpTypeCheck(){
	OpTypeCheck.call(this);
}
RTL$.extend(IntOpTypeCheck, OpTypeCheck, $scope);
function NumericOpTypeCheck(){
	OpTypeCheck.call(this);
}
RTL$.extend(NumericOpTypeCheck, OpTypeCheck, $scope);
function NumericOrSetOpTypeCheck(){
	NumericOpTypeCheck.call(this);
}
RTL$.extend(NumericOrSetOpTypeCheck, NumericOpTypeCheck, $scope);
var intOpTypeCheck = new IntOpTypeCheck();
var numericOpTypeCheck = new NumericOpTypeCheck();
var numericOrSetOpTypeCheck = new NumericOrSetOpTypeCheck();

function throwTypeNameExpected(){
	Errors.raise("type name expected");
}

function castCode(type/*PType*/, cx/*Type*/){
	var result = '';
	if (type instanceof Record.Pointer){
		var baseType = Record.pointerBase(type);
		result = Record.constructor$(cx, baseType);
	}
	else {
		result = Record.constructor$(cx, RTL$.typeGuard(type, Record.Type));
	}
	return result;
}

function unwrapTypeId(id/*PId*/){
	var result = null;
	if (!(id instanceof TypeId.Type)){
		throwTypeNameExpected();
	}
	else {
		result = id;
	}
	return result;
}

function unwrapType(id/*PId*/){
	return unwrapTypeId(id).type();
}

function checkTypeCast(fromInfo/*PVariable*/, fromType/*PType*/, toType/*PType*/, msg/*STRING*/){
	
	function checkCommonBase(from/*PType*/, to/*PType*/, prefix/*STRING*/){
		var t = to.base;
		while (true){
			if (t != null && t != from){
				t = t.base;
			} else break;
		}
		if (t == null){
			Errors.raise(prefix + ": '" + to.description() + "' is not an extension of '" + from.description() + "'");
		}
	}
	var prefix = "invalid " + msg;
	var pointerExpected = fromType instanceof Record.Pointer;
	if (!pointerExpected && !(fromType instanceof Record.Type)){
		Errors.raise(prefix + ": POINTER to type or RECORD expected, got '" + fromType.description() + "'");
	}
	if (!pointerExpected){
		if (fromInfo != null && !fromInfo.isReference()){
			Errors.raise(prefix + ": a value variable cannot be used");
		}
		else if (!(toType instanceof Record.Type)){
			Errors.raise(prefix + ": RECORD type expected as an argument of RECORD " + msg + ", got '" + toType.description() + "'");
		}
	}
	else if (!(toType instanceof Record.Pointer)){
		Errors.raise(prefix + ": POINTER type expected as an argument of POINTER " + msg + ", got '" + toType.description() + "'");
	}
	if (pointerExpected){
		checkCommonBase(Record.pointerBase(RTL$.typeGuard(fromType, Record.Pointer)), Record.pointerBase(RTL$.typeGuard(toType, Record.Pointer)), prefix);
	}
	else {
		checkCommonBase(RTL$.typeGuard(fromType, Record.Type), RTL$.typeGuard(toType, Record.Type), prefix);
	}
}

function typeTest(left/*PType*/, right/*PId*/, cx/*Node*/){
	var leftVar = null;
	var info = left.info();
	if (info instanceof Types.Variable){
		leftVar = info;
	}
	var rightType = unwrapType(right);
	checkTypeCast(leftVar, left.type(), rightType, "type test");
	return Operator.is(left, Expression.makeSimple(castCode(rightType, cx), null));
}

function throwTypeMismatch(from/*PType*/, to/*PType*/){
	var fromDescription = '';
	if (from != null){
		fromDescription = "'" + from.description() + "'";
	}
	else {
		fromDescription = "no type (proper procedure call)";
	}
	Errors.raise("type mismatch: expected '" + to.description() + "', got " + fromDescription);
}

function throwOperatorTypeMismatch(op/*STRING*/, expect/*STRING*/, type/*PType*/){
	Errors.raise("operator '" + op + "' type mismatch: " + expect + " expected, got '" + type.description() + "'");
}

function checkTypeMatch(from/*PType*/, to/*PType*/){
	if (!Cast.areTypesMatch(from, to)){
		throwTypeMismatch(from, to);
	}
}

function checkImplicitCast(cx/*Root*/, from/*PType*/, to/*PType*/){
	var op = null;
	if (cx.language().types.implicitCast(from, to, false, {set: function($v){op = $v;}, get: function(){return op;}}) != Cast.errNo){
		throwTypeMismatch(from, to);
	}
}

function useIntOrderOp(t/*PType*/){
	return Types.isInt(t) || t == Types.basic().ch;
}

function useIntEqOp(t/*PType*/){
	return Types.isInt(t) || t == Types.basic().bool || t == Types.basic().ch || t instanceof Record.Pointer || t instanceof Types.Procedure || t == Types.nil();
}

function assertOpType(type/*PType*/, check/*OpTypeCheck*/, literal/*STRING*/){
	if (!check.check(type)){
		throwOperatorTypeMismatch(literal, check.expect(), type);
	}
}

function assertIntOp(type/*PType*/, literal/*STRING*/, op/*BinaryOperator*/){
	assertOpType(type, intOpTypeCheck, literal);
	return op;
}

function assertNumericOrSetOp(type/*PType*/, literal/*STRING*/, op/*BinaryOperator*/, intOp/*BinaryOperator*/, setOp/*BinaryOperator*/){
	var result = null;
	assertOpType(type, numericOrSetOpTypeCheck, literal);
	if (Types.isInt(type)){
		result = intOp;
	}
	else if (type == Types.basic().set){
		result = setOp;
	}
	else {
		result = op;
	}
	return result;
}

function notTypeId(e/*PType*/){
	var info = e.info();
	if (info instanceof TypeId.Type){
		Errors.raise("type name '" + info.type().description() + "' cannot be used as an expression");
	}
}

function promoteTypeInExpression(e/*PType*/, type/*PType*/){
	var v = 0;
	var result = null;
	var fromType = e.type();
	if (type == Types.basic().ch && fromType instanceof Types.String && Types.stringAsChar(fromType, {set: function($v){v = $v;}, get: function(){return v;}})){
		result = Expression.makeSimple(String.fromInt(v), type);
	}
	else {
		result = e;
	}
	return result;
}

function relationOp(left/*PType*/, right/*PType*/, literal/*STRING*/, ops/*Ops*/, context/*VAR Node*/){
	var type = null;
	var o = null;
	var mismatch = '';
	notTypeId(left);
	if (literal != "IS"){
		notTypeId(right);
		if (literal != "IN"){
			type = ops.coalesceType(left.type(), right.type());
		}
	}
	if (literal == "="){
		o = ops.eq(type);
		if (o == null){
			mismatch = ops.eqExpect();
		}
	}
	else if (literal == "#"){
		o = ops.notEq(type);
		if (o == null){
			mismatch = ops.eqExpect();
		}
	}
	else if (literal == "<"){
		o = ops.less(type);
		if (o == null){
			mismatch = ops.strongRelExpect();
		}
	}
	else if (literal == ">"){
		o = ops.greater(type);
		if (o == null){
			mismatch = ops.strongRelExpect();
		}
	}
	else if (literal == "<="){
		o = ops.lessEq(type);
		if (o == null){
			mismatch = ops.relExpect();
		}
	}
	else if (literal == ">="){
		o = ops.greaterEq(type);
		if (o == null){
			mismatch = ops.relExpect();
		}
	}
	else if (literal == "IS"){
		o = ops.is(context);
	}
	else if (literal == "IN"){
		o = ops.in(left.type(), right.type(), context);
	}
	if (mismatch.length != 0){
		throwOperatorTypeMismatch(literal, mismatch, type);
	}
	return o;
}

function mulOp(s/*STRING*/, type/*PType*/){
	var o = null;
	if (s == "*"){
		o = assertNumericOrSetOp(type, s, Operator.mulReal, Operator.mulInt, Operator.setIntersection);
	}
	else if (s == "/"){
		if (Types.isInt(type)){
			Errors.raise("operator DIV expected for integer division");
		}
		o = assertNumericOrSetOp(type, s, Operator.divReal, null, Operator.setSymmetricDiff);
	}
	else if (s == "DIV"){
		o = assertIntOp(type, s, Operator.divInt);
	}
	else if (s == "MOD"){
		o = assertIntOp(type, s, Operator.mod);
	}
	else if (s == "&"){
		if (type != Types.basic().bool){
			Errors.raise("BOOLEAN expected as operand of '&', got '" + type.description() + "'");
		}
		o = Operator.and;
	}
	else {
		RTL$.assert(false);
	}
	return o;
}

function makeFromFactor(f/*Factor*/){
	var result = f.expression;
	if (f.not){
		notTypeId(result);
		checkTypeMatch(result.type(), Types.basic().bool);
		result = Operator.not(result);
	}
	return result;
}

function makeFromTermList(list/*TermList*/, root/*Root*/){
	var result = makeFromFactor(list.factor);
	var next = list.next;
	while (true){
		if (next != null){
			notTypeId(result);
			var e = makeFromFactor(next.factor);
			notTypeId(e);
			var type = result.type();
			var o = mulOp(next.op, type);
			checkImplicitCast(root, e.type(), type);
			result = o(result, e);
			next = next.next;
		} else break;
	}
	return result;
}

function makeFirstFromSimpleList(list/*SimpleList*/, root/*Root*/){
	var o = null;
	var result = makeFromTermList(list.term, root);
	if (list.unaryOp == "-"){
		var type = result.type();
		if (Types.isInt(type)){
			o = Operator.negateInt;
		}
		else if (type == Types.basic().set){
			o = Operator.setComplement;
		}
		else if (type == Types.basic().real){
			o = Operator.negateReal;
		}
		else {
			throwOperatorTypeMismatch(list.unaryOp, numericOrSetOpTypeCheck.expect(), type);
		}
	}
	else if (list.unaryOp == "+"){
		assertOpType(result.type(), numericOpTypeCheck, list.unaryOp);
		o = Operator.unaryPlus;
	}
	if (o != null){
		notTypeId(result);
		result = o(result);
	}
	return result;
}

function matchAddOperator(ops/*Ops*/, s/*STRING*/, type/*PType*/){
	var result = null;
	if (s == "+"){
		result = ops.plus(type);
	}
	else if (s == "-"){
		result = assertNumericOrSetOp(type, s, Operator.subReal, Operator.subInt, Operator.setDiff);
	}
	else if (s == "OR"){
		if (type != Types.basic().bool){
			Errors.raise("BOOLEAN expected as operand of 'OR', got '" + type.description() + "'");
		}
		result = Operator.or;
	}
	return result;
}

function makeFromSimpleList(list/*SimpleList*/, ops/*Ops*/, cx/*Root*/){
	var result = makeFirstFromSimpleList(list, cx);
	var next = list.next;
	while (true){
		if (next != null){
			notTypeId(result);
			var e = makeFromTermList(next.term, cx);
			notTypeId(e);
			var o = matchAddOperator(ops, next.op, result.type());
			checkImplicitCast(cx, e.type(), result.type());
			result = o(result, e);
			next = next.next;
		} else break;
	}
	return result;
}

function makeFromNode(node/*Node*/, ops/*Ops*/, cx/*PNode*/){
	var root = cx.root();
	var result = makeFromSimpleList(node.left, ops, root);
	var right = node.right;
	if (right != null){
		var leftExpression = result;
		var rightExpression = makeFromSimpleList(right.simple, ops, root);
		leftExpression = promoteTypeInExpression(leftExpression, rightExpression.type());
		rightExpression = promoteTypeInExpression(rightExpression, leftExpression.type());
		var o = relationOp(leftExpression, rightExpression, right.op, ops, cx);
		result = o(leftExpression, rightExpression, ContextHierarchy.makeLanguageContext(cx));
	}
	notTypeId(result);
	var type = result.type();
	if (type == null){
		Errors.raise("procedure returning no result cannot be used in an expression");
	}
	return result;
}
Ops.prototype.is = function(cx/*VAR Node*/){
	var r = null;
	
	function is(left/*PType*/, right/*PType*/, unused/*PType*/){
		var result = null;
		var info = right.info();
		if (info == null){
			throwTypeNameExpected();
		}
		else {
			result = typeTest(left, info, cx);
		}
		return result;
	}
	r = is;
	return r;
};
Ops.prototype.in = function(left/*PType*/, right/*PType*/, cx/*Node*/){
	if (!Types.isInt(left)){
		Errors.raise(Types.intsDescription() + " expected as an element of SET, got '" + left.description() + "'");
	}
	checkImplicitCast(cx.root(), right, Types.basic().set);
	return Operator.setHasBit;
};
Ops.prototype.eqExpect = function(){
	return "numeric type or SET or BOOLEAN or CHAR or character array or POINTER or PROCEDURE";
};
Ops.prototype.strongRelExpect = function(){
	return "numeric type or CHAR or character array";
};
Ops.prototype.relExpect = function(){
	return "numeric type or SET or CHAR or character array";
};
Ops.prototype.coalesceType = function(leftType/*PType*/, rightType/*PType*/){
	var result = null;
	if (leftType instanceof Record.Pointer && rightType instanceof Record.Pointer){
		result = Cast.findPointerBaseType(leftType, rightType);
		if (result == null){
			result = Cast.findPointerBaseType(rightType, leftType);
		}
	}
	if (result == null){
		var isStrings = Types.isString(leftType) && Types.isString(rightType);
		if (!isStrings){
			checkTypeMatch(rightType, leftType);
		}
		result = leftType;
	}
	return result;
};
Ops.prototype.eq = function(type/*PType*/){
	var result = null;
	if (useIntEqOp(type)){
		result = Operator.equalInt;
	}
	else if (Types.isString(type)){
		result = Operator.equalStr;
	}
	else if (type == Types.basic().real){
		result = Operator.equalReal;
	}
	else if (type == Types.basic().set){
		result = Operator.equalSet;
	}
	return result;
};
Ops.prototype.notEq = function(type/*PType*/){
	var result = null;
	if (useIntEqOp(type)){
		result = Operator.notEqualInt;
	}
	else if (Types.isString(type)){
		result = Operator.notEqualStr;
	}
	else if (type == Types.basic().real){
		result = Operator.notEqualReal;
	}
	else if (type == Types.basic().set){
		result = Operator.notEqualSet;
	}
	return result;
};
Ops.prototype.less = function(type/*PType*/){
	var result = null;
	if (useIntOrderOp(type)){
		result = Operator.lessInt;
	}
	else if (Types.isString(type)){
		result = Operator.lessStr;
	}
	else if (type == Types.basic().real){
		result = Operator.lessReal;
	}
	return result;
};
Ops.prototype.greater = function(type/*PType*/){
	var result = null;
	if (useIntOrderOp(type)){
		result = Operator.greaterInt;
	}
	else if (Types.isString(type)){
		result = Operator.greaterStr;
	}
	else if (type == Types.basic().real){
		result = Operator.greaterReal;
	}
	return result;
};
Ops.prototype.lessEq = function(type/*PType*/){
	var result = null;
	if (useIntOrderOp(type)){
		result = Operator.eqLessInt;
	}
	else if (Types.isString(type)){
		result = Operator.eqLessStr;
	}
	else if (type == Types.basic().real){
		result = Operator.eqLessReal;
	}
	else if (type == Types.basic().set){
		result = Operator.setInclL;
	}
	return result;
};
Ops.prototype.greaterEq = function(type/*PType*/){
	var result = null;
	if (useIntOrderOp(type)){
		result = Operator.eqGreaterInt;
	}
	else if (Types.isString(type)){
		result = Operator.eqGreaterStr;
	}
	else if (type == Types.basic().real){
		result = Operator.eqGreaterReal;
	}
	else if (type == Types.basic().set){
		result = Operator.setInclR;
	}
	return result;
};
Ops.prototype.plus = function(type/*PType*/){
	var result = null;
	if (type == Types.basic().set){
		result = Operator.setUnion;
	}
	else if (Types.isInt(type)){
		result = Operator.addInt;
	}
	else if (type == Types.basic().real){
		result = Operator.addReal;
	}
	else {
		throwOperatorTypeMismatch("+", this.plusExpect(), type);
	}
	return result;
};
Ops.prototype.plusExpect = function(){
	return "numeric type or SET";
};
Factor.prototype.logicalNot = function(){
	this.not = !this.not;
};
function TermItemOp(op/*STRING*/){
	TermItem.call(this);
	this.op = op;
}
function SimpleItemOp(op/*STRING*/){
	SimpleItem.call(this);
	this.op = op;
}
function RightNode(op/*STRING*/){
	this.op = op;
	this.simple = null;
}
TermList.prototype.makeFactor = function(){
	return new Factor();
};
TermList.prototype.addFactor = function(f/*PFactor*/){
	if (this.factor == null){
		this.factor = f;
	}
	else {
		this.last.factor = f;
	}
};
TermList.prototype.addOp = function(op/*STRING*/){
	var next = new TermItemOp(op);
	if (this.last == null){
		this.next = next;
	}
	else {
		this.last.next = next;
	}
	this.last = next;
};
SimpleList.prototype.makeTerm = function(){
	return new TermList();
};
SimpleList.prototype.addTerm = function(t/*PTermList*/){
	if (this.term == null){
		this.term = t;
	}
	else {
		this.last.term = t;
	}
};
SimpleList.prototype.addOp = function(op/*STRING*/){
	var next = new SimpleItemOp(op);
	if (this.last == null){
		this.next = next;
	}
	else {
		this.last.next = next;
	}
	this.last = next;
};
function Node(ops/*POps*/){
	this.ops = ops;
	this.left = null;
	this.right = null;
}
Node.prototype.makeSimple = function(){
	return new SimpleList();
};
Node.prototype.addSimple = function(s/*PSimpleList*/){
	if (this.left == null){
		this.left = s;
	}
	else {
		this.right.simple = s;
	}
};
Node.prototype.addOp = function(op/*STRING*/){
	this.right = new RightNode(op);
};
Node.prototype.asExpression = function(cx/*PNode*/){
	return makeFromNode(this, this.ops, cx);
};
IntOpTypeCheck.prototype.expect = function(){
	return Types.intsDescription();
};
IntOpTypeCheck.prototype.check = function(t/*PType*/){
	return Types.isInt(t);
};
NumericOpTypeCheck.prototype.expect = function(){
	return "numeric type";
};
NumericOpTypeCheck.prototype.check = function(t/*PType*/){
	return Types.numeric().indexOf(t) != -1;
};
NumericOrSetOpTypeCheck.prototype.expect = function(){
	return NumericOpTypeCheck.prototype.expect.call(this) + " or SET";
};
NumericOrSetOpTypeCheck.prototype.check = function(t/*PType*/){
	return NumericOpTypeCheck.prototype.check.call(this, t) || t == Types.basic().set;
};
exports.Ops = Ops;
exports.Factor = Factor;
exports.TermItem = TermItem;
exports.TermList = TermList;
exports.SimpleItem = SimpleItem;
exports.SimpleList = SimpleList;
exports.Node = Node;
exports.RightNode = RightNode;
exports.IntOpTypeCheck = IntOpTypeCheck;
exports.throwTypeNameExpected = throwTypeNameExpected;
exports.castCode = castCode;
exports.unwrapTypeId = unwrapTypeId;
exports.unwrapType = unwrapType;
exports.checkTypeCast = checkTypeCast;
exports.typeTest = typeTest;
exports.checkImplicitCast = checkImplicitCast;
exports.makeFromFactor = makeFromFactor;
