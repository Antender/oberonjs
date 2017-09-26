var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var Context = require("js/Context.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextType = require("js/ContextType.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var ExpressionTree = require("js/ExpressionTree.js");
var LanguageContext = require("js/LanguageContext.js");
var Object$ = require("js/Object.js");
var Procedure = require("js/Procedure.js");
var Scope = require("js/Scope.js");
var Symbols = require("js/Symbols.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "ContextProcedure";
RTL$.extend(Declaration, ContextType.DeclarationAndIdentHandle, $scope);
RTL$.extend(FormalParameters, ContextHierarchy.Node, $scope);
function FormalParametersProcDecl(){
	FormalParameters.apply(this, arguments);
}
RTL$.extend(FormalParametersProcDecl, FormalParameters, $scope);
function DefinedParameters(){
	ContextType.HandleSymbolAsType.apply(this, arguments);
	this.isVar = false;
	this.argNamesForType = [];
}
RTL$.extend(DefinedParameters, ContextType.HandleSymbolAsType, $scope);
function Return(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
}
RTL$.extend(Return, ContextExpression.ExpressionHandler, $scope);
RTL$.extend(AddArgumentMsg, ContextHierarchy.Message, $scope);
function EndParametersMsg(){
	ContextHierarchy.Message.call(this);
}
RTL$.extend(EndParametersMsg, ContextHierarchy.Message, $scope);
function Declaration(parent/*PNode*/){
	ContextType.DeclarationAndIdentHandle.call(this, parent);
	this.outerScope = this.root().currentScope();
	this.id = null;
	this.type = null;
	this.multipleArguments = false;
	this.returnParsed = false;
	this.scopeInfo = null;
}

function handleIdentdef(d/*VAR Declaration*/, id/*PIdentdefInfo*/){
	d.id = id;
	d.codeGenerator().write(d.doProlog());
	var root = d.root();
	root.pushScope(new Scope.Procedure(root.language().stdSymbols));
}
Declaration.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	handleIdentdef(this, id);
};
Declaration.prototype.handleIdent = function(id/*STRING*/){
	var expectId = this.id.id();
	if (expectId != id){
		Errors.raise("mismatched procedure names: '" + expectId + "' at the begining and '" + id + "' at the end");
	}
};
Declaration.prototype.doProlog = function(){
	return Chars.ln + "function " + CodeGenerator.mangleId(this.id.id()) + "(";
};
Declaration.prototype.doEpilog = function(){
	return "";
};
Declaration.prototype.doBeginBody = function(){
	var code = this.codeGenerator();
	code.openScope();
	this.scopeInfo = new ContextType.ScopeInfoGenerator(this.id.id(), code, this.parent());
};
Declaration.prototype.typeName = function(){
	return "";
};
Declaration.prototype.setType = function(type/*PStorageType*/){
	var t = RTL$.typeGuard(type, Procedure.Type);
	var id = this.id.id();
	var procSymbol = new Symbols.Symbol(id, new Procedure.Id(t, id, this.outerScope instanceof Scope.Procedure));
	this.outerScope.addSymbol(procSymbol, this.id.exported());
	this.type = t;
};

function addArgument(declaration/*VAR Declaration*/, name/*STRING*/, arg/*ProcedureArgument*/){
	if (name == declaration.id.id()){
		Errors.raise("argument '" + name + "' has the same name as procedure");
	}
	var v = declaration.doMakeArgumentVariable(arg, name);
	var s = new Symbols.Symbol(name, v);
	declaration.root().currentScope().addSymbol(s, false);
	var code = declaration.codeGenerator();
	if (declaration.multipleArguments){
		code.write(", ");
	}
	else {
		declaration.multipleArguments = true;
	}
	code.write(CodeGenerator.mangleId(name) + "/*" + arg.description() + "*/");
}
Declaration.prototype.doMakeArgumentVariable = function(arg/*ProcedureArgument*/, name/*STRING*/){
	return new Variable.ArgumentVariable(name, arg.type, arg.isVar);
};
Declaration.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (msg instanceof EndParametersMsg){
		this.codeGenerator().write(")");
		this.doBeginBody();
	}
	else if (msg instanceof AddArgumentMsg){
		RTL$.assert(msg.arg != null);
		addArgument(this, msg.name, msg.arg);
	}
	else if (ContextType.handleDescribeScopeMsg(msg, this.scopeInfo)){
	}
	else {
		result = ContextType.DeclarationAndIdentHandle.prototype.handleMessage.call(this, msg);
	}
	return result;
};
Declaration.prototype.doMakeReturnCode = function(e/*PType*/, op/*CastOp*/){
	return op.clone(ContextHierarchy.makeLanguageContext(this), e);
};
Declaration.prototype.handleReturn = function(e/*PType*/){
	var op = null;
	var type = e.type();
	var result = this.type.result();
	if (result == null){
		Errors.raise("unexpected RETURN in PROCEDURE declared with no result type");
	}
	var language = this.root().language();
	if (language.types.implicitCast(type, result, false, {set: function($v){op = $v;}, get: function(){return op;}}) != Cast.errNo){
		Errors.raise("RETURN '" + result.description() + "' expected, got '" + type.description() + "'");
	}
	this.codeGenerator().write("return " + this.doMakeReturnCode(e, op) + ";" + Chars.ln);
	this.returnParsed = true;
};
Declaration.prototype.endParse = function(){
	this.codeGenerator().closeScope(this.doEpilog());
	this.root().popScope();
	var result = this.type.result();
	if (result != null && !this.returnParsed){
		Errors.raise("RETURN expected at the end of PROCEDURE declared with '" + result.description() + "' result type");
	}
	return true;
};
function FormalParameters(parent/*PDeclarationAndIdentHandle*/){
	ContextHierarchy.Node.call(this, parent);
	this.arguments = [];
	this.type = new Procedure.Defined(parent.typeName());
	this.result = null;
	parent.setType(this.type);
}
FormalParameters.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (msg instanceof AddArgumentMsg){
		this.arguments.push(msg.arg);
	}
	else {
		result = ContextHierarchy.Node.prototype.handleMessage.call(this, msg);
	}
	return result;
};
FormalParameters.prototype.handleQIdent = function(q/*QIdent*/){
	var s = ContextHierarchy.getQIdSymbolAndScope(this.root(), q);
	var resultType = ExpressionTree.unwrapType(s.symbol().info());
	this.doCheckResultType(resultType);
	this.result = resultType;
};
FormalParameters.prototype.doCheckResultType = function(type/*PStorageType*/){
	if (!type.isScalar()){
		Errors.raise("procedure cannot return " + type.description());
	}
};
FormalParameters.prototype.endParse = function(){
	this.type.define(this.arguments, this.result);
	return true;
};
FormalParametersProcDecl.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = FormalParameters.prototype.handleMessage.call(this, msg);
	if (msg instanceof AddArgumentMsg){
		result = this.parent().handleMessage(msg);
	}
	return result;
};
FormalParametersProcDecl.prototype.endParse = function(){
	var result = FormalParameters.prototype.endParse.call(this);
	if (result){
		var void$ = this.handleMessage(new EndParametersMsg());
	}
	return result;
};
DefinedParameters.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "VAR"){
		this.isVar = true;
	}
};
DefinedParameters.prototype.handleIdent = function(id/*STRING*/){
	this.argNamesForType.push(id);
};
DefinedParameters.prototype.setType = function(type/*PStorageType*/){
	var $seq1 = this.argNamesForType;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var name = $seq1[$key2];
		var void$ = this.handleMessage(new AddArgumentMsg(name, new Types.ProcedureArgument(type, this.isVar)));
	}
	this.isVar = false;
	this.argNamesForType.splice(0, Number.MAX_VALUE);
};
Return.prototype.handleExpression = function(e/*PType*/){
	RTL$.typeGuard(this.parent(), Declaration).handleReturn(e);
};
Return.prototype.codeGenerator = function(){
	return CodeGenerator.nullGenerator();
};
function AddArgumentMsg(name/*STRING*/, arg/*PProcedureArgument*/){
	ContextHierarchy.Message.call(this);
	this.name = name;
	this.arg = arg;
}

function assertProcType(type/*PType*/, info/*PId*/){
	var unexpected = '';
	var result = null;
	if (type == null){
		unexpected = info.idType();
	}
	else if (info instanceof TypeId.Type || !(type instanceof Procedure.Type)){
		unexpected = type.description();
	}
	else {
		result = type;
	}
	if (result == null){
		Errors.raise("PROCEDURE expected, got '" + unexpected + "'");
	}
	return result;
}

function makeCall(cx/*PNode*/, type/*PType*/, info/*PId*/){
	return assertProcType(type, info).callGenerator(ContextHierarchy.makeLanguageContext(cx));
}
exports.Declaration = Declaration;
exports.FormalParameters = FormalParameters;
exports.FormalParametersProcDecl = FormalParametersProcDecl;
exports.DefinedParameters = DefinedParameters;
exports.Return = Return;
exports.AddArgumentMsg = AddArgumentMsg;
exports.EndParametersMsg = EndParametersMsg;
exports.handleIdentdef = handleIdentdef;
exports.makeCall = makeCall;
