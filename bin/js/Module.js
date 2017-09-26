var RTL$ = require("eberon/eberon_rtl.js");
var Context = require("js/Context.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var Procedure = require("js/Procedure.js");
var Symbols = require("js/Symbols.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "Module";
function Type(){
	Types.Module.apply(this, arguments);
}
RTL$.extend(Type, Types.Module, $scope);
RTL$.extend(AnyType, Procedure.Type, $scope);
RTL$.extend(AnyVariable, Variable.TypedVariable, $scope);
RTL$.extend(AnyField, Types.Field, $scope);
function AnyProcCall(){
	Procedure.Call.call(this);
}
RTL$.extend(AnyProcCall, Procedure.Call, $scope);
function JS(){
	Type.apply(this, arguments);
}
RTL$.extend(JS, Type, $scope);
var doProcId = '';var varTypeId = '';
var any = null;
var anyVar = null;
var doProcSymbol = null;var varTypeSymbol = null;
AnyType.prototype.description = function(){
	return "JS.var";
};
AnyType.prototype.initializer = function(cx/*Type*/){
	return "undefined";
};

function makeCallGenerator(cx/*PType*/){
	return Procedure.makeCallGenerator(new AnyProcCall(), cx);
}
AnyType.prototype.callGenerator = function(cx/*PType*/){
	return makeCallGenerator(cx);
};
AnyType.prototype.denote = function(id/*STRING*/, isReadObly/*BOOLEAN*/){
	return new AnyField(id);
};
AnyType.prototype.designatorCode = function(id/*STRING*/){
	return id;
};
AnyType.prototype.isScalar = function(){
	return false;
};
AnyType.prototype.args = function(){
	var result = [];
	return result;
};
AnyType.prototype.result = function(){
	return null;
};
function AnyVariable(){
	Variable.TypedVariable.call(this, any);
}
AnyVariable.prototype.isReadOnly = function(){
	return false;
};
AnyVariable.prototype.isReference = function(){
	return true;
};
AnyField.prototype.id = function(){
	return "any field";
};
AnyField.prototype.exported = function(){
	return false;
};
AnyField.prototype.type = function(){
	return any;
};
AnyField.prototype.asVar = function(leadCode/*STRING*/, isReadOnly/*BOOLEAN*/, cx/*Type*/){
	return anyVar;
};
AnyField.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	return new Types.FieldCode(leadCode + "." + this.mId, "", "");
};
AnyProcCall.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	var argCode = Procedure.makeArgumentsCode(cx);
	var $seq1 = args;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var a = $seq1[$key2];
		argCode.write(a, null, null);
	}
	return Expression.makeSimple("(" + argCode.result() + ")", any);
};
JS.prototype.findSymbol = function(id/*STRING*/){
	var result = null;
	if (id == doProcId){
		result = doProcSymbol;
	}
	else if (id == varTypeId){
		result = varTypeSymbol;
	}
	else {
		result = new Symbols.Symbol(id, new Procedure.Id(any, id, false));
	}
	return new Symbols.FoundSymbol(result, null);
};

function makeVarTypeSymbol(){
	return new Symbols.Symbol(varTypeId, new TypeId.Type(any));
}

function makeDoProcSymbol(){
	var $scope1 = $scope + ".makeDoProcSymbol";
	function Call(){
		Procedure.StdCall.call(this);
	}
	RTL$.extend(Call, Procedure.StdCall, $scope1);
	function Proc(){
		Procedure.Std.apply(this, arguments);
	}
	RTL$.extend(Proc, Procedure.Std, $scope1);
	var description = '';
	Call.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		var arg = null;
		var type = null;
		arg = Procedure.checkSingleArgument(args, this, cx.language.types, null);
		type = arg.type();
		if (!(type instanceof Types.String)){
			Errors.raise("string is expected as an argument of " + description + ", got " + type.description());
		}
		return Expression.makeSimple(Types.stringValue(RTL$.typeGuard(type, Types.String)), null);
	};
	Proc.prototype.description = function(){
		return description;
	};
	description = "JS predefined procedure 'do'";
	var call = new Call();
	Procedure.hasArgumentWithCustomType(call);
	return Procedure.makeStdSymbol(new Procedure.Std("", call));
}

function makeJS(){
	return new JS("JS");
}
function AnyType(){
	Procedure.Type.call(this, "any type");
}
function AnyField(id/*STRING*/){
	Types.Field.call(this);
	this.mId = id;
}

function assertProcStatementResult(type/*PType*/){
	if (type != null && !(type instanceof AnyType)){
		Errors.raise("procedure returning a result cannot be used as a statement");
	}
}
doProcId = "do";
varTypeId = "var";
any = new AnyType();
anyVar = new AnyVariable();
doProcSymbol = makeDoProcSymbol();
varTypeSymbol = makeVarTypeSymbol();
exports.Type = Type;
exports.makeJS = makeJS;
exports.assertProcStatementResult = assertProcStatementResult;
