var RTL$ = require("eberon/eberon_rtl.js");
var Context = require("js/Context.js");
var ContextIdentdef = require("js/ContextIdentdef.js");
var EberonContext = require("js/EberonContext.js");
var $scope = "EberonContextIdentdef";
function Type(){
	ContextIdentdef.Type.apply(this, arguments);
	this.ro = false;
}
RTL$.extend(Type, ContextIdentdef.Type, $scope);
Type.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "-"){
		this.ro = true;
	}
	ContextIdentdef.Type.prototype.handleLiteral.call(this, s);
};
Type.prototype.doMakeIdendef = function(){
	return new EberonContext.IdentdefInfo(this.id, this.export, this.ro);
};
exports.Type = Type;
