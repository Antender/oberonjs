var RTL$ = require("eberon/eberon_rtl.js");
var $scope = "ConstValue";
function Type(){
}
Type.prototype.$scope = $scope;
RTL$.extend(Int, Type, $scope);
RTL$.extend(Real, Type, $scope);
RTL$.extend(Set, Type, $scope);
RTL$.extend(String, Type, $scope);
function Int(n/*INTEGER*/){
	Type.call(this);
	this.value = n;
}
function Real(r/*REAL*/){
	Type.call(this);
	this.value = r;
}
function Set(s/*SET*/){
	Type.call(this);
	this.value = s;
}
function String(s/*STRING*/){
	Type.call(this);
	this.value = s;
}
exports.Type = Type;
exports.Int = Int;
exports.Real = Real;
exports.Set = Set;
exports.String = String;
