var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var Context = require("js/Context.js");
var ContextDesignator = require("js/ContextDesignator.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextModule = require("js/ContextModule.js");
var ContextProcedure = require("js/ContextProcedure.js");
var ContextType = require("js/ContextType.js");
var EberonConstructor = require("js/EberonConstructor.js");
var EberonContext = require("js/EberonContext.js");
var EberonContextDesignator = require("js/EberonContextDesignator.js");
var EberonDynamicArray = require("js/EberonDynamicArray.js");
var EberonMap = require("js/EberonMap.js");
var EberonRecord = require("js/EberonRecord.js");
var EberonTypes = require("js/EberonTypes.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var ExpressionTree = require("js/ExpressionTree.js");
var LanguageContext = require("js/LanguageContext.js");
var Object$ = require("js/Object.js");
var Procedure = require("js/Procedure.js");
var Record = require("js/Record.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "EberonContextProcedure";
function ProcOrMethodDeclaration(){
	ContextProcedure.Declaration.apply(this, arguments);
	this.boundType = null;
	this.baseConstructorWasCalled = false;
	this.methodId = null;
	this.methodType = null;
	this.isConstructor = false;
	this.initedFields = [];
	this.type = null;
	this.endingId = '';
}
RTL$.extend(ProcOrMethodDeclaration, ContextProcedure.Declaration, $scope);
function ArgumentVariable(){
	Variable.ArgumentVariable.apply(this, arguments);
}
RTL$.extend(ArgumentVariable, Variable.ArgumentVariable, $scope);
function ProcOrMethodId(){
	ContextHierarchy.Node.apply(this, arguments);
	this.maybeTypeId = '';
	this.type = null;
}
RTL$.extend(ProcOrMethodId, ContextHierarchy.Node, $scope);
function BaseInit(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
	this.initCall = null;
	this.initField = '';
	this.typeOnDemand = null;
}
RTL$.extend(BaseInit, ContextExpression.ExpressionHandler, $scope);
function FormalParameters(){
	ContextProcedure.FormalParameters.apply(this, arguments);
}
RTL$.extend(FormalParameters, ContextProcedure.FormalParameters, $scope);
function FormalParametersProcDecl(){
	ContextProcedure.FormalParametersProcDecl.apply(this, arguments);
}
RTL$.extend(FormalParametersProcDecl, ContextProcedure.FormalParametersProcDecl, $scope);
function ModuleDeclaration(){
	ContextModule.Declaration.apply(this, arguments);
}
RTL$.extend(ModuleDeclaration, ContextModule.Declaration, $scope);
function GetConstructorBoundTypeMsg(){
	ContextHierarchy.Message.call(this);
}
RTL$.extend(GetConstructorBoundTypeMsg, ContextHierarchy.Message, $scope);
function GetConstructorSuperMsg(){
	ContextHierarchy.Message.call(this);
}
RTL$.extend(GetConstructorSuperMsg, ContextHierarchy.Message, $scope);
RTL$.extend(InitFieldMsg, ContextHierarchy.Message, $scope);
RTL$.extend(MethodOrProcMsg, ContextHierarchy.Message, $scope);

function superMethodCallGenerator(cx/*PType*/, type/*Type*/){
	var args = Procedure.makeArgumentsCode(cx);
	args.write(Expression.makeSimple("this", null), null, null);
	return Procedure.makeProcCallGeneratorWithCustomArgs(cx, type, args);
}

function handleSuperCall(d/*ProcOrMethodDeclaration*/){
	var procId = null;
	if (d.methodId == null){
		Errors.raise("SUPER can be used only in methods");
	}
	var baseType = RTL$.typeGuard(d.boundType.base, EberonRecord.Record);
	if (baseType == null){
		Errors.raise("'" + d.boundType.description() + "' has no base type - SUPER cannot be used");
	}
	var id = d.methodId.id();
	if (!d.isConstructor){
		EberonRecord.requireMethodDefinition(baseType, id, "cannot use abstract method(s) in SUPER calls");
		procId = new Procedure.Id(new EberonTypes.MethodType(id, d.methodType.procType(), superMethodCallGenerator), id, false);
	}
	return new EberonContextDesignator.SuperMethodInfo(procId, CodeGenerator.mangleId(d.qualifyScope(baseType.scope) + baseType.description()) + ".prototype." + id + ".call");
}

function handleFieldInit(d/*PProcOrMethodDeclaration*/, id/*STRING*/){
	if (!Object.prototype.hasOwnProperty.call(d.boundType.fields, id)){
		Errors.raise("'" + id + "' is not record '" + d.boundType.description() + "' own field");
	}
	if (d.initedFields.indexOf(id) != -1){
		Errors.raise("field '" + id + "' is already initialized");
	}
	d.initedFields.push(id);
	var type = RTL$.getMappedValue(d.boundType.fields, id).type();
	return EberonConstructor.makeFieldInitCall(type, ContextHierarchy.makeLanguageContext(d), id);
}

function handleTypePromotionMadeInSeparateStatement(msg/*VAR Message*/){
	return EberonContextDesignator.breakTypePromotion(msg);
}
ProcOrMethodDeclaration.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (msg instanceof EberonContextDesignator.GetMethodSelfMsg){
		if (this.boundType == null){
			Errors.raise("SELF can be used only in methods");
		}
		result = this.boundType;
	}
	else if (msg instanceof EberonContextDesignator.GetSelfAsPointerMsg){
		this.boundType.requireNewOnly();
		result = this.boundType;
	}
	else if (msg instanceof GetConstructorBoundTypeMsg){
		result = this.boundType;
	}
	else if (msg instanceof GetConstructorSuperMsg){
		this.baseConstructorWasCalled = true;
		result = handleSuperCall(this);
	}
	else if (msg instanceof EberonContextDesignator.GetMethodSuperMsg){
		if (this.isConstructor){
			Errors.raise("cannot call base constructor from procedure body (use '| SUPER' to pass parameters to base constructor)");
		}
		result = handleSuperCall(this);
	}
	else if (msg instanceof InitFieldMsg){
		result = handleFieldInit(this, msg.id);
	}
	else if (msg instanceof MethodOrProcMsg){
		var id = msg.id;
		var type = msg.type;
		if (type != null){
			this.methodId = id;
			this.boundType = type;
			this.isConstructor = type.name == id.id();
		}
		ContextProcedure.handleIdentdef(this, id);
	}
	else if (handleTypePromotionMadeInSeparateStatement(msg)){
	}
	else {
		result = ContextProcedure.Declaration.prototype.handleMessage.call(this, msg);
	}
	return result;
};
ProcOrMethodDeclaration.prototype.doProlog = function(){
	var result = '';
	if (this.boundType != null){
		var boundTypeCode = CodeGenerator.mangleId(this.boundType.name);
		if (this.isConstructor){
			result = "function " + boundTypeCode + "(";
		}
		else {
			result = boundTypeCode + ".prototype." + this.methodId.id() + " = function(";
		}
	}
	else {
		result = ContextProcedure.Declaration.prototype.doProlog.call(this);
	}
	return result;
};
ProcOrMethodDeclaration.prototype.doEpilog = function(){
	var result = '';
	if (this.boundType != null && !this.isConstructor){
		result = ";" + Chars.ln;
	}
	else {
		result = ContextProcedure.Declaration.prototype.doEpilog.call(this);
	}
	return result;
};
ProcOrMethodDeclaration.prototype.doBeginBody = function(){
	ContextProcedure.Declaration.prototype.doBeginBody.call(this);
	if (this.isConstructor){
		this.codeGenerator().write(this.boundType.baseConstructorCallCode + EberonRecord.fieldsInitializationCode(this.boundType, this));
	}
};
ProcOrMethodDeclaration.prototype.doMakeArgumentVariable = function(arg/*ProcedureArgument*/, name/*STRING*/){
	var result = null;
	if (arg.type instanceof Types.Record || !arg.isVar && arg.type instanceof Record.Pointer){
		result = new EberonContextDesignator.TypeNarrowVariable(arg.type, arg.isVar, !arg.isVar, name);
	}
	else {
		result = new ArgumentVariable(name, arg.type, arg.isVar);
	}
	return result;
};
ProcOrMethodDeclaration.prototype.doMakeReturnCode = function(e/*PType*/, op/*CastOp*/){
	var result = '';
	var optimize = false;
	if (e.type() instanceof Types.Array){
		if (Expression.isTemporary(e)){
			optimize = true;
		}
		else {
			var info = e.info();
			optimize = info instanceof Variable.Declared && info.scope == this.root().currentScope();
		}
	}
	if (optimize){
		result = e.code();
	}
	else {
		result = ContextProcedure.Declaration.prototype.doMakeReturnCode.call(this, e, op);
	}
	return result;
};
ProcOrMethodDeclaration.prototype.setType = function(type/*PStorageType*/){
	if (this.methodId != null){
		var t = RTL$.typeGuard(type, Procedure.Type);
		this.methodType = new EberonTypes.MethodType(this.methodId.id(), t, Procedure.makeProcCallGenerator);
		this.type = t;
	}
	else {
		ContextProcedure.Declaration.prototype.setType.call(this, type);
	}
};
ProcOrMethodDeclaration.prototype.handleIdent = function(id/*STRING*/){
	if (this.boundType == null){
		ContextProcedure.Declaration.prototype.handleIdent.call(this, id);
	}
	else if (this.endingId.length != 0){
		this.endingId = this.endingId + "." + id;
	}
	else {
		this.endingId = id;
	}
};
ProcOrMethodDeclaration.prototype.endParse = function(){
	var baseConstructor = null;
	var result = ContextProcedure.Declaration.prototype.endParse.call(this);
	if (result){
		if (this.boundType != null){
			if (this.endingId.length != 0){
				var expected = this.boundType.name + "." + this.id.id();
				if (this.endingId != expected){
					Errors.raise("mismatched method names: expected '" + expected + "' at the end (or nothing), got '" + this.endingId + "'");
				}
			}
			if (this.isConstructor){
				this.boundType.defineConstructor(this.methodType.procType());
				var base = this.boundType.base;
				if (base != null){
					baseConstructor = EberonRecord.constructor$(RTL$.typeGuard(base, EberonRecord.Record));
				}
				if (!this.baseConstructorWasCalled && baseConstructor != null && baseConstructor.args().length != 0){
					Errors.raise("base record constructor has parameters but was not called (use '| SUPER' to pass parameters to base constructor)");
				}
				if (this.baseConstructorWasCalled && (baseConstructor == null || baseConstructor.args().length == 0)){
					Errors.raise("base record constructor has no parameters and will be called automatically (do not use '| SUPER' to call base constructor)");
				}
			}
			else {
				this.boundType.defineMethod(this.methodId, this.methodType);
			}
		}
	}
	return result;
};
ArgumentVariable.prototype.isReadOnly = function(){
	return !this.var;
};
ProcOrMethodId.prototype.handleIdent = function(id/*STRING*/){
	this.maybeTypeId = id;
};
ProcOrMethodId.prototype.handleLiteral = function(s/*STRING*/){
	var ss = ContextHierarchy.getSymbolAndScope(this.root(), this.maybeTypeId);
	var type = ExpressionTree.unwrapType(ss.symbol().info());
	if (!(type instanceof EberonRecord.Record)){
		Errors.raise("RECORD type expected in method declaration, got '" + type.description() + "'");
	}
	else if (ss.scope() != this.root().currentScope()){
		Errors.raise("method should be defined in the same scope as its bound type '" + this.maybeTypeId + "'");
	}
	else {
		this.type = type;
	}
};
ProcOrMethodId.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	if (this.type != null && id.exported()){
		Errors.raise("method implementation cannot be exported: " + id.id());
	}
	EberonContext.checkOrdinaryExport(id, "procedure");
	var void$ = this.handleMessage(new MethodOrProcMsg(id, this.type));
};

function baseInitType(b/*VAR BaseInit*/){
	if (b.typeOnDemand == null){
		b.typeOnDemand = RTL$.typeGuard(b.handleMessage(new GetConstructorBoundTypeMsg()), EberonRecord.Record);
	}
	return b.typeOnDemand;
}
BaseInit.prototype.codeGenerator = function(){
	return CodeGenerator.nullGenerator();
};
BaseInit.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (msg instanceof ContextDesignator.BeginCallMsg){
	}
	else if (msg instanceof ContextDesignator.EndCallMsg){
		var e = this.initCall.end();
		if (this.initField.length != 0){
			baseInitType(this).setFieldInitializationCode(this.initField, e.code());
		}
		else {
			baseInitType(this).setBaseConstructorCallCode(e.code());
		}
	}
	else {
		result = ContextExpression.ExpressionHandler.prototype.handleMessage.call(this, msg);
	}
	return result;
};
BaseInit.prototype.handleIdent = function(id/*STRING*/){
	this.initField = id;
	this.initCall = RTL$.typeGuard(this.handleMessage(new InitFieldMsg(id)), Procedure.CallGenerator);
};
BaseInit.prototype.handleExpression = function(e/*PType*/){
	this.initCall.handleArgument(e);
};
BaseInit.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "SUPER"){
		var ms = this.handleMessage(new GetConstructorSuperMsg());
		this.initCall = EberonConstructor.makeBaseConstructorCall(RTL$.typeGuard(baseInitType(this).base, EberonRecord.Record), ContextHierarchy.makeLanguageContext(this));
	}
};

function assertArgumentIsNotNonVarDynamicArray(msg/*VAR Message*/){
	var type = null;
	if (msg instanceof ContextProcedure.AddArgumentMsg){
		var arg = msg.arg;
		if (!arg.isVar){
			type = arg.type;
			while (true){
				if (type instanceof Types.Array){
					if (type instanceof EberonDynamicArray.DynamicArray){
						Errors.raise("dynamic array has no use as non-VAR argument '" + msg.name + "'");
					}
					type = RTL$.typeGuard(type, Types.Array).elementsType;
				} else break;
			}
		}
	}
}
FormalParameters.prototype.handleMessage = function(msg/*VAR Message*/){
	assertArgumentIsNotNonVarDynamicArray(msg);
	return ContextProcedure.FormalParameters.prototype.handleMessage.call(this, msg);
};

function isEberonArrayOrMap(type/*PStorageType*/){
	return type instanceof EberonDynamicArray.DynamicArray || type instanceof EberonMap.Type;
}
FormalParameters.prototype.doCheckResultType = function(type/*PStorageType*/){
	if (!isEberonArrayOrMap(type)){
		ContextProcedure.FormalParameters.prototype.doCheckResultType.call(this, type);
	}
};
FormalParametersProcDecl.prototype.handleMessage = function(msg/*VAR Message*/){
	assertArgumentIsNotNonVarDynamicArray(msg);
	return ContextProcedure.FormalParametersProcDecl.prototype.handleMessage.call(this, msg);
};
FormalParametersProcDecl.prototype.doCheckResultType = function(type/*PStorageType*/){
	if (!isEberonArrayOrMap(type)){
		ContextProcedure.FormalParametersProcDecl.prototype.doCheckResultType.call(this, type);
	}
};
ModuleDeclaration.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (!handleTypePromotionMadeInSeparateStatement(msg)){
		result = ContextModule.Declaration.prototype.handleMessage.call(this, msg);
	}
	return result;
};
function InitFieldMsg(id/*STRING*/){
	ContextHierarchy.Message.call(this);
	this.id = id;
}
function MethodOrProcMsg(id/*PIdentdefInfo*/, type/*PRecord*/){
	ContextHierarchy.Message.call(this);
	this.id = id;
	this.type = type;
}
exports.ProcOrMethodDeclaration = ProcOrMethodDeclaration;
exports.ProcOrMethodId = ProcOrMethodId;
exports.BaseInit = BaseInit;
exports.FormalParameters = FormalParameters;
exports.FormalParametersProcDecl = FormalParametersProcDecl;
exports.ModuleDeclaration = ModuleDeclaration;
exports.MethodOrProcMsg = MethodOrProcMsg;
