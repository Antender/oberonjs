var RTL$ = require("eberon/eberon_rtl.js");
var EberonTypes = require("js/EberonTypes.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var Procedure = require("js/Procedure.js");
var Types = require("js/Types.js");
var $scope = "EberonArray";
var methodNameIndexOf = "indexOf";
function Method(){
	Procedure.Std.apply(this, arguments);
}
RTL$.extend(Method, Procedure.Std, $scope);
RTL$.extend(MethodIndexOf, Method, $scope);
function MethodCallIndexOf(){
	Procedure.StdCall.call(this);
}
RTL$.extend(MethodCallIndexOf, Procedure.StdCall, $scope);
function StaticArray(){
	Types.StaticArray.apply(this, arguments);
}
RTL$.extend(StaticArray, Types.StaticArray, $scope);
function OpenArray(){
	Types.OpenArray.apply(this, arguments);
}
RTL$.extend(OpenArray, Types.OpenArray, $scope);
Method.prototype.description = function(){
	return "array's method '" + this.name + "'";
};
function MethodIndexOf(elementsType/*PStorageType*/){
	Method.call(this, methodNameIndexOf, null);
	this.elementsType = elementsType;
}
MethodIndexOf.prototype.callGenerator = function(cx/*PType*/){
	var call = new MethodCallIndexOf();
	var a = new Types.ProcedureArgument(this.elementsType, false);
	call.args.push(a);
	return Procedure.makeCallGenerator(call, cx);
};
MethodCallIndexOf.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	var argCode = Procedure.makeArgumentsCode(cx);
	var argType = Procedure.checkSingleArgument(args, this, cx.language.types, argCode).type();
	return Expression.makeSimple("(" + argCode.result() + ")", Types.basic().integer);
};

function denoteMethod(id/*STRING*/, elementsType/*PStorageType*/){
	var result = null;
	if (id == methodNameIndexOf){
		result = new EberonTypes.MethodField(new MethodIndexOf(elementsType));
	}
	return result;
}

function denote(id/*STRING*/, a/*Array*/){
	var result = null;
	if (id == methodNameIndexOf){
		if (a.elementsType instanceof Types.Record || a.elementsType instanceof Types.Array){
			Errors.raise("'" + methodNameIndexOf + "' is not defined for array of '" + a.elementsType.description() + "'");
		}
		result = new EberonTypes.MethodField(new MethodIndexOf(a.elementsType));
	}
	return result;
}
StaticArray.prototype.denote = function(id/*STRING*/, isReadObly/*BOOLEAN*/){
	var result = denote(id, this);
	if (result == null){
		result = Types.StaticArray.prototype.denote.call(this, id, isReadObly);
	}
	return result;
};
OpenArray.prototype.denote = function(id/*STRING*/, isReadObly/*BOOLEAN*/){
	var result = denote(id, this);
	if (result == null){
		result = Types.OpenArray.prototype.denote.call(this, id, isReadObly);
	}
	return result;
};
exports.Method = Method;
exports.StaticArray = StaticArray;
exports.OpenArray = OpenArray;
exports.denoteMethod = denoteMethod;
