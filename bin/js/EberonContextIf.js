var RTL$ = require("eberon/eberon_rtl.js");
var ContextIf = require("js/ContextIf.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var EberonOperatorScopes = require("js/EberonOperatorScopes.js");
var Object$ = require("js/Object.js");
var $scope = "EberonContextIf";
RTL$.extend(Type, ContextIf.Type, $scope);
function Type(parent/*PNode*/){
	ContextIf.Type.call(this, parent);
	this.scopes = new EberonOperatorScopes.Type(parent.root());
}
Type.prototype.handleLiteral = function(s/*STRING*/){
	ContextIf.Type.prototype.handleLiteral.call(this, s);
	if (s == "THEN"){
		this.scopes.doThen();
	}
	else if (s == "ELSIF" || s == "ELSE"){
		this.scopes.alternate();
	}
};
Type.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (!this.scopes.handleMessage(msg)){
		result = ContextIf.Type.prototype.handleMessage.call(this, msg);
	}
	return result;
};
Type.prototype.endParse = function(){
	this.scopes.reset();
	return ContextIf.Type.prototype.endParse.call(this);
};
exports.Type = Type;
