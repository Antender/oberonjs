var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var Context = require("js/Context.js");
var Designator = require("js/Designator.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var OberonRtl = require("js/OberonRtl.js");
var Record = require("js/Record.js");
var Symbols = require("js/Symbols.js");
var T = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "LanguageContext";
function CastOp(){
}
CastOp.prototype.$scope = $scope;
function Types(){
}
Types.prototype.$scope = $scope;
function ModuleGenerator(){
}
ModuleGenerator.prototype.$scope = $scope;
CodeTraits.prototype.$scope = $scope;
function Language(){
	this.moduleResolver = null;
	this.rtl = null;
	this.codeTraits = null;
	this.types = null;
	this.stdSymbols = {};
}
Language.prototype.$scope = $scope;
Type.prototype.$scope = $scope;
function Type(language/*PLanguage*/, cx/*PType*/){
	this.language = language;
	this.cx = cx;
}
function CodeTraits(code/*PIGenerator*/, rtl/*PType*/, checkIndexes/*BOOLEAN*/){
	this.code = code;
	this.rtl = rtl;
	this.checkIndexes = checkIndexes;
}
CodeTraits.prototype.generator = function(){
	return this.code;
};
CodeTraits.prototype.getAt = function(e/*STRING*/, index/*STRING*/, type/*PStorageType*/){
	var r = '';
	if (!this.checkIndexes){
		if (type == T.basic().ch){
			r = e + ".charCodeAt(" + index + ")";
		}
		else {
			r = e + "[" + index + "]";
		}
	}
	else {
		if (type == T.basic().ch){
			r = this.rtl.charAt(e, index);
		}
		else {
			r = this.rtl.getAt(e, index);
		}
	}
	return r;
};
CodeTraits.prototype.putAt = function(where/*STRING*/, index/*STRING*/, what/*STRING*/){
	var r = '';
	if (!this.checkIndexes){
		r = where + "[" + index + "] = " + what;
	}
	else {
		r = this.rtl.putAt(where, index, what);
	}
	return r;
};
CodeTraits.prototype.referenceCode = function(info/*VAR Id*/){
	var result = '';
	if (info instanceof T.DeclaredVariable){
		result = CodeGenerator.mangleId(info.id());
		if (info.type().isScalar() && !(info instanceof Variable.ArgumentVariable && info.var)){
			result = "{set: function($v){" + result + " = $v;}, get: function(){return " + result + ";}}";
		}
	}
	else if (info instanceof Variable.PropertyVariable){
		if (info.type().isScalar()){
			result = this.rtl.makeRef(info.leadCode, info.propCode);
		}
		else {
			result = this.getAt(info.leadCode, info.propCode, info.type());
		}
	}
	else if (info instanceof Variable.DerefVariable){
		result = info.code;
	}
	else if (info instanceof Record.FieldVariable){
		var codeId = Record.mangleField(info.field.id());
		if (info.type().isScalar()){
			result = this.rtl.makeRef(info.leadCode, Chars.doubleQuote + codeId + Chars.doubleQuote);
		}
		else {
			result = info.leadCode + "." + codeId;
		}
	}
	else {
		Errors.raise("cannot reference " + info.idType());
	}
	return result;
};
CodeTraits.prototype.assign = function(info/*VAR Id*/, right/*PType*/){
	var result = '';
	var rightCode = Expression.deref(right).code();
	if (info instanceof T.DeclaredVariable){
		var idCode = CodeGenerator.mangleId(info.id());
		if (info instanceof Variable.ArgumentVariable && info.var){
			result = idCode + ".set(" + rightCode + ")";
		}
		else {
			result = idCode + " = " + rightCode;
		}
	}
	else if (info instanceof Variable.PropertyVariable){
		result = this.putAt(info.leadCode, info.propCode, rightCode);
	}
	else if (info instanceof Record.FieldVariable){
		result = info.leadCode + "." + Record.mangleField(info.field.id()) + " = " + rightCode;
	}
	return result;
};
exports.CastOp = CastOp;
exports.Types = Types;
exports.ModuleGenerator = ModuleGenerator;
exports.CodeTraits = CodeTraits;
exports.Language = Language;
exports.Type = Type;
