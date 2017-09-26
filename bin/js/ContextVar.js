var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var Context = require("js/Context.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextType = require("js/ContextType.js");
var Errors = require("js/Errors.js");
var Object$ = require("js/Object.js");
var Symbols = require("js/Symbols.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "ContextVar";
function Declaration(){
	ContextType.DeclarationAndIdentHandle.apply(this, arguments);
	this.idents = [];
	this.type = null;
}
RTL$.extend(Declaration, ContextType.DeclarationAndIdentHandle, $scope);
Declaration.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	this.idents.push(id);
};
Declaration.prototype.typeName = function(){
	return "";
};
Declaration.prototype.setType = function(type/*PStorageType*/){
	this.type = type;
};
Declaration.prototype.exportField = function(name/*STRING*/){
	ContextType.checkIfFieldCanBeExported(name, this.idents, "variable");
};
Declaration.prototype.isAnonymousDeclaration = function(){
	return true;
};
Declaration.prototype.handleMessage = function(msg/*VAR Message*/){
	if (msg instanceof ContextType.ForwardTypeMsg){
		Errors.raise("type '" + msg.id + "' was not declared");
	}
	return ContextType.DeclarationAndIdentHandle.prototype.handleMessage.call(this, msg);
};
Declaration.prototype.doInitCode = function(){
	return this.type.initializer(this);
};
Declaration.prototype.endParse = function(){
	var gen = this.codeGenerator();
	var $seq1 = this.idents;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var id = $seq1[$key2];
		var varName = id.id();
		var scope = this.root().currentScope();
		var v = new Variable.Declared(varName, this.type, scope);
		scope.addSymbol(new Symbols.Symbol(varName, v), id.exported());
		gen.write("var " + CodeGenerator.mangleId(varName) + " = " + this.doInitCode() + ";");
	}
	gen.write(Chars.ln);
	return true;
};
exports.Declaration = Declaration;
