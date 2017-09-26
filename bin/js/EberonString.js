var RTL$ = require("eberon/eberon_rtl.js");
var Types = require("js/Types.js");
var $scope = "EberonString";
function ElementVariable(){
	Types.Variable.call(this);
}
RTL$.extend(ElementVariable, Types.Variable, $scope);
var string = null;
ElementVariable.prototype.idType = function(){
	return "string element";
};
ElementVariable.prototype.isReadOnly = function(){
	return true;
};
ElementVariable.prototype.type = function(){
	return Types.basic().ch;
};
ElementVariable.prototype.isReference = function(){
	return false;
};

function makeElementVariable(){
	return new ElementVariable();
}
string = new Types.BasicType("STRING", "''");
exports.string = function(){return string;};
exports.makeElementVariable = makeElementVariable;
