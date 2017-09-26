var RTL$ = require("eberon/eberon_rtl.js");
var Designator = require("js/Designator.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var OberonRtl = require("js/OberonRtl.js");
var Record = require("js/Record.js");
var String = require("js/String.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var $scope = "Cast";
var errNo = 0;
var err = 1;
var errVarParameter = 2;
function CastOpDoNothing(){
	LanguageContext.CastOp.call(this);
}
RTL$.extend(CastOpDoNothing, LanguageContext.CastOp, $scope);
function CastOpArray(){
	CastOpDoNothing.call(this);
}
RTL$.extend(CastOpArray, CastOpDoNothing, $scope);
function CastOpRecord(){
	CastOpDoNothing.call(this);
}
RTL$.extend(CastOpRecord, CastOpDoNothing, $scope);
function CastOpStrToChar(){
	CastOpDoNothing.call(this);
}
RTL$.extend(CastOpStrToChar, CastOpDoNothing, $scope);
function Operations(){
	this.castToRecord = null;
	this.castToUint8 = null;
}
Operations.prototype.$scope = $scope;
var areTypesExactlyMatch = null;
var doNothing = null;
var castOpStrToChar = null;
var castOpArray = null;

function findBaseType(base/*PType*/, type/*PType*/){
	var result = type;
	while (true){
		if (result != null && result != base){
			result = result.base;
		} else break;
	}
	return result;
}

function findPointerBaseType(base/*PPointer*/, type/*Pointer*/){
	var result = null;
	if (findBaseType(Record.pointerBase(base), Record.pointerBase(type)) != null){
		result = base;
	}
	return result;
}

function matchesToNIL(t/*VAR Type*/){
	return t instanceof Record.Pointer || t instanceof Types.Procedure;
}

function areTypesMatch(t1/*PType*/, t2/*PType*/){
	return areTypesExactlyMatch(t1, t2) || Types.isInt(t1) && Types.isInt(t2) || (t1 == Types.nil() && matchesToNIL(t2) || t2 == Types.nil() && matchesToNIL(t1));
}

function areArgsMatch(a1/*PProcedureArgument*/, a2/*PProcedureArgument*/, p1/*PProcedure*/, p2/*PProcedure*/){
	return a1.isVar == a2.isVar && (a1.type == p1 && a2.type == p2 || areTypesExactlyMatch(a1.type, a2.type));
}

function areProceduresMatch(p1/*PProcedure*/, p2/*PProcedure*/){
	var result = false;
	var args1 = p1.args();
	var args2 = p2.args();
	var argsLen = args1.length;
	if (args2.length == argsLen){
		var i = 0;
		while (true){
			if (i < argsLen && areArgsMatch(args1[i], args2[i], p1, p2)){
				++i;
			} else break;
		}
		if (i == argsLen){
			var r1 = p1.result();
			var r2 = p2.result();
			result = r1 == p1 && r2 == p2 || areTypesExactlyMatch(r1, r2);
		}
	}
	return result;
}

function areTypesExactlyMatchImpl(t1/*PType*/, t2/*PType*/){
	var result = false;
	if (t1 == t2){
		result = true;
	}
	else if (t1 instanceof Types.Array && t2 instanceof Types.OpenArray){
		result = areTypesMatch(t1.elementsType, t2.elementsType);
	}
	else if (t1 instanceof Types.StaticArray && t2 instanceof Types.StaticArray){
		result = t1.length() == t2.length() && areTypesMatch(t1.elementsType, t2.elementsType);
	}
	else if (t1 instanceof Record.Pointer && t2 instanceof Record.Pointer){
		result = areTypesMatch(Record.pointerBase(t1), Record.pointerBase(t2));
	}
	else if (t1 instanceof Types.Procedure && t2 instanceof Types.Procedure){
		result = areProceduresMatch(t1, t2);
	}
	return result;
}
CastOpDoNothing.prototype.make = function(cx/*PType*/, e/*PType*/){
	return e;
};

function passedByReference(info/*VAR Id*/){
	return info instanceof Types.Variable && info.isReference();
}

function assign(cx/*PType*/, info/*PVariable*/, right/*PType*/){
	return cx.language.codeTraits.assign(info, right);
}
CastOpDoNothing.prototype.assign = function(cx/*PType*/, info/*PVariable*/, right/*PType*/){
	return assign(cx, info, this.make(cx, right));
};
CastOpDoNothing.prototype.clone = function(cx/*PType*/, e/*PType*/){
	return Expression.deref(e).code();
};

function cloneArray(t/*PArray*/, code/*STRING*/, cx/*PType*/){
	var result = '';
	if (t.elementsType.isScalar()){
		result = code + ".slice()";
	}
	else {
		var l = cx.language;
		result = l.rtl.clone(code, l.types.typeInfo(t), "undefined");
	}
	return result;
}
CastOpArray.prototype.assign = function(cx/*PType*/, info/*PVariable*/, right/*PType*/){
	return assign(cx, info, Expression.makeSimple(cloneArray(RTL$.typeGuard(right.type(), Types.Array), right.code(), cx), right.type()));
};
CastOpArray.prototype.clone = function(cx/*PType*/, e/*PType*/){
	return cloneArray(RTL$.typeGuard(e.type(), Types.Array), e.code(), cx);
};
CastOpRecord.prototype.assign = function(cx/*PType*/, info/*PVariable*/, right/*PType*/){
	return cx.language.rtl.copy(right.code(), cx.language.codeTraits.referenceCode(info), Record.generateTypeInfo(info.type()));
};
CastOpStrToChar.prototype.make = function(cx/*PType*/, e/*PType*/){
	var s = RTL$.typeGuard(e.type(), Types.String);
	RTL$.assert(s.s.length == 1);
	var c = s.s.charCodeAt(0);
	var code = String.fromInt(c);
	return Expression.makeSimple(code, Types.basic().ch);
};

function implicit(from/*PType*/, to/*PType*/, toVar/*BOOLEAN*/, ops/*Operations*/, op/*VAR PCastOp*/){
	var ignore = false;
	var result = err;
	op.set(null);
	if (from == to){
		if (from instanceof Record.Type){
			op.set(ops.castToRecord);
		}
		else if (from instanceof Types.Array){
			op.set(castOpArray);
		}
		result = errNo;
	}
	else if (from == Types.basic().uint8 && to == Types.basic().integer){
		if (toVar){
			result = errVarParameter;
		}
		else {
			result = errNo;
		}
	}
	else if (from == Types.basic().integer && to == Types.basic().uint8){
		if (toVar){
			result = errVarParameter;
		}
		else {
			op.set(ops.castToUint8);
			result = errNo;
		}
	}
	else if (from instanceof Types.String){
		if (to == Types.basic().ch){
			if (from.s.length == 1){
				op.set(castOpStrToChar);
				result = errNo;
			}
		}
		else if (Types.isString(to)){
			result = errNo;
		}
	}
	else if (from instanceof Types.Array && to instanceof Types.OpenArray && areTypesExactlyMatch(from.elementsType, to.elementsType)){
		result = errNo;
	}
	else if (from instanceof Types.StaticArray && to instanceof Types.StaticArray && from.length() == to.length() && areTypesExactlyMatch(from.elementsType, to.elementsType)){
		op.set(castOpArray);
		result = errNo;
	}
	else if (from instanceof Record.Pointer && to instanceof Record.Pointer){
		if (!toVar){
			if (findPointerBaseType(to, from) != null){
				result = errNo;
			}
		}
		else if (areTypesExactlyMatchImpl(to, from)){
			result = errNo;
		}
		else {
			result = errVarParameter;
		}
	}
	else if (from instanceof Record.Type && to instanceof Record.Type){
		if (findBaseType(to, from) != null){
			op.set(ops.castToRecord);
			result = errNo;
		}
	}
	else if (from == Types.nil() && matchesToNIL(to)){
		result = errNo;
	}
	else if (from instanceof Types.Procedure && to instanceof Types.Procedure){
		if (areProceduresMatch(from, to)){
			result = errNo;
		}
	}
	if (result == errNo && op.get() == null){
		op.set(doNothing);
	}
	return result;
}
areTypesExactlyMatch = areTypesExactlyMatchImpl;
doNothing = new CastOpDoNothing();
castOpArray = new CastOpArray();
castOpStrToChar = new CastOpStrToChar();
exports.errNo = errNo;
exports.err = err;
exports.errVarParameter = errVarParameter;
exports.CastOpDoNothing = CastOpDoNothing;
exports.CastOpArray = CastOpArray;
exports.CastOpRecord = CastOpRecord;
exports.Operations = Operations;
exports.areTypesExactlyMatch = function(){return areTypesExactlyMatch;};
exports.doNothing = function(){return doNothing;};
exports.findPointerBaseType = findPointerBaseType;
exports.areTypesMatch = areTypesMatch;
exports.areProceduresMatch = areProceduresMatch;
exports.passedByReference = passedByReference;
exports.assign = assign;
exports.cloneArray = cloneArray;
exports.implicit = implicit;
