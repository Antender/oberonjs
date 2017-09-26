var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var Context = require("js/Context.js");
var Errors = require("js/Errors.js");
var Object$ = require("js/Object.js");
var ScopeBase = require("js/ScopeBase.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var $scope = "Record";
RTL$.extend(Type, Types.Record, $scope);
RTL$.extend(Field, Types.Field, $scope);
RTL$.extend(Pointer, Types.NamedType, $scope);
RTL$.extend(FieldVariable, Types.Variable, $scope);
var pGenerateTypeInfo = null;

function finalizeRecord(closure/*PType*/){
	RTL$.typeGuard(closure, Type).finalize();
}
Type.prototype.codeForNew = function(cx/*Type*/){
	return this.initializer(cx);
};
Type.prototype.finalize = function(){
	var $seq1 = this.notExported;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var f = $seq1[$key2];
		delete this.fields[f];
	}
	this.notExported.splice(0, Number.MAX_VALUE);
};
Type.prototype.isScalar = function(){
	return false;
};
function Type(name/*STRING*/, cons/*STRING*/, scope/*PType*/){
	Types.Record.call(this, name);
	this.fields = {};
	this.base = null;
	this.cons = cons;
	this.scope = scope;
	this.notExported = [];
	this.finalizedAsNonExported = false;
	scope.addFinalizer(finalizeRecord, this);
}
Type.prototype.description = function(){
	var result = '';
	if (this.name.length != 0){
		result = this.name;
	}
	else {
		result = "anonymous RECORD";
	}
	return result;
};

function constructor(cx/*Type*/, r/*Type*/){
	return cx.qualifyScope(r.scope) + r.cons;
}

function initializer(cx/*Type*/, r/*Type*/, args/*STRING*/){
	return "new " + constructor(cx, r) + "(" + args + ")";
}
Type.prototype.initializer = function(cx/*Type*/){
	return initializer(cx, this, "");
};
Type.prototype.addField = function(f/*PField*/){
	if (Object.prototype.hasOwnProperty.call(this.fields, f.id())){
		Errors.raise("duplicated field: '" + f.id() + "'");
	}
	if (this.base != null && this.base.findSymbol(f.id()) != null){
		Errors.raise("base record already has field: '" + f.id() + "'");
	}
	this.fields[f.id()] = f;
	if (!f.exported()){
		this.notExported.push(f.id());
	}
};
Type.prototype.findSymbol = function(id/*STRING*/){
	var result = null;
	if (Object.prototype.hasOwnProperty.call(this.fields, id)){
		result = RTL$.getMappedValue(this.fields, id);
	}
	else if (this.base != null){
		result = this.base.findSymbol(id);
	}
	return result;
};

function existingField(r/*Type*/, id/*STRING*/, d/*NamedType*/){
	var result = r.findSymbol(id);
	if (result == null){
		Errors.raise("type '" + d.description() + "' has no '" + id + "' field");
	}
	return result;
}
Type.prototype.denote = function(id/*STRING*/, isReadObly/*BOOLEAN*/){
	return existingField(this, id, this);
};
Type.prototype.setBase = function(type/*PType*/){
	this.base = type;
};

function mangleJSProperty(id/*STRING*/){
	var result = id;
	if (id == "constructor" || id == "prototype"){
		result = result + "$";
	}
	return result;
}

function mangleField(id/*STRING*/){
	return mangleJSProperty(id);
}

function dumpFields(type/*PType*/){
	var result = '';
	if (type.base != null){
		result = dumpFields(type.base);
	}
	var $seq1 = type.fields;
	for(var k in $seq1){
		var v = $seq1[k];
		if (result.length != 0){
			result = result + ", ";
		}
		result = result + mangleField(k) + ": " + pGenerateTypeInfo(v.type());
	}
	return result;
}

function generateTypeInfo(type/*PType*/){
	var result = '';
	if (type instanceof Type){
		result = "{record: {" + dumpFields(type) + "}}";
	}
	else if (type instanceof Types.Array){
		result = "{array: " + generateTypeInfo(type.elementsType) + "}";
	}
	else {
		result = "null";
	}
	return result;
}

function stripTypeId(id/*VAR Type*/){
	var r = id.type();
	if (r instanceof Type){
		r.finalizedAsNonExported = true;
	}
	else {
		id.reset(null);
	}
}
Field.prototype.id = function(){
	return this.mIdentdef.id();
};
Field.prototype.exported = function(){
	return this.mIdentdef.exported();
};
Field.prototype.identdef = function(){
	return this.mIdentdef;
};
Field.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	var codeId = mangleField(this.mIdentdef.id());
	return new Types.FieldCode(leadCode + "." + codeId, leadCode, Chars.doubleQuote + codeId + Chars.doubleQuote);
};
Field.prototype.type = function(){
	return this.mType;
};
Field.prototype.asVar = function(leadCode/*STRING*/, isReadOnly/*BOOLEAN*/, cx/*Type*/){
	return new FieldVariable(this, leadCode, isReadOnly);
};
function Field(identdef/*PIdentdefInfo*/, type/*PStorageType*/){
	Types.Field.call(this);
	this.mIdentdef = identdef;
	this.mType = type;
}

function pointerBase(p/*Pointer*/){
	return RTL$.typeGuard(p.base.type(), Type);
}
function Pointer(name/*STRING*/, base/*PType*/){
	Types.NamedType.call(this, name);
	this.base = base;
}
Pointer.prototype.description = function(){
	var result = '';
	if (this.name.length != 0){
		result = this.name;
	}
	else {
		result = "POINTER TO " + pointerBase(this).description();
	}
	return result;
};
Pointer.prototype.initializer = function(cx/*Type*/){
	return "null";
};
Pointer.prototype.denote = function(id/*STRING*/, isReadObly/*BOOLEAN*/){
	var d = null;
	var base = pointerBase(this);
	if (this.name.length == 0 || base.name.length != 0){
		d = base;
	}
	else {
		d = this;
	}
	return existingField(base, id, d);
};
Pointer.prototype.isScalar = function(){
	return true;
};
function FieldVariable(f/*PField*/, leadCode/*STRING*/, isReadOnly/*BOOLEAN*/){
	Types.Variable.call(this);
	this.field = f;
	this.leadCode = leadCode;
	this.readOnly = isReadOnly;
}
FieldVariable.prototype.idType = function(){
	var result = '';
	result = "record's field";
	if (this.readOnly){
		result = "read-only " + result;
	}
	return result;
};
FieldVariable.prototype.type = function(){
	return this.field.mType;
};
FieldVariable.prototype.isReference = function(){
	return false;
};
FieldVariable.prototype.isReadOnly = function(){
	return this.readOnly;
};
pGenerateTypeInfo = generateTypeInfo;
exports.Type = Type;
exports.Field = Field;
exports.Pointer = Pointer;
exports.FieldVariable = FieldVariable;
exports.constructor$ = constructor;
exports.initializer = initializer;
exports.mangleJSProperty = mangleJSProperty;
exports.mangleField = mangleField;
exports.dumpFields = dumpFields;
exports.generateTypeInfo = generateTypeInfo;
exports.stripTypeId = stripTypeId;
exports.pointerBase = pointerBase;
