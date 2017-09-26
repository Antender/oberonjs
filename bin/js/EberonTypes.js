var RTL$ = require("eberon/eberon_rtl.js");
var Context = require("js/Context.js");
var LanguageContext = require("js/LanguageContext.js");
var Procedure = require("js/Procedure.js");
var Record = require("js/Record.js");
var Types = require("js/Types.js");
var $scope = "EberonTypes";
RTL$.extend(MethodType, Procedure.Std, $scope);
function MethodVariable(){
	Types.ProcedureId.apply(this, arguments);
}
RTL$.extend(MethodVariable, Types.ProcedureId, $scope);
RTL$.extend(MethodField, Types.Field, $scope);
MethodType.prototype.designatorCode = function(id/*STRING*/){
	return id;
};
MethodType.prototype.procType = function(){
	return this.type;
};
MethodType.prototype.description = function(){
	return "method '" + this.name + "'";
};
MethodType.prototype.callGenerator = function(cx/*PType*/){
	return this.call(cx, this.type);
};
function MethodType(id/*STRING*/, t/*PType*/, call/*CallGenerator*/){
	Procedure.Std.call(this, id, null);
	this.type = null;
	this.call = null;
	this.type = t;
	this.call = call;
}
MethodVariable.prototype.idType = function(){
	return this.type.description();
};
MethodVariable.prototype.canBeReferenced = function(){
	return false;
};
function MethodField(method/*PMethod*/){
	Types.Field.call(this);
	this.method = method;
}
MethodField.prototype.id = function(){
	return this.method.name;
};
MethodField.prototype.exported = function(){
	return false;
};
MethodField.prototype.type = function(){
	return this.method;
};
MethodField.prototype.asVar = function(leadCode/*STRING*/, isReadOnly/*BOOLEAN*/, cx/*Type*/){
	return new MethodVariable(this.method);
};
MethodField.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	return new Types.FieldCode(leadCode + "." + Record.mangleField(this.method.name), "", "");
};
exports.MethodType = MethodType;
exports.MethodVariable = MethodVariable;
exports.MethodField = MethodField;
