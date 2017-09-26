var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var Code = require("js/Code.js");
var Context = require("js/Context.js");
var EberonMap = require("js/EberonMap.js");
var EberonString = require("js/EberonString.js");
var EberonOperator = require("js/EberonOperator.js");
var EberonDynamicArray = require("js/EberonDynamicArray.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var OberonRtl = require("js/OberonRtl.js");
var Types = require("js/Types.js");
var $scope = "EberonCast";
function CastOpToDynamicArray(){
	Cast.CastOpArray.call(this);
}
RTL$.extend(CastOpToDynamicArray, Cast.CastOpArray, $scope);
function CastOpToMap(){
	LanguageContext.CastOp.call(this);
}
RTL$.extend(CastOpToMap, LanguageContext.CastOp, $scope);
var castOpToDynamicArray = null;
var castOpToMap = null;
CastOpToDynamicArray.prototype.make = function(cx/*PType*/, e/*PType*/){
	return Expression.makeSimple(Cast.cloneArray(RTL$.typeGuard(e.type(), Types.Array), e.code(), cx), null);
};

function copyArray(t/*PArray*/, leftCode/*STRING*/, rightCode/*STRING*/, rtl/*Type*/){
	var result = '';
	if (t.elementsType.isScalar()){
		result = "Array.prototype.splice.apply(" + leftCode + ", [0, Number.MAX_VALUE].concat(" + rightCode + "))";
	}
	else {
		result = rtl.copy(rightCode, leftCode, EberonOperator.generateTypeInfo(t));
	}
	return result;
}
CastOpToDynamicArray.prototype.assign = function(cx/*PType*/, info/*PVariable*/, right/*PType*/){
	return copyArray(RTL$.typeGuard(info.type(), Types.Array), cx.language.codeTraits.referenceCode(info), right.code(), cx.language.rtl);
};
CastOpToMap.prototype.make = function(cx/*PType*/, e/*PType*/){
	return e;
};
CastOpToMap.prototype.assign = function(cx/*PType*/, info/*PVariable*/, right/*PType*/){
	return cx.language.rtl.copy(right.code(), cx.language.codeTraits.referenceCode(info), EberonOperator.generateTypeInfo(info.type()));
};
CastOpToMap.prototype.clone = function(cx/*PType*/, e/*PType*/){
	return cx.language.rtl.clone(e.code(), EberonOperator.generateTypeInfo(e.type()), "undefined");
};

function isOpenCharArray(type/*PType*/){
	return type instanceof Types.OpenArray && type.elementsType == Types.basic().ch;
}

function dynamicArrayElementsMatch(t1/*PType*/, t2/*PType*/){
	var result = false;
	if (t1 instanceof EberonDynamicArray.DynamicArray && t2 instanceof EberonDynamicArray.DynamicArray){
		result = dynamicArrayElementsMatch(t1.elementsType, t2.elementsType);
	}
	else {
		result = Cast.areTypesExactlyMatch()(t1, t2);
	}
	return result;
}

function implicit(from/*PType*/, to/*PType*/, toVar/*BOOLEAN*/, ops/*Operations*/, op/*VAR PCastOp*/){
	var result = 0;
	if (from == EberonString.string() && (to instanceof Types.String || isOpenCharArray(to)) || from instanceof Types.String && to == EberonString.string()){
		if (toVar){
			result = Cast.errVarParameter;
		}
		else {
			op.set(Cast.doNothing());
			result = Cast.errNo;
		}
	}
	else if (from instanceof Types.Array && to instanceof EberonDynamicArray.DynamicArray && dynamicArrayElementsMatch(from.elementsType, to.elementsType)){
		if (toVar){
			if (!(from instanceof EberonDynamicArray.DynamicArray)){
				result = Cast.errVarParameter;
			}
			else {
				op.set(Cast.doNothing());
				result = Cast.errNo;
			}
		}
		else {
			op.set(castOpToDynamicArray);
			result = Cast.errNo;
		}
	}
	else if (from instanceof EberonMap.Type && to instanceof EberonMap.Type){
		if (Cast.areTypesExactlyMatch()(from.elementsType, to.elementsType)){
			op.set(castOpToMap);
			result = Cast.errNo;
		}
		else {
			result = Cast.err;
		}
	}
	else {
		result = Cast.implicit(from, to, toVar, ops, op);
	}
	return result;
}
castOpToDynamicArray = new CastOpToDynamicArray();
castOpToMap = new CastOpToMap();
exports.implicit = implicit;
