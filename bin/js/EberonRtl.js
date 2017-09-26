var RTL$ = require("eberon/eberon_rtl.js");
var OberonRtl = require("js/OberonRtl.js");
var $scope = "EberonRtl";
function Type(){
	OberonRtl.Type.call(this);
}
RTL$.extend(Type, OberonRtl.Type, $scope);
exports.Type = Type;
