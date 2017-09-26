var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var CodePrecedence = require("js/CodePrecedence.js");
var ConstValue = require("js/ConstValue.js");
var Designator = require("js/Designator.js");
var EberonMap = require("js/EberonMap.js");
var EberonString = require("js/EberonString.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var OberonRtl = require("js/OberonRtl.js");
var Operator = require("js/Operator.js");
var Record = require("js/Record.js");
var Types = require("js/Types.js");
var $scope = "EberonOperator";
function CastOpRecord(){
	Cast.CastOpRecord.call(this);
}
RTL$.extend(CastOpRecord, Cast.CastOpRecord, $scope);
var castOperations = new Cast.Operations();

function opAddStr(left/*PType*/, right/*PType*/){
	return new ConstValue.String(RTL$.typeGuard(left, ConstValue.String).value + RTL$.typeGuard(right, ConstValue.String).value);
}

function opEqualStr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.String).value == RTL$.typeGuard(right, ConstValue.String).value ? 1 : 0);
}

function opNotEqualStr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.String).value != RTL$.typeGuard(right, ConstValue.String).value ? 1 : 0);
}

function opLessStr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.String).value < RTL$.typeGuard(right, ConstValue.String).value ? 1 : 0);
}

function opGreaterStr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.String).value > RTL$.typeGuard(right, ConstValue.String).value ? 1 : 0);
}

function opLessEqualStr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.String).value <= RTL$.typeGuard(right, ConstValue.String).value ? 1 : 0);
}

function opGraterEqualStr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.String).value >= RTL$.typeGuard(right, ConstValue.String).value ? 1 : 0);
}

function addStr(left/*PType*/, right/*PType*/){
	var result = Operator.binaryWithCode(left, right, opAddStr, " + ", CodePrecedence.addSub);
	var l = left.type();
	var r = right.type();
	if (l != r && (l == EberonString.string() || r == EberonString.string())){
		result = new Expression.Type(result.code(), EberonString.string(), result.info(), result.constValue(), result.maxPrecedence());
	}
	return result;
}

function equalStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return Operator.equal(left, right, opEqualStr, Operator.equalCode);
}

function notEqualStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return Operator.equal(left, right, opNotEqualStr, Operator.notEqualCode);
}

function lessStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return Operator.relational(left, right, opLessStr, " < ");
}

function greaterStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return Operator.relational(left, right, opGreaterStr, " > ");
}

function lessEqualStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return Operator.relational(left, right, opLessEqualStr, " <= ");
}

function greaterEqualStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return Operator.relational(left, right, opGraterEqualStr, " >= ");
}

function inMap(left/*PType*/, right/*PType*/, cx/*PType*/){
	return Expression.makeSimple("Object.prototype.hasOwnProperty.call(" + right.code() + ", " + left.code() + ")", Types.basic().bool);
}

function generateTypeInfo(type/*PType*/){
	var result = '';
	if (type instanceof EberonMap.Type){
		result = "{map: " + generateTypeInfo(type.elementsType) + "}";
	}
	else {
		result = Record.generateTypeInfo(type);
	}
	return result;
}
CastOpRecord.prototype.assign = function(cx/*PType*/, info/*PVariable*/, right/*PType*/){
	var result = '';
	if (info instanceof EberonMap.ElementVariable){
		if (right.info() == null && info.type() == right.type()){
			result = info.lval + " = " + right.code();
		}
		else {
			var leftType = RTL$.typeGuard(info.type(), Record.Type);
			result = info.lval + " = " + cx.language.rtl.clone(right.code(), generateTypeInfo(leftType), Record.constructor$(cx.cx, leftType));
		}
	}
	else {
		result = Cast.CastOpRecord.prototype.assign.call(this, cx, info, right);
	}
	return result;
};
castOperations.castToUint8 = new Operator.CastToUint8();
castOperations.castToRecord = new CastOpRecord();
exports.castOperations = function(){return castOperations;};
exports.addStr = addStr;
exports.equalStr = equalStr;
exports.notEqualStr = notEqualStr;
exports.lessStr = lessStr;
exports.greaterStr = greaterStr;
exports.lessEqualStr = lessEqualStr;
exports.greaterEqualStr = greaterEqualStr;
exports.inMap = inMap;
exports.generateTypeInfo = generateTypeInfo;
