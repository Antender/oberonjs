var RTL$ = require("eberon/eberon_rtl.js");
var EberonContextDesignator = require("js/EberonContextDesignator.js");
var EberonMap = require("js/EberonMap.js");
var EberonTypePromotion = require("js/EberonTypePromotion.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var Types = require("js/Types.js");
var $scope = "EberonLanguageContext";
function CodeTraits(){
	LanguageContext.CodeTraits.apply(this, arguments);
}
RTL$.extend(CodeTraits, LanguageContext.CodeTraits, $scope);
CodeTraits.prototype.referenceCode = function(info/*VAR Id*/){
	return info instanceof EberonContextDesignator.SelfVariable ? "this" : info instanceof EberonTypePromotion.Variable ? info.id() : info instanceof EberonMap.ElementVariable && !info.elementType.isScalar() ? info.rval : LanguageContext.CodeTraits.prototype.referenceCode.call(this, info);
};
CodeTraits.prototype.assign = function(info/*VAR Id*/, right/*PType*/){
	var result = '';
	if (info instanceof EberonMap.ElementVariable){
		result = info.lval + " = " + Expression.deref(right).code();
	}
	else {
		result = LanguageContext.CodeTraits.prototype.assign.call(this, info, right);
	}
	return result;
};
exports.CodeTraits = CodeTraits;
