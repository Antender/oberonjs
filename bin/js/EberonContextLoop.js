var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ContextLoop = require("js/ContextLoop.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var EberonContextDesignator = require("js/EberonContextDesignator.js");
var EberonMap = require("js/EberonMap.js");
var EberonOperatorScopes = require("js/EberonOperatorScopes.js");
var EberonScope = require("js/EberonScope.js");
var EberonString = require("js/EberonString.js");
var Object$ = require("js/Object.js");
var Scope = require("js/Scope.js");
var Symbols = require("js/Symbols.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "EberonContextLoop";
RTL$.extend(While, ContextLoop.While, $scope);
RTL$.extend(Repeat, ContextLoop.Repeat, $scope);
RTL$.extend(For, ContextLoop.For, $scope);
function ForEachVariable(){
	Variable.TypedVariable.apply(this, arguments);
}
RTL$.extend(ForEachVariable, Variable.TypedVariable, $scope);
RTL$.extend(ForEach, ContextExpression.ExpressionHandler, $scope);
function While(parent/*PNode*/){
	ContextLoop.While.call(this, parent);
	this.scopes = new EberonOperatorScopes.Type(parent.root());
}
While.prototype.handleLiteral = function(s/*STRING*/){
	ContextLoop.While.prototype.handleLiteral.call(this, s);
	if (s == "DO"){
		this.scopes.doThen();
	}
	else if (s == "ELSIF"){
		this.scopes.alternate();
	}
};
While.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (!this.scopes.handleMessage(msg)){
		result = ContextLoop.While.prototype.handleMessage.call(this, msg);
	}
	return result;
};
While.prototype.endParse = function(){
	this.scopes.reset();
	return ContextLoop.While.prototype.endParse.call(this);
};
function Repeat(parent/*PNode*/){
	ContextLoop.Repeat.call(this, parent);
	EberonScope.startOperatorScope(this);
}
Repeat.prototype.endParse = function(){
	EberonScope.endOperatorScope(this);
	return true;
};
function For(parent/*PNode*/){
	ContextLoop.For.call(this, parent);
	EberonScope.startOperatorScope(this);
}
For.prototype.handleInPlaceInit = function(symbol/*PSymbol*/, code/*STRING*/){
	this.doHandleInitCode(symbol.id(), "for (" + code);
	this.doHandleInitExpression(RTL$.typeGuard(symbol.info(), Types.Variable).type());
};
For.prototype.endParse = function(){
	EberonScope.endOperatorScope(this);
	return ContextLoop.For.prototype.endParse.call(this);
};
ForEachVariable.prototype.idType = function(){
	return "FOR variable";
};
ForEachVariable.prototype.isReference = function(){
	return false;
};
ForEachVariable.prototype.isReadOnly = function(){
	return true;
};
function ForEach(parent/*PNode*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	this.keyId = '';
	this.valueId = '';
	this.code = CodeGenerator.nullGenerator();
	this.scopeWasCreated = false;
}
ForEach.prototype.handleIdent = function(id/*STRING*/){
	if (this.keyId.length == 0){
		this.keyId = id;
	}
	else {
		this.valueId = id;
	}
};
ForEach.prototype.codeGenerator = function(){
	return this.code;
};

function makeVariable(id/*STRING*/, type/*PStorageType*/, scope/*PType*/){
	var v = new ForEachVariable(type);
	var s = new Symbols.Symbol(id, v);
	scope.addSymbol(s, false);
}
ForEach.prototype.handleExpression = function(e/*PType*/){
	var elementsType = null;
	var isString = false;
	var type = e.type();
	if (type instanceof Types.Array){
		elementsType = type.elementsType;
	}
	else if (type == EberonString.string() || Types.isString(type)){
		elementsType = Types.basic().ch;
		isString = true;
	}
	else {
		Errors.raise("expression of type ARRAY, STRING or MAP is expected in FOR, got '" + type.description() + "'");
	}
	var root = this.root();
	var currentScope = root.currentScope();
	var scope = EberonScope.makeOperator(currentScope, root.language().stdSymbols);
	root.pushScope(scope);
	this.scopeWasCreated = true;
	var code = this.parent().codeGenerator();
	var mapVar = currentScope.generateTempVar("seq");
	code.write("var " + mapVar + " = " + e.code() + ";" + Chars.ln);
	var keyId = this.keyId;
	var valueId = this.valueId;
	if (valueId.length == 0){
		valueId = keyId;
		keyId = currentScope.generateTempVar("key");
	}
	var isMap = type instanceof EberonMap.Type;
	if (isMap){
		code.write("for(var " + keyId + " in " + mapVar + ")");
	}
	else {
		code.write("for(var " + keyId + " = 0; " + keyId + " < " + mapVar + ".length; ++" + keyId + ")");
	}
	code.openScope();
	code.write("var " + valueId + " = " + mapVar);
	if (isString){
		code.write(".charCodeAt(" + keyId + ")");
	}
	else {
		code.write("[" + keyId + "];");
	}
	code.write(Chars.ln);
	this.code = code;
	var keyType = Types.basic().integer;
	if (isMap){
		keyType = EberonString.string();
	}
	if (valueId.length != 0){
		makeVariable(keyId, keyType, scope);
	}
	makeVariable(valueId, elementsType, scope);
};
ForEach.prototype.endParse = function(){
	this.code.closeScope("");
	if (this.scopeWasCreated){
		this.root().popScope();
	}
	return true;
};
exports.While = While;
exports.Repeat = Repeat;
exports.For = For;
exports.ForEach = ForEach;
