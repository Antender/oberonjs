var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var Code = require("js/Code.js");
var ConstValue = require("js/ConstValue.js");
var Context = require("js/Context.js");
var EberonArray = require("js/EberonArray.js");
var EberonOperator = require("js/EberonOperator.js");
var EberonRecord = require("js/EberonRecord.js");
var EberonTypes = require("js/EberonTypes.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var Procedure = require("js/Procedure.js");
var Record = require("js/Record.js");
var Types = require("js/Types.js");
var $scope = "EberonDynamicArray";
var methodNameAdd = "add";
var methodNameClear = "clear";
var methodNameRemove = "remove";
function DynamicArray(){
	Types.Array.apply(this, arguments);
}
RTL$.extend(DynamicArray, Types.Array, $scope);
function AddCallGenerator(){
	Procedure.CallGenerator.call(this);
	this.cx = null;
	this.elementsType = null;
	this.code = '';
}
RTL$.extend(AddCallGenerator, Procedure.CallGenerator, $scope);
function Method(){
	EberonArray.Method.apply(this, arguments);
}
RTL$.extend(Method, EberonArray.Method, $scope);
RTL$.extend(MethodAdd, Method, $scope);
function MethodClear(){
	Method.apply(this, arguments);
}
RTL$.extend(MethodClear, Method, $scope);
function MethodRemove(){
	Method.apply(this, arguments);
}
RTL$.extend(MethodRemove, Method, $scope);
function MethodCallClear(){
	Procedure.StdCall.call(this);
}
RTL$.extend(MethodCallClear, Procedure.StdCall, $scope);
function MethodCallRemove(){
	Procedure.StdCall.call(this);
}
RTL$.extend(MethodCallRemove, Procedure.StdCall, $scope);
RTL$.extend(MethodAddField, EberonTypes.MethodField, $scope);
RTL$.extend(MethodClearField, EberonTypes.MethodField, $scope);
RTL$.extend(MethodRemoveField, EberonTypes.MethodField, $scope);
var methodClear = null;
var methodRemove = null;

function arrayDimensionDescription(a/*VAR Array*/){
	var result = '';
	if (a instanceof DynamicArray){
		result = "*";
	}
	else {
		result = Types.arrayDimensionDescription(a);
	}
	return result;
}
DynamicArray.prototype.initializer = function(cx/*Type*/){
	return "[]";
};
DynamicArray.prototype.description = function(){
	return Types.arrayDescription(this, arrayDimensionDescription);
};
function MethodAdd(elementsType/*PStorageType*/){
	Method.call(this, methodNameAdd, null);
	this.elementsType = elementsType;
}
DynamicArray.prototype.denote = function(id/*STRING*/, isReadObly/*BOOLEAN*/){
	var result = null;
	
	function assertReadOnly(){
		EberonRecord.assertNotReadOnly(isReadObly, id, "dynamic array");
	}
	if (id == methodNameAdd){
		assertReadOnly();
		result = new MethodAddField(this.elementsType);
	}
	else if (id == methodNameClear){
		assertReadOnly();
		result = methodClear;
	}
	else if (id == methodNameRemove){
		assertReadOnly();
		result = methodRemove;
	}
	else {
		result = EberonArray.denoteMethod(id, this.elementsType);
		if (result == null){
			result = Types.Array.prototype.denote.call(this, id, isReadObly);
		}
	}
	return result;
};
AddCallGenerator.prototype.handleArgument = function(e/*PType*/){
	if (this.code != ""){
		Errors.raise("method 'add' expects one argument, got many");
	}
	var argCode = Procedure.makeArgumentsCode(this.cx);
	Procedure.checkArgument(e, new Types.ProcedureArgument(this.elementsType, false), 0, argCode, this.cx.language.types);
	this.code = argCode.result();
	var t = e.type();
	if (t instanceof Types.Array){
		if (Expression.isTemporary(e)){
			this.code = e.code();
		}
		else {
			this.code = Cast.cloneArray(t, this.code, this.cx);
		}
	}
	else if (t instanceof Record.Type){
		if (Expression.isTemporary(e)){
			this.code = e.code();
		}
		else {
			this.code = this.cx.language.rtl.clone(this.code, EberonOperator.generateTypeInfo(t), Record.constructor$(this.cx.cx, t));
		}
	}
};
AddCallGenerator.prototype.end = function(){
	if (this.code == ""){
		Errors.raise("method 'add' expects one argument, got nothing");
	}
	return Expression.makeSimple("(" + this.code + ")", null);
};
Method.prototype.description = function(){
	return "dynamic array's method '" + this.name + "'";
};
MethodAddField.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	return new Types.FieldCode(leadCode + "." + "push", "", "");
};
MethodClearField.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	return new Types.FieldCode(leadCode + "." + "splice", "", "");
};
MethodRemoveField.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	return new Types.FieldCode(leadCode + "." + "splice", "", "");
};
MethodAdd.prototype.callGenerator = function(cx/*PType*/){
	var result = new AddCallGenerator();
	result.cx = cx;
	result.elementsType = this.elementsType;
	return result;
};
function MethodAddField(elementsType/*PStorageType*/){
	EberonTypes.MethodField.call(this, new MethodAdd(elementsType));
}
function MethodClearField(){
	EberonTypes.MethodField.call(this, new MethodClear(methodNameClear, null));
}
function MethodRemoveField(){
	EberonTypes.MethodField.call(this, new MethodRemove(methodNameRemove, null));
}
MethodCallClear.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	Procedure.processArguments(args, this.args, null, cx.language.types);
	return Expression.makeSimple("(0, Number.MAX_VALUE)", null);
};
MethodCallRemove.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	var argCode = Procedure.makeArgumentsCode(cx);
	var arg = Procedure.checkSingleArgument(args, this, cx.language.types, argCode);
	var value = arg.constValue();
	if (value != null && value instanceof ConstValue.Int){
		Code.checkIndex(value.value);
	}
	return Expression.makeSimple("(" + argCode.result() + ", 1)", null);
};
MethodClear.prototype.callGenerator = function(cx/*PType*/){
	return Procedure.makeCallGenerator(new MethodCallClear(), cx);
};
MethodRemove.prototype.callGenerator = function(cx/*PType*/){
	var call = new MethodCallRemove();
	var a = new Types.ProcedureArgument(Types.basic().integer, false);
	call.args.push(a);
	return Procedure.makeCallGenerator(call, cx);
};
methodClear = new MethodClearField();
methodRemove = new MethodRemoveField();
exports.DynamicArray = DynamicArray;
