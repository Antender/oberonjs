var OberonRtl = require("js/OberonRtl.js");
var ScopeBase = require("js/ScopeBase.js");
var $scope = "Context";
function Type(){
}
Type.prototype.$scope = $scope;
IdentdefInfo.prototype.$scope = $scope;
IdentdefInfo.prototype.id = function(){
	return this.mId;
};
IdentdefInfo.prototype.exported = function(){
	return this.mExported;
};
function IdentdefInfo(id/*STRING*/, exported/*BOOLEAN*/){
	this.mId = id;
	this.mExported = exported;
}
exports.Type = Type;
exports.IdentdefInfo = IdentdefInfo;
