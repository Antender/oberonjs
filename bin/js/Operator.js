var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var Code = require("js/Code.js");
var ConstValue = require("js/ConstValue.js");
var Designator = require("js/Designator.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var OberonRtl = require("js/OberonRtl.js");
var Precedence = require("js/CodePrecedence.js");
var String = require("js/String.js");
var Types = require("js/Types.js");
var $scope = "Operator";
var equalCode = " == ";
var notEqualCode = " != ";
function CodeMaker(){
}
CodeMaker.prototype.$scope = $scope;
RTL$.extend(SimpleCodeMaker, CodeMaker, $scope);
function IntCodeMaker(){
	SimpleCodeMaker.apply(this, arguments);
}
RTL$.extend(IntCodeMaker, SimpleCodeMaker, $scope);
RTL$.extend(PredCodeMaker, CodeMaker, $scope);
function CastToUint8(){
	Cast.CastOpDoNothing.call(this);
}
RTL$.extend(CastToUint8, Cast.CastOpDoNothing, $scope);
var openArrayChar = null;
var castOperations = new Cast.Operations();

function binary(left/*PType*/, right/*PType*/, rtl/*PType*/, op/*BinaryOp*/, code/*PCodeMaker*/, precedence/*INTEGER*/, optResultType/*PType*/, optResultPrecedence/*INTEGER*/){
	var result = null;
	var leftValue = null;var rightValue = null;var resultValue = null;
	var leftCode = '';var rightCode = '';var resultCode = '';
	var resultType = null;
	var resultPrecedence = 0;
	var rightExpDeref = null;
	leftValue = left.constValue();
	rightValue = right.constValue();
	if (leftValue != null && rightValue != null){
		resultValue = op(leftValue, rightValue);
	}
	leftCode = Code.adjustPrecedence(Expression.deref(left), precedence);
	rightExpDeref = Expression.deref(right);
	if (precedence != Precedence.none){
		rightCode = Code.adjustPrecedence(rightExpDeref, precedence - 1 | 0);
	}
	else {
		rightCode = rightExpDeref.code();
	}
	resultCode = code.make(leftCode, rightCode, rtl);
	if (optResultType != null){
		resultType = optResultType;
	}
	else {
		resultType = left.type();
	}
	if (optResultPrecedence != Precedence.none){
		resultPrecedence = optResultPrecedence;
	}
	else {
		resultPrecedence = precedence;
	}
	return new Expression.Type(resultCode, resultType, null, resultValue, resultPrecedence);
}
SimpleCodeMaker.prototype.make = function(left/*STRING*/, right/*STRING*/, rtl/*PType*/){
	return left + this.code + right;
};
IntCodeMaker.prototype.make = function(left/*STRING*/, right/*STRING*/, rtl/*PType*/){
	return SimpleCodeMaker.prototype.make.call(this, left, right, rtl) + " | 0";
};
PredCodeMaker.prototype.make = function(left/*STRING*/, right/*STRING*/, rtl/*PType*/){
	return this.pred(left, right, rtl);
};
function SimpleCodeMaker(code/*STRING*/){
	CodeMaker.call(this);
	this.code = code;
}
function PredCodeMaker(pred/*CodePredicate*/){
	CodeMaker.call(this);
	this.pred = pred;
}

function binaryWithCodeEx(left/*PType*/, right/*PType*/, op/*BinaryOp*/, code/*STRING*/, precedence/*INTEGER*/, optResultType/*PType*/, optResultPrecedence/*INTEGER*/){
	return binary(left, right, null, op, new SimpleCodeMaker(code), precedence, optResultType, optResultPrecedence);
}

function binaryWithCode(left/*PType*/, right/*PType*/, op/*BinaryOp*/, code/*STRING*/, precedence/*INTEGER*/){
	return binaryWithCodeEx(left, right, op, code, precedence, null, Precedence.none);
}

function relational(left/*PType*/, right/*PType*/, op/*BinaryOp*/, code/*STRING*/){
	return binaryWithCodeEx(left, right, op, code, Precedence.relational, Types.basic().bool, Precedence.none);
}

function equal(left/*PType*/, right/*PType*/, op/*BinaryOp*/, code/*STRING*/){
	return binaryWithCodeEx(left, right, op, code, Precedence.equal, Types.basic().bool, Precedence.none);
}

function promoteToWideIfNeeded(e/*PType*/){
	var result = null;
	if (e.type() != Types.basic().uint8){
		result = e;
	}
	else {
		result = new Expression.Type(e.code(), Types.basic().integer, e.info(), e.constValue(), e.maxPrecedence());
	}
	return result;
}

function binaryInt(left/*PType*/, right/*PType*/, op/*BinaryOp*/, code/*STRING*/, precedence/*INTEGER*/){
	return promoteToWideIfNeeded(binary(left, right, null, op, new IntCodeMaker(code), precedence, null, Precedence.bitOr));
}

function binaryPred(left/*PType*/, right/*PType*/, rtl/*PType*/, op/*BinaryOp*/, pred/*CodePredicate*/){
	return binary(left, right, rtl, op, new PredCodeMaker(pred), Precedence.none, Types.basic().bool, Precedence.none);
}

function unary(e/*PType*/, op/*UnaryOp*/, code/*STRING*/){
	var value = null;
	value = e.constValue();
	if (value != null){
		value = op(value);
	}
	var resultCode = code + Code.adjustPrecedence(Expression.deref(e), Precedence.unary);
	return new Expression.Type(resultCode, e.type(), null, value, Precedence.unary);
}

function castToStr(e/*PType*/, cx/*PType*/){
	var resultExpression = null;
	var op = null;
	var ignored = 0;
	ignored = Cast.implicit(e.type(), openArrayChar, false, castOperations, {set: function($v){op = $v;}, get: function(){return op;}});
	if (op != null){
		resultExpression = op.make(cx, e);
	}
	else {
		resultExpression = e;
	}
	return resultExpression.code();
}

function opAddReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Real(RTL$.typeGuard(left, ConstValue.Real).value + RTL$.typeGuard(right, ConstValue.Real).value);
}

function opAddInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value + RTL$.typeGuard(right, ConstValue.Int).value | 0);
}

function opSubReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Real(RTL$.typeGuard(left, ConstValue.Real).value - RTL$.typeGuard(right, ConstValue.Real).value);
}

function opSubInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value - RTL$.typeGuard(right, ConstValue.Int).value | 0);
}

function opMulReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Real(RTL$.typeGuard(left, ConstValue.Real).value * RTL$.typeGuard(right, ConstValue.Real).value);
}

function opMulInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value * RTL$.typeGuard(right, ConstValue.Int).value | 0);
}

function opDivReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Real(RTL$.typeGuard(left, ConstValue.Real).value / RTL$.typeGuard(right, ConstValue.Real).value);
}

function opDivInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value / RTL$.typeGuard(right, ConstValue.Int).value | 0);
}

function opMod(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value % RTL$.typeGuard(right, ConstValue.Int).value);
}

function opSetUnion(left/*PType*/, right/*PType*/){
	return new ConstValue.Set(RTL$.typeGuard(left, ConstValue.Set).value | RTL$.typeGuard(right, ConstValue.Set).value);
}

function opSetDiff(left/*PType*/, right/*PType*/){
	return new ConstValue.Set(RTL$.typeGuard(left, ConstValue.Set).value & ~RTL$.typeGuard(right, ConstValue.Set).value);
}

function opSetIntersection(left/*PType*/, right/*PType*/){
	return new ConstValue.Set(RTL$.typeGuard(left, ConstValue.Set).value & RTL$.typeGuard(right, ConstValue.Set).value);
}

function opSetSymmetricDiff(left/*PType*/, right/*PType*/){
	return new ConstValue.Set(RTL$.typeGuard(left, ConstValue.Set).value ^ RTL$.typeGuard(right, ConstValue.Set).value);
}

function opSetInclL(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.setInclL(RTL$.typeGuard(left, ConstValue.Set).value, RTL$.typeGuard(right, ConstValue.Set).value) ? 1 : 0);
}

function opSetInclR(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.setInclR(RTL$.typeGuard(left, ConstValue.Set).value, RTL$.typeGuard(right, ConstValue.Set).value) ? 1 : 0);
}

function opOr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value != 0 || RTL$.typeGuard(right, ConstValue.Int).value != 0 ? 1 : 0);
}

function opAnd(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value != 0 && RTL$.typeGuard(right, ConstValue.Int).value != 0 ? 1 : 0);
}

function opEqualInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value == RTL$.typeGuard(right, ConstValue.Int).value ? 1 : 0);
}

function opEqualReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Real).value == RTL$.typeGuard(right, ConstValue.Real).value ? 1 : 0);
}

function opEqualSet(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Set).value == RTL$.typeGuard(right, ConstValue.Set).value ? 1 : 0);
}

function opNotEqualInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value != RTL$.typeGuard(right, ConstValue.Int).value ? 1 : 0);
}

function opNotEqualReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Real).value != RTL$.typeGuard(right, ConstValue.Real).value ? 1 : 0);
}

function opNotEqualSet(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Set).value != RTL$.typeGuard(right, ConstValue.Set).value ? 1 : 0);
}

function opLessInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value < RTL$.typeGuard(right, ConstValue.Int).value ? 1 : 0);
}

function opLessReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Real).value < RTL$.typeGuard(right, ConstValue.Real).value ? 1 : 0);
}

function opGreaterInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value > RTL$.typeGuard(right, ConstValue.Int).value ? 1 : 0);
}

function opGreaterReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Real).value > RTL$.typeGuard(right, ConstValue.Real).value ? 1 : 0);
}

function opEqLessInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value <= RTL$.typeGuard(right, ConstValue.Int).value ? 1 : 0);
}

function opEqLessReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Real).value <= RTL$.typeGuard(right, ConstValue.Real).value ? 1 : 0);
}

function opEqGreaterInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value >= RTL$.typeGuard(right, ConstValue.Int).value ? 1 : 0);
}

function opEqGreaterReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Real).value >= RTL$.typeGuard(right, ConstValue.Real).value ? 1 : 0);
}

function opNot(x/*PType*/){
	return new ConstValue.Int(!(RTL$.typeGuard(x, ConstValue.Int).value != 0) ? 1 : 0);
}

function opNegateInt(x/*PType*/){
	return new ConstValue.Int(-RTL$.typeGuard(x, ConstValue.Int).value | 0);
}

function opNegateReal(x/*PType*/){
	return new ConstValue.Real(-RTL$.typeGuard(x, ConstValue.Real).value);
}

function opUnaryPlus(x/*PType*/){
	return x;
}

function opSetComplement(x/*PType*/){
	return new ConstValue.Set(~RTL$.typeGuard(x, ConstValue.Set).value);
}

function opLsl(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value << RTL$.typeGuard(right, ConstValue.Int).value);
}

function opAsr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value >> RTL$.typeGuard(right, ConstValue.Int).value);
}

function opRor(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value >>> RTL$.typeGuard(right, ConstValue.Int).value);
}

function codeSetInclL(left/*STRING*/, right/*STRING*/, rtl/*PType*/){
	return rtl.setInclL(left, right);
}

function codeSetInclR(left/*STRING*/, right/*STRING*/, rtl/*PType*/){
	return rtl.setInclR(left, right);
}

function strCmp(op/*STRING*/, left/*PType*/, right/*PType*/, cx/*PType*/){
	return Expression.makeSimple(cx.language.rtl.strCmp(castToStr(left, cx), castToStr(right, cx)) + op + "0", Types.basic().bool);
}

function assign(info/*PId*/, right/*PType*/, cx/*PType*/){
	var rightCode = '';
	var isArray = false;
	var castOperation = null;
	var ignored = false;
	var result = '';
	
	function assignArrayFromString(a/*VAR Array*/, s/*String*/){
		if (!(a instanceof Types.StaticArray)){
			Errors.raise("string cannot be assigned to open " + a.description());
		}
		else if (Types.stringLen(s) > a.length()){
			Errors.raise(String.fromInt(a.length()) + "-character ARRAY is too small for " + String.fromInt(Types.stringLen(s)) + "-character string");
		}
		var l = cx.language;
		return l.rtl.assignArrayFromString(l.codeTraits.referenceCode(info), rightCode);
	}
	if (!(info instanceof Types.Variable) || info.isReadOnly()){
		Errors.raise("cannot assign to " + info.idType());
	}
	else {
		rightCode = right.code();
		var leftType = info.type();
		var rightType = right.type();
		isArray = leftType instanceof Types.Array;
		if (isArray && RTL$.typeGuard(leftType, Types.Array).elementsType == Types.basic().ch && rightType instanceof Types.String){
			result = assignArrayFromString(leftType, rightType);
		}
		else {
			if (cx.language.types.implicitCast(rightType, leftType, false, {set: function($v){castOperation = $v;}, get: function(){return castOperation;}}) != Cast.errNo){
				Errors.raise("type mismatch: '" + leftType.description() + "' cannot be assigned to '" + rightType.description() + "' expression");
			}
			if (leftType instanceof Types.OpenArray && rightType instanceof Types.Array){
				Errors.raise("open '" + leftType.description() + "' cannot be assigned");
			}
			result = castOperation.assign(cx, info, right);
		}
	}
	return result;
}

function inplace(left/*PType*/, right/*PType*/, cx/*PType*/, code/*STRING*/, altOp/*BinaryProc*/){
	var info = left.info();
	return info instanceof Types.Variable && info.isReference() ? assign(info, altOp(left, right), cx) : left.code() + code + Expression.deref(right).code();
}

function addReal(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opAddReal, " + ", Precedence.addSub);
}

function addInt(left/*PType*/, right/*PType*/){
	return binaryInt(left, right, opAddInt, " + ", Precedence.addSub);
}

function subReal(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opSubReal, " - ", Precedence.addSub);
}

function subInt(left/*PType*/, right/*PType*/){
	return binaryInt(left, right, opSubInt, " - ", Precedence.addSub);
}

function mulReal(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opMulReal, " * ", Precedence.mulDivMod);
}

function mulInt(left/*PType*/, right/*PType*/){
	return binaryInt(left, right, opMulInt, " * ", Precedence.mulDivMod);
}

function divReal(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opDivReal, " / ", Precedence.mulDivMod);
}

function divInt(left/*PType*/, right/*PType*/){
	return binaryInt(left, right, opDivInt, " / ", Precedence.mulDivMod);
}

function mod(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opMod, " % ", Precedence.mulDivMod);
}

function setUnion(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opSetUnion, " | ", Precedence.bitOr);
}

function setDiff(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opSetDiff, " & ~", Precedence.bitAnd);
}

function setIntersection(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opSetIntersection, " & ", Precedence.bitAnd);
}

function setSymmetricDiff(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opSetSymmetricDiff, " ^ ", Precedence.bitXor);
}

function setHasBit(left/*PType*/, right/*PType*/, cx/*PType*/){
	return new Expression.Type("1 << " + Code.adjustPrecedence(Expression.deref(left), Precedence.shift) + " & " + Code.adjustPrecedence(Expression.deref(right), Precedence.bitAnd), Types.basic().bool, null, null, Precedence.bitAnd);
}

function setInclL(left/*PType*/, right/*PType*/, cx/*PType*/){
	return binaryPred(left, right, cx.language.rtl, opSetInclL, codeSetInclL);
}

function setInclR(left/*PType*/, right/*PType*/, cx/*PType*/){
	return binaryPred(left, right, cx.language.rtl, opSetInclR, codeSetInclR);
}

function or(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opOr, " || ", Precedence.or);
}

function and(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opAnd, " && ", Precedence.and);
}

function equalInt(left/*PType*/, right/*PType*/, cx/*PType*/){
	return equal(left, right, opEqualInt, equalCode);
}

function equalReal(left/*PType*/, right/*PType*/, cx/*PType*/){
	return equal(left, right, opEqualReal, equalCode);
}

function equalSet(left/*PType*/, right/*PType*/, cx/*PType*/){
	return equal(left, right, opEqualSet, equalCode);
}

function equalStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return strCmp(equalCode, left, right, cx);
}

function notEqualInt(left/*PType*/, right/*PType*/, cx/*PType*/){
	return equal(left, right, opNotEqualInt, notEqualCode);
}

function notEqualReal(left/*PType*/, right/*PType*/, cx/*PType*/){
	return equal(left, right, opNotEqualReal, notEqualCode);
}

function notEqualSet(left/*PType*/, right/*PType*/, cx/*PType*/){
	return equal(left, right, opNotEqualSet, notEqualCode);
}

function notEqualStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return strCmp(notEqualCode, left, right, cx);
}

function is(left/*PType*/, right/*PType*/){
	return relational(left, right, null, " instanceof ");
}

function lessInt(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opLessInt, " < ");
}

function lessReal(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opLessReal, " < ");
}

function lessStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return strCmp(" < ", left, right, cx);
}

function greaterInt(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opGreaterInt, " > ");
}

function greaterReal(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opGreaterReal, " > ");
}

function greaterStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return strCmp(" > ", left, right, cx);
}

function eqLessInt(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opEqLessInt, " <= ");
}

function eqLessReal(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opEqLessReal, " <= ");
}

function eqLessStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return strCmp(" <= ", left, right, cx);
}

function eqGreaterInt(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opEqGreaterInt, " >= ");
}

function eqGreaterReal(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opEqGreaterReal, " >= ");
}

function eqGreaterStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return strCmp(" >= ", left, right, cx);
}

function not(x/*PType*/){
	return unary(x, opNot, "!");
}

function negateInt(x/*PType*/){
	var result = null;
	var overflowCheck = true;
	var c = x.constValue();
	if (c != null){
		var value = -RTL$.typeGuard(c, ConstValue.Int).value | 0;
		result = new Expression.Type(String.fromInt(value), Types.basic().integer, null, new ConstValue.Int(value), Precedence.unary);
	}
	else {
		result = promoteToWideIfNeeded(unary(x, opNegateInt, "-"));
		result = new Expression.Type(result.code() + " | 0", result.type(), result.info(), result.constValue(), Precedence.bitOr);
	}
	return result;
}

function negateReal(x/*PType*/){
	return promoteToWideIfNeeded(unary(x, opNegateReal, "-"));
}

function unaryPlus(x/*PType*/){
	return unary(x, opUnaryPlus, "");
}

function setComplement(x/*PType*/){
	return unary(x, opSetComplement, "~");
}

function lsl(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opLsl, " << ", Precedence.shift);
}

function asr(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opAsr, " >> ", Precedence.shift);
}

function ror(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opRor, " >>> ", Precedence.shift);
}

function mulInplace(left/*PType*/, right/*PType*/, cx/*PType*/){
	return inplace(left, right, cx, " *= ", mulReal);
}

function divInplace(left/*PType*/, right/*PType*/, cx/*PType*/){
	return inplace(left, right, cx, " /= ", divReal);
}

function pow2(e/*PType*/){
	var derefExp = null;
	derefExp = Expression.deref(e);
	return Expression.makeSimple("Math.pow(2, " + derefExp.code() + ")", Types.basic().real);
}

function log2(e/*PType*/){
	var derefExp = null;
	derefExp = Expression.deref(e);
	return new Expression.Type("(Math.log(" + derefExp.code() + ") / Math.LN2) | 0", Types.basic().integer, null, null, Precedence.bitOr);
}

function opCastToUint8(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value * RTL$.typeGuard(right, ConstValue.Int).value | 0);
}
CastToUint8.prototype.make = function(cx/*PType*/, e/*PType*/){
	return binaryWithCode(e, Expression.make("0xFF", Types.basic().integer, null, new ConstValue.Int(255)), opCastToUint8, " & ", Precedence.bitAnd);
};
CastToUint8.prototype.clone = function(cx/*PType*/, e/*PType*/){
	return this.make(cx, e).code();
};
openArrayChar = new Types.OpenArray(Types.basic().ch);
castOperations.castToUint8 = new CastToUint8();
castOperations.castToRecord = new Cast.CastOpRecord();
exports.equalCode = equalCode;
exports.notEqualCode = notEqualCode;
exports.CastToUint8 = CastToUint8;
exports.castOperations = function(){return castOperations;};
exports.binaryWithCode = binaryWithCode;
exports.relational = relational;
exports.equal = equal;
exports.assign = assign;
exports.addReal = addReal;
exports.addInt = addInt;
exports.subReal = subReal;
exports.subInt = subInt;
exports.mulReal = mulReal;
exports.mulInt = mulInt;
exports.divReal = divReal;
exports.divInt = divInt;
exports.mod = mod;
exports.setUnion = setUnion;
exports.setDiff = setDiff;
exports.setIntersection = setIntersection;
exports.setSymmetricDiff = setSymmetricDiff;
exports.setHasBit = setHasBit;
exports.setInclL = setInclL;
exports.setInclR = setInclR;
exports.or = or;
exports.and = and;
exports.equalInt = equalInt;
exports.equalReal = equalReal;
exports.equalSet = equalSet;
exports.equalStr = equalStr;
exports.notEqualInt = notEqualInt;
exports.notEqualReal = notEqualReal;
exports.notEqualSet = notEqualSet;
exports.notEqualStr = notEqualStr;
exports.is = is;
exports.lessInt = lessInt;
exports.lessReal = lessReal;
exports.lessStr = lessStr;
exports.greaterInt = greaterInt;
exports.greaterReal = greaterReal;
exports.greaterStr = greaterStr;
exports.eqLessInt = eqLessInt;
exports.eqLessReal = eqLessReal;
exports.eqLessStr = eqLessStr;
exports.eqGreaterInt = eqGreaterInt;
exports.eqGreaterReal = eqGreaterReal;
exports.eqGreaterStr = eqGreaterStr;
exports.not = not;
exports.negateInt = negateInt;
exports.negateReal = negateReal;
exports.unaryPlus = unaryPlus;
exports.setComplement = setComplement;
exports.lsl = lsl;
exports.asr = asr;
exports.ror = ror;
exports.mulInplace = mulInplace;
exports.divInplace = divInplace;
exports.pow2 = pow2;
exports.log2 = log2;
