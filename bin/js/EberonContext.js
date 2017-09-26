var RTL$ = require("eberon/eberon_rtl.js");
var Context = require("js/Context.js");
var ContextConst = require("js/ContextConst.js");
var Errors = require("js/Errors.js");
var $scope = "EberonContext";
RTL$.extend(IdentdefInfo, Context.IdentdefInfo, $scope);
function ConstDeclaration(){
	ContextConst.Type.apply(this, arguments);
}
RTL$.extend(ConstDeclaration, ContextConst.Type, $scope);
IdentdefInfo.prototype.isReadOnly = function(){
	return this.ro;
};
function IdentdefInfo(id/*STRING*/, exported/*BOOLEAN*/, ro/*BOOLEAN*/){
	Context.IdentdefInfo.call(this, id, exported);
	this.ro = ro;
}

function checkOrdinaryExport(id/*IdentdefInfo*/, hint/*STRING*/){
	if (id.isReadOnly()){
		Errors.raise(hint + " cannot be exported as read-only using '-' mark (did you mean '*'?)");
	}
}
ConstDeclaration.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	checkOrdinaryExport(RTL$.typeGuard(id, IdentdefInfo), "constant");
	ContextConst.Type.prototype.handleIdentdef.call(this, id);
};
exports.IdentdefInfo = IdentdefInfo;
exports.ConstDeclaration = ConstDeclaration;
exports.checkOrdinaryExport = checkOrdinaryExport;
