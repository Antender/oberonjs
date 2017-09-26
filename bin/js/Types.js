var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var ConstValue = require("js/ConstValue.js");
var Context = require("js/Context.js");
var Errors = require("js/Errors.js");
var OberonRtl = require("js/OberonRtl.js");
var Object$ = require("js/Object.js");
var Str = require("js/String.js");
var $scope = "Types";
function Id(){
	Object$.Type.call(this);
}
RTL$.extend(Id, Object$.Type, $scope);
function Type(){
	Object$.Type.call(this);
}
RTL$.extend(Type, Object$.Type, $scope);
RTL$.extend(Const, Id, $scope);
function Variable(){
	Id.call(this);
}
RTL$.extend(Variable, Id, $scope);
function DeclaredVariable(){
	Variable.call(this);
}
RTL$.extend(DeclaredVariable, Variable, $scope);
RTL$.extend(ProcedureId, Id, $scope);
RTL$.extend(String, Type, $scope);
FieldCode.prototype.$scope = $scope;
function Field(){
}
Field.prototype.$scope = $scope;
function StorageType(){
	Type.call(this);
}
RTL$.extend(StorageType, Type, $scope);
RTL$.extend(NamedType, StorageType, $scope);
function Record(){
	NamedType.apply(this, arguments);
}
RTL$.extend(Record, NamedType, $scope);
RTL$.extend(Array, NamedType, $scope);
function OpenArray(){
	Array.apply(this, arguments);
}
RTL$.extend(OpenArray, Array, $scope);
RTL$.extend(StaticArray, Array, $scope);
ProcedureArgument.prototype.$scope = $scope;
function Procedure(){
	NamedType.apply(this, arguments);
}
RTL$.extend(Procedure, NamedType, $scope);
RTL$.extend(BasicType, NamedType, $scope);
function Nil(){
	Type.call(this);
}
RTL$.extend(Nil, Type, $scope);
RTL$.extend(Module, Id, $scope);
function anonymous$1(){
	this.bool = null;
	this.ch = null;
	this.integer = null;
	this.uint8 = null;
	this.real = null;
	this.set = null;
}
anonymous$1.prototype.$scope = $scope;
var basic = new anonymous$1();
var numeric = [];
var nil = null;

function typeName(type/*NamedType*/){
	return type.name;
}
ProcedureId.prototype.idType = function(){
	return "procedure";
};
String.prototype.description = function(){
	var prefix = '';
	if (this.s.length == 1){
		prefix = "single-";
	}
	else {
		prefix = "multi-";
	}
	return prefix + "character string";
};

function stringValue(s/*String*/){
	return s.s;
}

function stringLen(s/*String*/){
	return s.s.length;
}

function stringAsChar(s/*String*/, c/*VAR CHAR*/){
	var result = false;
	result = stringLen(s) == 1;
	if (result){
		c.set(s.s.charCodeAt(0));
	}
	return result;
}
Const.prototype.idType = function(){
	return "constant";
};
Variable.prototype.idType = function(){
	return "variable";
};
BasicType.prototype.description = function(){
	return this.name;
};
BasicType.prototype.initializer = function(cx/*Type*/){
	return this.mInitializer;
};
BasicType.prototype.isScalar = function(){
	return true;
};
Nil.prototype.description = function(){
	return "NIL";
};

function isInt(t/*PType*/){
	return t == basic.integer || t == basic.uint8;
}

function intsDescription(){
	return "'INTEGER' or 'BYTE'";
}

function isString(t/*PType*/){
	return t instanceof Array && t.elementsType == basic.ch || t instanceof String;
}
function BasicType(name/*STRING*/, initializer/*STRING*/){
	NamedType.call(this, name);
	this.mInitializer = initializer;
}

function foldArrayDimensions(a/*VAR Array*/, dimToStr/*ArrayDimensionDescriptionCallback*/, sizes/*VAR STRING*/, of/*VAR STRING*/){
	var elementsType = a.elementsType;
	if (!(a instanceof OpenArray) && elementsType instanceof Array){
		foldArrayDimensions(elementsType, dimToStr, sizes, of);
		sizes.set(dimToStr(a) + ", " + sizes.get());
	}
	else {
		sizes.set(dimToStr(a));
		of.set(a.elementsType.description());
	}
}

function arrayDimensionDescription(a/*VAR Array*/){
	var result = '';
	if (a instanceof StaticArray){
		result = Str.fromInt(a.length());
	}
	return result;
}

function arrayDescription(a/*VAR Array*/, dimToStr/*ArrayDimensionDescriptionCallback*/){
	var result = '';
	var sizes = '';var of = '';
	if (a.elementsType == null){
		result = a.name;
	}
	else {
		foldArrayDimensions(a, dimToStr, {set: function($v){sizes = $v;}, get: function(){return sizes;}}, {set: function($v){of = $v;}, get: function(){return of;}});
		if (sizes.length != 0){
			sizes = " " + sizes;
		}
		result = "ARRAY" + sizes + " OF " + of;
	}
	return result;
}
Array.prototype.description = function(){
	return arrayDescription(this, arrayDimensionDescription);
};
Array.prototype.isScalar = function(){
	return false;
};

function raiseUnexpectedSelector(id/*STRING*/, obj/*STRING*/){
	Errors.raise("selector '." + id + "' cannot be applied to '" + obj + "'");
}
StorageType.prototype.denote = function(id/*STRING*/, isReadOnly/*BOOLEAN*/){
	raiseUnexpectedSelector(id, this.description());
	return null;
};
OpenArray.prototype.initializer = function(cx/*Type*/){
	return "";
};
StaticArray.prototype.initializer = function(cx/*Type*/){
	return this.mInitializer;
};
StaticArray.prototype.length = function(){
	return this.len;
};
Procedure.prototype.initializer = function(cx/*Type*/){
	return "null";
};
Procedure.prototype.description = function(){
	return this.name;
};
Procedure.prototype.isScalar = function(){
	return true;
};
ProcedureArgument.prototype.description = function(){
	var result = '';
	if (this.isVar){
		result = "VAR ";
	}
	return result + this.type.description();
};
function ProcedureArgument(type/*PStorageType*/, isVar/*BOOLEAN*/){
	this.type = type;
	this.isVar = isVar;
}
Module.prototype.idType = function(){
	return "MODULE";
};
function String(s/*STRING*/){
	Type.call(this);
	this.s = s;
}
function NamedType(name/*STRING*/){
	StorageType.call(this);
	this.name = name;
}
function Array(elementsType/*PStorageType*/){
	NamedType.call(this, "");
	this.elementsType = elementsType;
}
function StaticArray(initializer/*STRING*/, elementsType/*PStorageType*/, len/*INTEGER*/){
	Array.call(this, elementsType);
	this.mInitializer = initializer;
	this.len = len;
}
function Const(type/*PType*/, value/*PType*/){
	Id.call(this);
	this.type = type;
	this.value = value;
}
function ProcedureId(type/*PProcedure*/){
	Id.call(this);
	this.type = type;
}
function Module(name/*STRING*/){
	Id.call(this);
	this.name = name;
}
function FieldCode(code/*STRING*/, derefCode/*STRING*/, propCode/*STRING*/){
	this.code = code;
	this.derefCode = derefCode;
	this.propCode = propCode;
}
basic.bool = new BasicType("BOOLEAN", "false");
basic.ch = new BasicType("CHAR", "0");
basic.integer = new BasicType("INTEGER", "0");
basic.uint8 = new BasicType("BYTE", "0");
basic.real = new BasicType("REAL", "0");
basic.set = new BasicType("SET", "0");
numeric.push(basic.integer);
numeric.push(basic.uint8);
numeric.push(basic.real);
nil = new Nil();
exports.Id = Id;
exports.Type = Type;
exports.Const = Const;
exports.Variable = Variable;
exports.DeclaredVariable = DeclaredVariable;
exports.ProcedureId = ProcedureId;
exports.String = String;
exports.FieldCode = FieldCode;
exports.Field = Field;
exports.StorageType = StorageType;
exports.NamedType = NamedType;
exports.Record = Record;
exports.Array = Array;
exports.OpenArray = OpenArray;
exports.StaticArray = StaticArray;
exports.ProcedureArgument = ProcedureArgument;
exports.Procedure = Procedure;
exports.BasicType = BasicType;
exports.Module = Module;
exports.basic = function(){return basic;};
exports.numeric = function(){return numeric;};
exports.nil = function(){return nil;};
exports.typeName = typeName;
exports.stringValue = stringValue;
exports.stringLen = stringLen;
exports.stringAsChar = stringAsChar;
exports.isInt = isInt;
exports.intsDescription = intsDescription;
exports.isString = isString;
exports.arrayDimensionDescription = arrayDimensionDescription;
exports.arrayDescription = arrayDescription;
exports.raiseUnexpectedSelector = raiseUnexpectedSelector;
