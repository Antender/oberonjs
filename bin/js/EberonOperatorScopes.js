var ContextHierarchy = require("js/ContextHierarchy.js");
var EberonContextTypePromotion = require("js/EberonContextTypePromotion.js");
var EberonScope = require("js/EberonScope.js");
var Scope = require("js/Scope.js");
var $scope = "EberonOperatorScopes";
Type.prototype.$scope = $scope;

function newScope(root/*PRoot*/){
	var scope = EberonScope.makeOperator(root.currentScope(), root.language().stdSymbols);
	root.pushScope(scope);
	return scope;
}
function Type(root/*PRoot*/){
	this.root = root;
	this.typePromotion = new EberonContextTypePromotion.Type();
	this.scope = newScope(root);
}
Type.prototype.handleMessage = function(msg/*VAR Message*/){
	return this.typePromotion.handleMessage(msg);
};
Type.prototype.doThen = function(){
	this.typePromotion.doThen();
};
Type.prototype.alternate = function(){
	var root = this.root;
	if (this.scope != null){
		root.popScope();
	}
	this.scope = newScope(root);
	this.typePromotion.alternate();
};
Type.prototype.reset = function(){
	this.root.popScope();
	this.typePromotion.reset();
};
exports.Type = Type;
