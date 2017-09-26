var RTL$ = require("eberon/eberon_rtl.js");
var Context = require("js/Context.js");
var EberonRtl = require("js/EberonRtl.js");
var Expression = require("js/Expression.js");
var EberonString = require("js/EberonString.js");
var EberonRecord = require("js/EberonRecord.js");
var EberonTypes = require("js/EberonTypes.js");
var Errors = require("js/Errors.js");
var LanguageContext = require("js/LanguageContext.js");
var Procedure = require("js/Procedure.js");
var Record = require("js/Record.js");
var Types = require("js/Types.js");
var $scope = "EberonMap";
var removeMethodName = "remove";
var clearMethodName = "clear";
function Type(){
	Types.Array.apply(this, arguments);
}
RTL$.extend(Type, Types.Array, $scope);
function Method(){
	Procedure.Std.apply(this, arguments);
}
RTL$.extend(Method, Procedure.Std, $scope);
RTL$.extend(MethodRemoveField, EberonTypes.MethodField, $scope);
RTL$.extend(MethodClearField, EberonTypes.MethodField, $scope);
function MapMethod(){
	Method.apply(this, arguments);
}
RTL$.extend(MapMethod, Method, $scope);
RTL$.extend(MethodRemove, MapMethod, $scope);
RTL$.extend(MethodClear, MapMethod, $scope);
function MethodCallRemove(){
	Procedure.StdCall.call(this);
}
RTL$.extend(MethodCallRemove, Procedure.StdCall, $scope);
function MethodCallClear(){
	Procedure.StdCall.call(this);
}
RTL$.extend(MethodCallClear, Procedure.StdCall, $scope);
RTL$.extend(ElementVariable, Types.Variable, $scope);
Type.prototype.initializer = function(cx/*Type*/){
	return "{}";
};
Type.prototype.description = function(){
	return "MAP OF " + this.elementsType.description();
};
Type.prototype.denote = function(id/*STRING*/, isReadObly/*BOOLEAN*/){
	var result = null;
	
	function assertReadOnly(){
		EberonRecord.assertNotReadOnly(isReadObly, id, "MAP");
	}
	if (id == removeMethodName){
		assertReadOnly();
		result = new MethodRemoveField();
	}
	else if (id == clearMethodName){
		assertReadOnly();
		result = new MethodClearField();
	}
	else {
		result = Types.Array.prototype.denote.call(this, id, isReadObly);
	}
	return result;
};
Type.prototype.isScalar = function(){
	return false;
};
MethodCallRemove.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	var argCode = Procedure.makeArgumentsCode(cx);
	var arg = Procedure.checkSingleArgument(args, this, cx.language.types, argCode);
	return Expression.makeSimple("[" + argCode.result() + "]", null);
};
MethodCallClear.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	Procedure.checkArgumentsCount(args.length, 0);
	return Expression.makeSimple("", null);
};
MapMethod.prototype.description = function(){
	return "MAP's method '" + this.name + "'";
};
function MethodRemove(){
	MapMethod.call(this, removeMethodName, null);
}
function MethodClear(){
	MapMethod.call(this, clearMethodName, null);
}
MethodRemove.prototype.callGenerator = function(cx/*PType*/){
	var call = new MethodCallRemove();
	var a = new Types.ProcedureArgument(new Types.OpenArray(Types.basic().ch), false);
	call.args.push(a);
	return Procedure.makeCallGenerator(call, cx);
};
MethodClear.prototype.callGenerator = function(cx/*PType*/){
	var call = new MethodCallClear();
	return Procedure.makeCallGenerator(call, cx);
};
function MethodRemoveField(){
	EberonTypes.MethodField.call(this, new MethodRemove());
}
function MethodClearField(){
	EberonTypes.MethodField.call(this, new MethodClear());
}
MethodRemoveField.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	return new Types.FieldCode("delete " + leadCode, "", "");
};
MethodClearField.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	return new Types.FieldCode(RTL$.typeGuard(cx.rtl(), EberonRtl.Type).clearMap(leadCode), "", "");
};
function ElementVariable(type/*PStorageType*/, readOnly/*BOOLEAN*/, lval/*STRING*/, rval/*STRING*/){
	Types.Variable.call(this);
	this.elementType = type;
	this.readOnly = readOnly;
	this.lval = lval;
	this.rval = rval;
}
ElementVariable.prototype.type = function(){
	return this.elementType;
};
ElementVariable.prototype.isReference = function(){
	return false;
};
ElementVariable.prototype.isReadOnly = function(){
	return this.readOnly;
};
ElementVariable.prototype.idType = function(){
	var result = '';
	result = "MAP's element of type '" + this.elementType.description() + "'";
	if (this.readOnly){
		result = "read-only " + result;
	}
	return result;
};
exports.Type = Type;
exports.ElementVariable = ElementVariable;
