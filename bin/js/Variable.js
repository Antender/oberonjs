var RTL$ = require("eberon/eberon_rtl.js");
var ScopeBase = require("js/ScopeBase.js");
var Types = require("js/Types.js");
var $scope = "Variable";
RTL$.extend(TypedVariable, Types.Variable, $scope);
RTL$.extend(Declared, Types.DeclaredVariable, $scope);
RTL$.extend(ArgumentVariable, Declared, $scope);
RTL$.extend(PropertyVariable, TypedVariable, $scope);
RTL$.extend(DerefVariable, TypedVariable, $scope);
RTL$.extend(ExportedVariable, TypedVariable, $scope);
TypedVariable.prototype.type = function(){
	return this.mType;
};
function Declared(id/*STRING*/, type/*PStorageType*/, scope/*PType*/){
	Types.DeclaredVariable.call(this);
	this.mType = type;
	this.mId = id;
	this.scope = scope;
}
Declared.prototype.isReference = function(){
	return false;
};
Declared.prototype.isReadOnly = function(){
	return false;
};
Declared.prototype.type = function(){
	return this.mType;
};
Declared.prototype.id = function(){
	return this.mId;
};
PropertyVariable.prototype.idType = function(){
	var result = '';
	result = "array's element";
	if (this.readOnly){
		result = "read-only " + result;
	}
	return result;
};
PropertyVariable.prototype.isReference = function(){
	return false;
};
PropertyVariable.prototype.isReadOnly = function(){
	return this.readOnly;
};
DerefVariable.prototype.isReference = function(){
	return true;
};
DerefVariable.prototype.isReadOnly = function(){
	return false;
};
function ExportedVariable(id/*STRING*/, type/*PStorageType*/){
	TypedVariable.call(this, type);
	this.id = id;
}
ExportedVariable.prototype.idType = function(){
	return "imported variable";
};
ExportedVariable.prototype.isReference = function(){
	return false;
};
ExportedVariable.prototype.isReadOnly = function(){
	return true;
};
function TypedVariable(type/*PStorageType*/){
	Types.Variable.call(this);
	this.mType = type;
}
function PropertyVariable(type/*PStorageType*/, leadCode/*STRING*/, propCode/*STRING*/, isReadOnly/*BOOLEAN*/){
	TypedVariable.call(this, type);
	this.leadCode = leadCode;
	this.propCode = propCode;
	this.readOnly = isReadOnly;
}
function DerefVariable(type/*PStorageType*/, code/*STRING*/){
	TypedVariable.call(this, type);
	this.code = code;
}
function ArgumentVariable(id/*STRING*/, type/*PStorageType*/, var$/*BOOLEAN*/){
	Declared.call(this, id, type, null);
	this.var = var$;
}
ArgumentVariable.prototype.idType = function(){
	var result = '';
	result = "formal parameter";
	if (!this.var){
		result = "non-VAR " + result;
	}
	return result;
};
ArgumentVariable.prototype.isReference = function(){
	return this.var;
};
ArgumentVariable.prototype.isReadOnly = function(){
	var r = false;
	if (!this.var){
		var t = this.type();
		r = t instanceof Types.Array || t instanceof Types.Record;
	}
	return r;
};
exports.TypedVariable = TypedVariable;
exports.Declared = Declared;
exports.ArgumentVariable = ArgumentVariable;
exports.PropertyVariable = PropertyVariable;
exports.DerefVariable = DerefVariable;
exports.ExportedVariable = ExportedVariable;
