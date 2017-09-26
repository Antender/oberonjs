var RTL$ = require("eberon/eberon_rtl.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Errors = require("js/Errors.js");
var Scope = require("js/Scope.js");
var Symbols = require("js/Symbols.js");
var $scope = "EberonScope";
function Operator(){
	Scope.Type.apply(this, arguments);
	this.parent = null;
}
RTL$.extend(Operator, Scope.Type, $scope);
Operator.prototype.name = function(){
	return "operator";
};
Operator.prototype.addSymbol = function(s/*PSymbol*/, exported/*BOOLEAN*/){
	var id = s.id();
	var parent = this.parent;
	while (true){
		if (parent != null){
			var found = parent.findSymbol(id);
			if (found != null){
				Errors.raise("'" + id + "' already declared in " + found.scope().name() + " scope");
			}
			var next = parent;
			if (next instanceof Operator){
				parent = next.parent;
			}
			else {
				parent = null;
			}
		} else break;
	}
	Scope.Type.prototype.addSymbol.call(this, s, exported);
};
Operator.prototype.generateTempVar = function(pattern/*STRING*/){
	return this.parent.generateTempVar(pattern);
};

function makeOperator(parent/*PType*/, stdSymbols/*MAP OF PSymbol*/){
	var result = new Operator(stdSymbols);
	result.parent = parent;
	return result;
}

function startOperatorScope(cx/*Node*/){
	var root = cx.root();
	var scope = makeOperator(root.currentScope(), root.language().stdSymbols);
	root.pushScope(scope);
}

function endOperatorScope(cx/*Node*/){
	cx.root().popScope();
}
exports.makeOperator = makeOperator;
exports.startOperatorScope = startOperatorScope;
exports.endOperatorScope = endOperatorScope;
