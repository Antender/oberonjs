var RTL$ = require("eberon/eberon_rtl.js");
var Types = require("js/Types.js");
var Object$ = require("js/Object.js");
var $scope = "TypeId";
RTL$.extend(Type, Types.Id, $scope);
RTL$.extend(Forward, Type, $scope);
RTL$.extend(Lazy, Type, $scope);
Type.prototype.description = function(){
	return "type " + this.type().description();
};
Type.prototype.type = function(){
	return this.mType;
};
Type.prototype.reset = function(type/*PStorageType*/){
	this.mType = type;
};
function Forward(resolve/*ResolveTypeCallback*/, closure/*PType*/){
	Type.call(this, null);
	this.resolve = resolve;
	this.closure = closure;
}
Forward.prototype.type = function(){
	if (this.mType == null){
		this.mType = this.resolve(this.closure);
	}
	return this.mType;
};

function define(tId/*VAR Lazy*/, t/*PStorageType*/){
	tId.mType = t;
}
Type.prototype.idType = function(){
	return "type";
};
function Type(type/*PStorageType*/){
	Types.Id.call(this);
	this.mType = type;
}
function Lazy(){
	Type.call(this, null);
}
exports.Type = Type;
exports.Forward = Forward;
exports.Lazy = Lazy;
exports.define = define;
