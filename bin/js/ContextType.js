var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ConstValue = require("js/ConstValue.js");
var Context = require("js/Context.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var ExpressionTree = require("js/ExpressionTree.js");
var Object$ = require("js/Object.js");
var R = require("js/Record.js");
var Scope = require("js/Scope.js");
var ScopeBase = require("js/ScopeBase.js");
var String = require("js/String.js");
var Symbols = require("js/Symbols.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var $scope = "ContextType";
function HandleSymbolAsType(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(HandleSymbolAsType, ContextHierarchy.Node, $scope);
function DeclarationHandle(){
	HandleSymbolAsType.apply(this, arguments);
}
RTL$.extend(DeclarationHandle, HandleSymbolAsType, $scope);
function FormalType(){
	HandleSymbolAsType.apply(this, arguments);
	this.dimensionCount = 0;
}
RTL$.extend(FormalType, HandleSymbolAsType, $scope);
function Array(){
	DeclarationHandle.apply(this, arguments);
	this.dimensions = null;
}
RTL$.extend(Array, DeclarationHandle, $scope);
function ArrayDimensions(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
	this.dimensions = [];
}
RTL$.extend(ArrayDimensions, ContextExpression.ExpressionHandler, $scope);
function HavingFieldsDeclaration(){
	DeclarationHandle.apply(this, arguments);
}
RTL$.extend(HavingFieldsDeclaration, DeclarationHandle, $scope);
function DeclarationAndIdentHandle(){
	HavingFieldsDeclaration.apply(this, arguments);
}
RTL$.extend(DeclarationAndIdentHandle, HavingFieldsDeclaration, $scope);
function Declaration(){
	DeclarationAndIdentHandle.apply(this, arguments);
	this.id = null;
	this.symbol = null;
}
RTL$.extend(Declaration, DeclarationAndIdentHandle, $scope);
RTL$.extend(Record, ContextHierarchy.Node, $scope);
function RecordBase(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(RecordBase, ContextHierarchy.Node, $scope);
function FieldList(){
	Declaration.apply(this, arguments);
	this.idents = [];
	this.type = null;
}
RTL$.extend(FieldList, Declaration, $scope);
function Pointer(){
	HavingFieldsDeclaration.apply(this, arguments);
}
RTL$.extend(Pointer, HavingFieldsDeclaration, $scope);
function Section(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(Section, ContextHierarchy.Node, $scope);
RTL$.extend(ResolveClosure, Object$.Type, $scope);
RTL$.extend(ForwardTypeMsg, ContextHierarchy.Message, $scope);
ScopeInfo.prototype.$scope = $scope;
ScopeInfoGenerator.prototype.$scope = $scope;
function DescribeScopeMsg(){
	ContextHierarchy.Message.call(this);
	this.result = null;
}
RTL$.extend(DescribeScopeMsg, ContextHierarchy.Message, $scope);
HandleSymbolAsType.prototype.handleQIdent = function(q/*QIdent*/){
	var s = ContextHierarchy.getQIdSymbolAndScope(this.root(), q);
	this.setType(ExpressionTree.unwrapType(s.symbol().info()));
};
FormalType.prototype.setType = function(type/*PStorageType*/){
	var result = type;
	var types = this.root().language().types;
	for (var i = 0; i <= this.dimensionCount - 1 | 0; ++i){
		result = types.makeOpenArray(result);
	}
	RTL$.typeGuard(this.parent(), HandleSymbolAsType).setType(result);
};
FormalType.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "ARRAY"){
		++this.dimensionCount;
	}
};
Array.prototype.typeName = function(){
	return "";
};
Array.prototype.setType = function(elementsType/*PStorageType*/){
	var dimensions = '';
	var arrayInit = '';
	var type = elementsType;
	for (var i = this.dimensions.dimensions.length - 1 | 0; i >= 0; --i){
		if (dimensions.length != 0){
			dimensions = ", " + dimensions;
		}
		var length = this.dimensions.dimensions[i];
		dimensions = String.fromInt(length) + dimensions;
		if (i == 0){
			arrayInit = this.doMakeInit(elementsType, dimensions, length);
		}
		type = this.doMakeType(type, arrayInit, length);
	}
	RTL$.typeGuard(this.parent(), HandleSymbolAsType).setType(type);
};
Array.prototype.isAnonymousDeclaration = function(){
	return true;
};
Array.prototype.doMakeInit = function(type/*PStorageType*/, dimensions/*STRING*/, length/*INTEGER*/){
	var result = '';
	var initializer = '';
	var rtl = this.root().language().rtl;
	if (type == Types.basic().ch){
		result = rtl.makeCharArray(dimensions);
	}
	else {
		if (type instanceof Types.Array || type instanceof Types.Record){
			initializer = "function(){return " + type.initializer(this) + ";}";
		}
		else {
			initializer = type.initializer(this);
		}
		result = rtl.makeArray(dimensions + ", " + initializer);
	}
	return result;
};
Array.prototype.doMakeType = function(elementsType/*PStorageType*/, init/*STRING*/, length/*INTEGER*/){
	return this.root().language().types.makeStaticArray(elementsType, init, length);
};
ArrayDimensions.prototype.handleExpression = function(e/*PType*/){
	var type = e.type();
	if (type != Types.basic().integer){
		Errors.raise("'INTEGER' constant expression expected, got '" + type.description() + "'");
	}
	var value = e.constValue();
	if (value == null){
		Errors.raise("constant expression expected as ARRAY size");
	}
	var dimension = RTL$.typeGuard(value, ConstValue.Int).value;
	if (dimension <= 0){
		Errors.raise("array size must be greater than 0, got " + String.fromInt(dimension));
	}
	this.doAddDimension(dimension);
};
ArrayDimensions.prototype.doAddDimension = function(size/*INTEGER*/){
	this.dimensions.push(size);
};
ArrayDimensions.prototype.codeGenerator = function(){
	return CodeGenerator.nullGenerator();
};
ArrayDimensions.prototype.endParse = function(){
	RTL$.typeGuard(this.parent(), Array).dimensions = this;
	return true;
};

function isTypeRecursive(type/*PType*/, base/*PType*/){
	var result = false;
	if (type == base){
		result = true;
	}
	else if (type instanceof R.Type){
		if (isTypeRecursive(type.base, base)){
			result = true;
		}
		else {
			var $seq1 = type.fields;
			for(var $key2 in $seq1){
				var field = $seq1[$key2];
				if (!result && isTypeRecursive(field.type(), base)){
					result = true;
				}
			}
		}
	}
	else if (type instanceof Types.Array){
		result = isTypeRecursive(type.elementsType, base);
	}
	return result;
}

function stripTypeId(closure/*PType*/){
	var typeId = RTL$.typeGuard(closure, TypeId.Type);
	R.stripTypeId(typeId);
}

function checkIfFieldCanBeExported(name/*STRING*/, idents/*ARRAY OF PIdentdefInfo*/, hint/*STRING*/){
	var $seq1 = idents;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var id = $seq1[$key2];
		if (!id.exported()){
			Errors.raise("field '" + name + "' can be exported only if " + hint + " '" + id.id() + "' itself is exported too");
		}
	}
}
Declaration.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	var typeId = new TypeId.Lazy();
	var symbol = new Symbols.Symbol(id.id(), typeId);
	var scope = this.root().currentScope();
	scope.addSymbol(symbol, id.exported());
	if (!id.exported()){
		scope.addFinalizer(stripTypeId, typeId);
	}
	this.id = id;
	this.symbol = symbol;
};
Declaration.prototype.setType = function(type/*PStorageType*/){
	TypeId.define(this.symbol.info(), type);
	Scope.resolve(this.root().currentScope(), this.symbol);
};
Declaration.prototype.isAnonymousDeclaration = function(){
	return false;
};
Declaration.prototype.exportField = function(name/*STRING*/){
	var idents = RTL$.makeArray(1, null);
	idents[0] = this.id;
	checkIfFieldCanBeExported(name, idents, "record");
};
Declaration.prototype.typeName = function(){
	return this.id.id();
};
Declaration.prototype.genTypeName = function(){
	return this.typeName();
};
function Record(parent/*PDeclaration*/, factory/*RecordTypeFactory*/){
	ContextHierarchy.Node.call(this, parent);
	this.declaration = parent;
	this.cons = '';
	this.type = null;
	var name = '';
	this.cons = parent.genTypeName();
	if (!parent.isAnonymousDeclaration()){
		name = this.cons;
	}
	this.type = factory(name, this.cons, parent.root().currentScope());
	parent.setType(this.type);
}
Record.prototype.addField = function(field/*PIdentdefInfo*/, type/*PStorageType*/){
	if (this.root().language().types.isRecursive(type, this.type)){
		Errors.raise("recursive field definition: '" + field.id() + "'");
	}
	this.type.addField(this.doMakeField(field, type));
	if (field.exported()){
		this.declaration.exportField(field.id());
	}
};
Record.prototype.setBaseType = function(type/*PType*/){
	if (!(type instanceof R.Type)){
		Errors.raise("RECORD type is expected as a base type, got '" + type.description() + "'");
	}
	else {
		if (type == this.type){
			Errors.raise("recursive inheritance: '" + this.type.description() + "'");
		}
		this.type.setBase(type);
	}
};
Record.prototype.doMakeField = function(field/*PIdentdefInfo*/, type/*PStorageType*/){
	return new R.Field(field, type);
};

function generateFieldsInitializationCode(r/*Record*/){
	var result = '';
	var $seq1 = r.type.fields;
	for(var f in $seq1){
		var t = $seq1[f];
		result = result + "this." + R.mangleField(f) + " = " + t.type().initializer(r) + ";" + Chars.ln;
	}
	return result;
}
Record.prototype.doGenerateConstructor = function(){
	var gen = new CodeGenerator.Generator();
	gen.write("function " + CodeGenerator.mangleId(this.cons) + "()");
	gen.openScope();
	gen.write(this.doGenerateBaseConstructorCallCode() + generateFieldsInitializationCode(this));
	gen.closeScope("");
	return gen.result();
};
Record.prototype.generateInheritance = function(){
	var result = '';
	var scopeMsg = new DescribeScopeMsg();
	var void$ = this.parent().handleMessage(scopeMsg);
	var scope = scopeMsg.result.id;
	var base = this.type.base;
	if (base == null){
		result = this.cons + ".prototype.$scope = " + scope + ";" + Chars.ln;
	}
	else {
		var qualifiedBase = this.qualifyScope(base.scope) + base.name;
		result = this.root().language().rtl.extend(CodeGenerator.mangleId(this.cons), CodeGenerator.mangleId(qualifiedBase), scope) + ";" + Chars.ln;
	}
	return result;
};
Record.prototype.doGenerateBaseConstructorCallCode = function(){
	var result = this.qualifiedBaseConstructor();
	if (result.length != 0){
		result = result + ".call(this);" + Chars.ln;
	}
	return result;
};
Record.prototype.qualifiedBaseConstructor = function(){
	var result = '';
	var baseType = this.type.base;
	if (baseType != null){
		result = this.qualifyScope(baseType.scope) + baseType.name;
	}
	return result;
};
Record.prototype.endParse = function(){
	var scopeMsg = new DescribeScopeMsg();
	this.codeGenerator().write(this.doGenerateConstructor() + this.generateInheritance());
	return true;
};
RecordBase.prototype.handleQIdent = function(q/*QIdent*/){
	var s = ContextHierarchy.getQIdSymbolAndScope(this.root(), q);
	var base = ExpressionTree.unwrapType(s.symbol().info());
	RTL$.typeGuard(this.parent(), Record).setBaseType(base);
};
FieldList.prototype.isAnonymousDeclaration = function(){
	return true;
};
FieldList.prototype.exportField = function(name/*STRING*/){
	checkIfFieldCanBeExported(name, this.idents, "field");
};
FieldList.prototype.setType = function(type/*PStorageType*/){
	this.type = type;
};
FieldList.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	this.idents.push(id);
};
FieldList.prototype.typeName = function(){
	return "";
};
FieldList.prototype.endParse = function(){
	var parent = RTL$.typeGuard(this.parent(), Record);
	var $seq1 = this.idents;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var id = $seq1[$key2];
		parent.addField(id, this.type);
	}
	return true;
};

function setPointerTypeId(p/*Pointer*/, typeId/*PType*/){
	var name = '';
	var typeDesc = '';
	if (!(typeId instanceof TypeId.Forward)){
		var type = typeId.type();
		if (!(type instanceof Types.Record)){
			if (type != null){
				typeDesc = ", got '" + type.description() + "'";
			}
			Errors.raise("RECORD is expected as a POINTER base type" + typeDesc);
		}
	}
	var parent = RTL$.typeGuard(p.parent(), DeclarationHandle);
	if (!parent.isAnonymousDeclaration()){
		name = parent.genTypeName();
	}
	parent.setType(new R.Pointer(name, typeId));
}
Pointer.prototype.handleQIdent = function(q/*QIdent*/){
	var info = null;
	var s = null;
	var id = q.id;
	if (q.module != null){
		s = ContextHierarchy.getModuleSymbolAndScope(q.module, id);
	}
	else {
		s = this.root().findSymbol(id);
	}
	if (s != null){
		info = s.symbol().info();
	}
	else {
		var msg = new ForwardTypeMsg(id);
		info = RTL$.typeGuard(this.parent().handleMessage(msg), Types.Id);
	}
	setPointerTypeId(this, ExpressionTree.unwrapTypeId(info));
};
Pointer.prototype.setType = function(type/*PStorageType*/){
	var typeId = new TypeId.Type(type);
	this.root().currentScope().addFinalizer(stripTypeId, typeId);
	setPointerTypeId(this, typeId);
};
Pointer.prototype.isAnonymousDeclaration = function(){
	return true;
};
Pointer.prototype.exportField = function(field/*STRING*/){
	Errors.raise("cannot export anonymous RECORD field: '" + field + "'");
};
function ResolveClosure(root/*PRoot*/, id/*STRING*/){
	Object$.Type.call(this);
	this.root = root;
	this.id = id;
}

function resolve(closure/*PType*/){
	var r = RTL$.typeGuard(closure, ResolveClosure);
	var info = ContextHierarchy.getSymbol(r.root, r.id).info();
	return RTL$.typeGuard(info, TypeId.Type).type();
}
Section.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (msg instanceof ForwardTypeMsg){
		var root = this.root();
		var scope = root.currentScope();
		Scope.addUnresolved(scope, msg.id);
		result = new TypeId.Forward(resolve, new ResolveClosure(root, msg.id));
	}
	else {
		result = ContextHierarchy.Node.prototype.handleMessage.call(this, msg);
	}
	return result;
};
Section.prototype.endParse = function(){
	Scope.checkAllResolved(this.root().currentScope());
	return true;
};
function ForwardTypeMsg(id/*STRING*/){
	ContextHierarchy.Message.call(this);
	this.id = id;
}
function ScopeInfo(id/*STRING*/, depth/*INTEGER*/){
	this.id = id;
	this.depth = depth;
}
function ScopeInfoGenerator(name/*STRING*/, code/*PIGenerator*/, parent/*PNode*/){
	this.name = name;
	this.code = code;
	this.parent = parent;
	this.codeBegin = code.makeInsertion();
	this.info = null;
}

function makeScopeInfo(name/*STRING*/, code/*IGenerator*/, parent/*PNode*/){
	var id = '';var description = '';
	id = "$scope";
	var depth = 0;
	if (parent == null){
		description = Chars.doubleQuote + name + Chars.doubleQuote;
	}
	else {
		var msg = new DescribeScopeMsg();
		var void$ = parent.handleMessage(msg);
		depth = msg.result.depth + 1 | 0;
		description = msg.result.id + " + " + Chars.doubleQuote + "." + name + Chars.doubleQuote;
		id = id + String.fromInt(depth);
	}
	code.write("var " + id + " = " + description + ";" + Chars.ln);
	return new ScopeInfo(id, depth);
}

function handleDescribeScopeMsg(msg/*VAR Message*/, s/*VAR ScopeInfoGenerator*/){
	var result = false;
	if (msg instanceof DescribeScopeMsg){
		if (s.info == null){
			var code = new CodeGenerator.Generator();
			s.info = makeScopeInfo(s.name, code, s.parent);
			s.code.insert(s.codeBegin, code.result());
		}
		msg.result = s.info;
		result = true;
	}
	return result;
}
exports.HandleSymbolAsType = HandleSymbolAsType;
exports.DeclarationHandle = DeclarationHandle;
exports.FormalType = FormalType;
exports.Array = Array;
exports.ArrayDimensions = ArrayDimensions;
exports.HavingFieldsDeclaration = HavingFieldsDeclaration;
exports.DeclarationAndIdentHandle = DeclarationAndIdentHandle;
exports.Declaration = Declaration;
exports.Record = Record;
exports.RecordBase = RecordBase;
exports.FieldList = FieldList;
exports.Pointer = Pointer;
exports.Section = Section;
exports.ForwardTypeMsg = ForwardTypeMsg;
exports.ScopeInfo = ScopeInfo;
exports.ScopeInfoGenerator = ScopeInfoGenerator;
exports.DescribeScopeMsg = DescribeScopeMsg;
exports.isTypeRecursive = isTypeRecursive;
exports.checkIfFieldCanBeExported = checkIfFieldCanBeExported;
exports.handleDescribeScopeMsg = handleDescribeScopeMsg;
