var RTL$ = require("eberon/eberon_rtl.js");
var Context = require("js/Context.js");
var ContextVar = require("js/ContextVar.js");
var EberonContext = require("js/EberonContext.js");
var EberonRecord = require("js/EberonRecord.js");
var $scope = "EberonContextVar";
function Declaration(){
	ContextVar.Declaration.apply(this, arguments);
}
RTL$.extend(Declaration, ContextVar.Declaration, $scope);
Declaration.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	EberonContext.checkOrdinaryExport(RTL$.typeGuard(id, EberonContext.IdentdefInfo), "variable");
	ContextVar.Declaration.prototype.handleIdentdef.call(this, id);
};
Declaration.prototype.doInitCode = function(){
	var type = this.type;
	if (type instanceof EberonRecord.Record){
		EberonRecord.ensureCanBeInstantiated(this, type, EberonRecord.instantiateForVar);
	}
	return ContextVar.Declaration.prototype.doInitCode.call(this);
};
exports.Declaration = Declaration;
