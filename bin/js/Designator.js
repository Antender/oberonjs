var Types = require("js/Types.js");
var $scope = "Designator";
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
function Type(code/*STRING*/, type/*PType*/, info/*PId*/){
	this.mCode = code;
	this.mType = type;
	this.mInfo = info;
}
exports.Type = Type;
