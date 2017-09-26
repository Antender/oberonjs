var RTL$ = require("eberon/eberon_rtl.js");
var ContextVar = require("js/ContextVar.js");
var Errors = require("js/Errors.js");
var Types = require("js/Types.js");
var $scope = "OberonContextVar";
function Declaration(){
	ContextVar.Declaration.apply(this, arguments);
}
RTL$.extend(Declaration, ContextVar.Declaration, $scope);
exports.Declaration = Declaration;
