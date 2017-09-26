var ContextHierarchy = require("js/ContextHierarchy.js");
var EberonContextDesignator = require("js/EberonContextDesignator.js");
var EberonTypePromotion = require("js/EberonTypePromotion.js");
var $scope = "EberonContextTypePromotion";
function Type(){
	this.ignorePromotions = false;
	this.typePromotion = null;
	this.typePromotions = [];
}
Type.prototype.$scope = $scope;
Type.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = false;
	if (this.ignorePromotions){
	}
	else if (msg instanceof EberonContextDesignator.TransferPromotedTypesMsg){
		this.typePromotion = msg.promotion;
		this.typePromotions.push(this.typePromotion);
		result = true;
	}
	return result;
};
Type.prototype.doThen = function(){
	if (this.typePromotion != null){
		this.typePromotion.and();
	}
	this.ignorePromotions = true;
};
Type.prototype.alternate = function(){
	if (this.typePromotion != null){
		this.typePromotion.reset();
		this.typePromotion.or();
		this.typePromotion = null;
	}
	this.ignorePromotions = false;
};
Type.prototype.reset = function(){
	var $seq1 = this.typePromotions;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var p = $seq1[$key2];
		p.reset();
	}
};
exports.Type = Type;
