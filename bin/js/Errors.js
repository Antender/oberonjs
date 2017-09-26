var JS = GLOBAL;
var $scope = "Errors";
function Error(){
}
Error.prototype.$scope = $scope;

function raise(msg/*STRING*/){
	throw new Error(msg);
}
Error = function(msg){this.__msg = msg;};
Error.prototype.toString = function(){return this.__msg;};;
exports.Error = Error;
exports.raise = raise;
