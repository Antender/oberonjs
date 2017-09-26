var RTL$ = require("eberon/eberon_rtl.js");
var Object$ = require("js/Object.js");
var ScopeBase = require("js/ScopeBase.js");
var Types = require("js/Types.js");
var TypeId = require("js/TypeId.js");
var $scope = "Symbols";
RTL$.extend(Symbol, Object$.Type, $scope);
FoundSymbol.prototype.$scope = $scope;
Symbol.prototype.id = function(){
	return this.mId;
};
Symbol.prototype.info = function(){
	return this.mInfo;
};
Symbol.prototype.isModule = function(){
	return this.mInfo instanceof Types.Module;
};
Symbol.prototype.isVariable = function(){
	return this.mInfo instanceof Types.Variable;
};
Symbol.prototype.isConst = function(){
	return this.mInfo instanceof Types.Const;
};
Symbol.prototype.isType = function(){
	return this.mInfo instanceof TypeId.Type;
};
Symbol.prototype.isProcedure = function(){
	return this.mInfo instanceof Types.ProcedureId;
};
FoundSymbol.prototype.scope = function(){
	return this.mScope;
};
FoundSymbol.prototype.symbol = function(){
	return this.mSymbol;
};
function Symbol(id/*STRING*/, info/*PId*/){
	Object$.Type.call(this);
	this.mId = id;
	this.mInfo = info;
}
function FoundSymbol(s/*PSymbol*/, scope/*PType*/){
	this.mSymbol = s;
	this.mScope = scope;
}
exports.Symbol = Symbol;
exports.FoundSymbol = FoundSymbol;
