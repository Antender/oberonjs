var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var Context = require("js/Context.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextProcedure = require("js/ContextProcedure.js");
var ContextType = require("js/ContextType.js");
var EberonContext = require("js/EberonContext.js");
var EberonDynamicArray = require("js/EberonDynamicArray.js");
var EberonMap = require("js/EberonMap.js");
var EberonRecord = require("js/EberonRecord.js");
var EberonTypes = require("js/EberonTypes.js");
var Errors = require("js/Errors.js");
var ExpressionTree = require("js/ExpressionTree.js");
var Object$ = require("js/Object.js");
var Procedure = require("js/Procedure.js");
var R = require("js/Record.js");
var ScopeBase = require("js/ScopeBase.js");
var Types = require("js/Types.js");
var $scope = "EberonContextType";
var dynamicArrayLength = -1;
function Declaration(){
	ContextType.Declaration.apply(this, arguments);
}
RTL$.extend(Declaration, ContextType.Declaration, $scope);
function FormalType(){
	ContextType.HandleSymbolAsType.apply(this, arguments);
	this.arrayDimensions = [];
	this.dynamicDimension = false;
}
RTL$.extend(FormalType, ContextType.HandleSymbolAsType, $scope);
RTL$.extend(Record, ContextType.Record, $scope);
function Array(){
	ContextType.Array.apply(this, arguments);
}
RTL$.extend(Array, ContextType.Array, $scope);
function ArrayDimensions(){
	ContextType.ArrayDimensions.apply(this, arguments);
}
RTL$.extend(ArrayDimensions, ContextType.ArrayDimensions, $scope);
function MethodHeading(){
	ContextType.DeclarationAndIdentHandle.apply(this, arguments);
	this.id = null;
	this.type = null;
}
RTL$.extend(MethodHeading, ContextType.DeclarationAndIdentHandle, $scope);
function Map(){
	ContextType.DeclarationHandle.apply(this, arguments);
}
RTL$.extend(Map, ContextType.DeclarationHandle, $scope);
RTL$.extend(MethodDeclMsg, ContextHierarchy.Message, $scope);
Declaration.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	EberonContext.checkOrdinaryExport(RTL$.typeGuard(id, EberonContext.IdentdefInfo), "type");
	ContextType.Declaration.prototype.handleIdentdef.call(this, id);
};
FormalType.prototype.setType = function(type/*PStorageType*/){
	var result = type;
	for (var i = this.arrayDimensions.length - 1 | 0; i >= 0; --i){
		if (this.arrayDimensions[i]){
			result = new EberonDynamicArray.DynamicArray(result);
		}
		else {
			result = this.root().language().types.makeOpenArray(result);
		}
	}
	RTL$.typeGuard(this.parent(), ContextType.HandleSymbolAsType).setType(result);
};
FormalType.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "*"){
		this.dynamicDimension = true;
	}
	else if (s == "OF"){
		this.arrayDimensions.push(this.dynamicDimension);
		this.dynamicDimension = false;
	}
};

function recordTypeFactory(name/*STRING*/, cons/*STRING*/, scope/*PType*/){
	return new EberonRecord.Record(name, cons, scope);
}
function Record(parent/*PDeclaration*/){
	ContextType.Record.call(this, parent, recordTypeFactory);
}

function checkMethodExport(record/*Record*/, method/*PIdentdefInfo*/, hint/*STRING*/){
	if (!record.declaration.id.exported() && method.exported()){
		Errors.raise(hint + " '" + method.id() + "' cannot be exported because record itslef is not exported");
	}
}
Record.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (msg instanceof MethodDeclMsg){
		var methodType = msg.type;
		var boundType = RTL$.typeGuard(this.type, EberonRecord.Record);
		var id = msg.id.id();
		if (boundType.name == id){
			checkMethodExport(this, msg.id, "constructor");
			boundType.declareConstructor(methodType, msg.id.exported());
		}
		else {
			boundType.addMethod(msg.id, new EberonTypes.MethodType(id, methodType, Procedure.makeProcCallGenerator));
			checkMethodExport(this, msg.id, "method");
		}
	}
	else if (msg instanceof ContextProcedure.EndParametersMsg){
	}
	else if (msg instanceof ContextProcedure.AddArgumentMsg){
	}
	else {
		result = ContextType.Record.prototype.handleMessage.call(this, msg);
	}
	return result;
};
Record.prototype.doMakeField = function(field/*PIdentdefInfo*/, type/*PStorageType*/){
	return new EberonRecord.Field(field, type, RTL$.typeGuard(this.type, EberonRecord.Record));
};
Record.prototype.doGenerateBaseConstructorCallCode = function(){
	var result = '';
	var base = this.type.base;
	if (base != null){
		var baseConstructor = EberonRecord.constructor$(RTL$.typeGuard(base, EberonRecord.Record));
		if (baseConstructor == null || baseConstructor.args().length == 0){
			result = ContextType.Record.prototype.doGenerateBaseConstructorCallCode.call(this);
		}
		else {
			result = this.qualifiedBaseConstructor() + ".apply(this, arguments);" + Chars.ln;
		}
	}
	return result;
};
Record.prototype.endParse = function(){
	var result = true;
	var type = RTL$.typeGuard(this.type, EberonRecord.Record);
	if (type.customConstructor == null){
		result = ContextType.Record.prototype.endParse.call(this);
	}
	else {
		this.codeGenerator().write(this.generateInheritance());
		type.setRecordInitializationCode(this.doGenerateBaseConstructorCallCode());
	}
	return result;
};
Array.prototype.doMakeInit = function(type/*PStorageType*/, dimensions/*STRING*/, length/*INTEGER*/){
	var result = '';
	if (length == dynamicArrayLength){
		result = "[]";
	}
	else if (type instanceof EberonRecord.Record && EberonRecord.hasParameterizedConstructor(type)){
		Errors.raise("cannot use '" + type.description() + "' as an element of static array because it has constructor with parameters");
	}
	else {
		result = ContextType.Array.prototype.doMakeInit.call(this, type, dimensions, length);
	}
	return result;
};
Array.prototype.doMakeType = function(elementsType/*PStorageType*/, init/*STRING*/, length/*INTEGER*/){
	var result = null;
	if (length == dynamicArrayLength){
		result = new EberonDynamicArray.DynamicArray(elementsType);
	}
	else {
		result = ContextType.Array.prototype.doMakeType.call(this, elementsType, init, length);
	}
	return result;
};
ArrayDimensions.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "*"){
		this.doAddDimension(dynamicArrayLength);
	}
	else {
		ContextType.ArrayDimensions.prototype.handleLiteral.call(this, s);
	}
};
MethodHeading.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	this.id = RTL$.typeGuard(id, EberonContext.IdentdefInfo);
	EberonContext.checkOrdinaryExport(this.id, "method");
};
MethodHeading.prototype.typeName = function(){
	return "";
};
MethodHeading.prototype.setType = function(type/*PStorageType*/){
	this.type = RTL$.typeGuard(type, Procedure.Type);
};
MethodHeading.prototype.endParse = function(){
	var void$ = this.handleMessage(new MethodDeclMsg(this.id, this.type));
	return true;
};
Map.prototype.handleQIdent = function(q/*QIdent*/){
	var s = ContextHierarchy.getQIdSymbolAndScope(this.root(), q);
	var type = ExpressionTree.unwrapType(s.symbol().info());
	this.setType(type);
};
Map.prototype.setType = function(type/*PStorageType*/){
	RTL$.typeGuard(this.parent(), ContextType.HandleSymbolAsType).setType(new EberonMap.Type(type));
};
Map.prototype.isAnonymousDeclaration = function(){
	return true;
};
Map.prototype.typeName = function(){
	return "";
};
function MethodDeclMsg(id/*PIdentdefInfo*/, type/*PType*/){
	ContextHierarchy.Message.call(this);
	this.id = id;
	this.type = type;
}

function isTypeRecursive(type/*PType*/, base/*PType*/){
	var result = !(type instanceof EberonDynamicArray.DynamicArray) && !(type instanceof EberonMap.Type);
	if (result){
		result = ContextType.isTypeRecursive(type, base);
	}
	return result;
}
exports.Declaration = Declaration;
exports.FormalType = FormalType;
exports.Record = Record;
exports.Array = Array;
exports.ArrayDimensions = ArrayDimensions;
exports.MethodHeading = MethodHeading;
exports.Map = Map;
exports.isTypeRecursive = isTypeRecursive;
