var ConstValue = require("js/ConstValue.js");
var Precedence = require("js/CodePrecedence.js");
var Types = require("js/Types.js");
var $scope = "Expression";
Type.prototype.$scope = $scope;
Type.prototype.code = function(){
	return this.mCode;
};
Type.prototype.type = function(){
	return this.mType;
};
Type.prototype.info = function(){
	return this.mInfo;
};
Type.prototype.constValue = function(){
	return this.mConstValue;
};
Type.prototype.maxPrecedence = function(){
	return this.mMaxPrecedence;
};
Type.prototype.isTerm = function(){
	return this.mInfo == null && this.mMaxPrecedence == Precedence.none;
};
function Type(code/*STRING*/, type/*PType*/, info/*PId*/, constValue/*PType*/, maxPrecedence/*INTEGER*/){
	this.mCode = code;
	this.mType = type;
	this.mInfo = info;
	this.mConstValue = constValue;
	this.mMaxPrecedence = maxPrecedence;
}

function make(code/*STRING*/, type/*PType*/, info/*PId*/, constValue/*PType*/){
	return new Type(code, type, info, constValue, Precedence.none);
}

function makeSimple(code/*STRING*/, type/*PType*/){
	return make(code, type, null, null);
}

function derefCode(code/*STRING*/){
	return code + ".get()";
}

function deref(e/*PType*/){
	var result = e;
	var info = e.mInfo;
	var type = e.mType;
	if (info != null && !(type instanceof Types.Array || type instanceof Types.Record)){
		if (info instanceof Types.Variable && info.isReference()){
			result = makeSimple(derefCode(e.code()), type);
		}
	}
	return result;
}

function isTemporary(e/*Type*/){
	return e.mInfo == null;
}
exports.Type = Type;
exports.make = make;
exports.makeSimple = makeSimple;
exports.derefCode = derefCode;
exports.deref = deref;
exports.isTemporary = isTemporary;
