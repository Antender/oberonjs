var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var CodeGenerator = require("js/CodeGenerator.js");
var EberonCast = require("js/EberonCast.js");
var EberonRecord = require("js/EberonRecord.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var Procedure = require("js/Procedure.js");
var Record = require("js/Record.js");
var Stream = require("js/Stream.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var $scope = "EberonConstructor";
function ConstructorCall(){
	Procedure.StdCall.call(this);
	this.recordType = null;
	this.resultType = null;
}
RTL$.extend(ConstructorCall, Procedure.StdCall, $scope);
function BaseConstructorCall(){
	ConstructorCall.call(this);
}
RTL$.extend(BaseConstructorCall, ConstructorCall, $scope);
function RecordInitCall(){
	ConstructorCall.call(this);
	this.field = '';
}
RTL$.extend(RecordInitCall, ConstructorCall, $scope);
function NonRecordInitCall(){
	Procedure.CallGenerator.call(this);
	this.cx = null;
	this.type = null;
	this.field = '';
	this.code = '';
}
RTL$.extend(NonRecordInitCall, Procedure.CallGenerator, $scope);

function checkArgs(call/*ConstructorCall*/, args/*ARRAY OF PType*/, cx/*PType*/){
	var argCode = Procedure.makeArgumentsCode(cx);
	Procedure.processArguments(args, call.args, argCode, cx.language.types);
	return argCode.result();
}
ConstructorCall.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	var argCode = checkArgs(this, args, cx);
	return Expression.makeSimple(Record.initializer(cx.cx, this.recordType, argCode), this.resultType);
};
BaseConstructorCall.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	var argCode = checkArgs(this, args, cx);
	var code = CodeGenerator.mangleId(Record.constructor$(cx.cx, this.recordType)) + ".call(this, " + argCode + ");" + Stream.kCR;
	return Expression.makeSimple(code, null);
};

function fieldInitLval(field/*STRING*/){
	return "this." + Record.mangleField(field);
}
RecordInitCall.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	var e = ConstructorCall.prototype.make.call(this, args, cx);
	var t = RTL$.typeGuard(e.type(), Types.StorageType);
	return Expression.makeSimple(fieldInitLval(this.field) + " = " + e.code(), t);
};

function makeCallGenerator(recordType/*PRecord*/, resultType/*PType*/, cx/*PType*/, call/*PConstructorCall*/){
	call.recordType = recordType;
	call.resultType = resultType;
	var cons = EberonRecord.constructor$(recordType);
	if (cons != null){
		Array.prototype.splice.apply(call.args, [0, Number.MAX_VALUE].concat(cons.args()));
	}
	return Procedure.makeCallGenerator(call, cx);
}

function raiseSingleArgumentException(c/*NonRecordInitCall*/){
	Errors.raise("single argument expected to initialize field '" + c.field + "'");
}
NonRecordInitCall.prototype.handleArgument = function(e/*PType*/){
	var op = null;
	if (this.code.length != 0){
		raiseSingleArgumentException(this);
	}
	if (this.cx.language.types.implicitCast(e.type(), this.type, false, {set: function($v){op = $v;}, get: function(){return op;}}) != Cast.errNo){
		Errors.raise("type mismatch: field '" + this.field + "' is '" + this.type.description() + "' and cannot be initialized using '" + e.type().description() + "' expression");
	}
	var lval = fieldInitLval(this.field);
	this.code = lval + " = " + op.clone(this.cx, e);
};
NonRecordInitCall.prototype.end = function(){
	if (this.code.length == 0){
		raiseSingleArgumentException(this);
	}
	return Expression.makeSimple(this.code, null);
};

function makeConstructorCall(typeId/*PType*/, cx/*PType*/, forNew/*BOOLEAN*/){
	var call = new ConstructorCall();
	var resultType = typeId.type();
	var recordType = RTL$.typeGuard(resultType, EberonRecord.Record);
	var instType = EberonRecord.instantiateForVar;
	if (forNew){
		instType = EberonRecord.instantiateForNew;
	}
	EberonRecord.ensureCanBeInstantiated(cx.cx, recordType, instType);
	if (forNew){
		resultType = new Record.Pointer("", typeId);
	}
	return makeCallGenerator(recordType, resultType, cx, call);
}

function makeFieldInitCall(type/*PStorageType*/, cx/*PType*/, field/*STRING*/){
	var result = null;
	
	function initRecord(type/*PRecord*/){
		var call = new RecordInitCall();
		call.field = field;
		return makeCallGenerator(type, type, cx, call);
	}
	
	function initNonRecord(){
		var result = new NonRecordInitCall();
		result.cx = cx;
		result.field = field;
		result.type = type;
		return result;
	}
	if (type instanceof EberonRecord.Record){
		result = initRecord(type);
	}
	else {
		result = initNonRecord();
	}
	return result;
}

function makeBaseConstructorCall(type/*PRecord*/, cx/*PType*/){
	return makeCallGenerator(type, type, cx, new BaseConstructorCall());
}
exports.makeConstructorCall = makeConstructorCall;
exports.makeFieldInitCall = makeFieldInitCall;
exports.makeBaseConstructorCall = makeBaseConstructorCall;
