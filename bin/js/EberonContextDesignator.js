var RTL$ = require("eberon/eberon_rtl.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ContextDesignator = require("js/ContextDesignator.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextProcedure = require("js/ContextProcedure.js");
var EberonConstructor = require("js/EberonConstructor.js");
var EberonMap = require("js/EberonMap.js");
var EberonRtl = require("js/EberonRtl.js");
var EberonString = require("js/EberonString.js");
var EberonTypePromotion = require("js/EberonTypePromotion.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var Module = require("js/Module.js");
var Object$ = require("js/Object.js");
var Operator = require("js/Operator.js");
var Procedure = require("js/Procedure.js");
var Record = require("js/Record.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "EberonContextDesignator";
function Type(){
	ContextDesignator.Type.apply(this, arguments);
	this.procCall = null;
}
RTL$.extend(Type, ContextDesignator.Type, $scope);
RTL$.extend(ResultVariable, Types.Variable, $scope);
RTL$.extend(TypeNarrowVariable, EberonTypePromotion.Variable, $scope);
RTL$.extend(DereferencedTypeNarrowVariable, EberonTypePromotion.Variable, $scope);
RTL$.extend(SelfVariable, Variable.Declared, $scope);
function SelfAsPointer(){
	Types.Id.call(this);
}
RTL$.extend(SelfAsPointer, Types.Id, $scope);
RTL$.extend(ExpressionProcedureCall, ContextHierarchy.Node, $scope);
function AssignmentOrProcedureCall(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
	this.right = null;
}
RTL$.extend(AssignmentOrProcedureCall, ContextExpression.ExpressionHandler, $scope);
function OperatorNew(){
	ContextDesignator.QIdentHandler.apply(this, arguments);
	this.info = null;
	this.call = null;
}
RTL$.extend(OperatorNew, ContextDesignator.QIdentHandler, $scope);
RTL$.extend(OperatorNewMsg, ContextHierarchy.Message, $scope);
RTL$.extend(TransferPromotedTypesMsg, ContextHierarchy.Message, $scope);
function GetMethodSelfMsg(){
	ContextHierarchy.Message.call(this);
}
RTL$.extend(GetMethodSelfMsg, ContextHierarchy.Message, $scope);
function GetSelfAsPointerMsg(){
	ContextHierarchy.Message.call(this);
}
RTL$.extend(GetSelfAsPointerMsg, ContextHierarchy.Message, $scope);
function GetMethodSuperMsg(){
	ContextHierarchy.Message.call(this);
}
RTL$.extend(GetMethodSuperMsg, ContextHierarchy.Message, $scope);
RTL$.extend(SuperMethodInfo, Object$.Type, $scope);
var getMethodSelfMsg = new GetMethodSelfMsg();
var getSelfAsPointerMsg = new GetSelfAsPointerMsg();
var getMethodSuperMsg = new GetMethodSuperMsg();

function checkMapKeyType(type/*PType*/){
	if (type != EberonString.string() && !Types.isString(type)){
		Errors.raise("invalid MAP key type: STRING or string literal or ARRAY OF CHAR expected, got '" + type.description() + "'");
	}
}
Type.prototype.doCheckIndexType = function(type/*PType*/){
	if (this.currentType instanceof EberonMap.Type){
		checkMapKeyType(type);
	}
	else {
		ContextDesignator.Type.prototype.doCheckIndexType.call(this, type);
	}
};
Type.prototype.doIndexSequence = function(info/*PId*/, code/*STRING*/, indexCode/*STRING*/){
	var result = null;
	var currentType = this.currentType;
	if (currentType == EberonString.string()){
		result = new ContextDesignator.Index(0, Types.basic().ch, EberonString.makeElementVariable(), ContextDesignator.getAt(this, Types.basic().ch), "");
	}
	else if (currentType instanceof EberonMap.Type){
		var indexType = currentType.elementsType;
		var rtl = RTL$.typeGuard(this.root().language().rtl, EberonRtl.Type);
		var rval = rtl.getMappedValue(code, indexCode);
		var lval = code + "[" + indexCode + "]";
		var var$ = new EberonMap.ElementVariable(indexType, RTL$.typeGuard(info, Types.Variable).isReadOnly(), lval, rval);
		result = new ContextDesignator.Index(0, indexType, var$, rval, "");
	}
	else {
		result = ContextDesignator.Type.prototype.doIndexSequence.call(this, info, code, indexCode);
	}
	return result;
};
Type.prototype.doMakeDerefVar = function(info/*PId*/){
	var result = null;
	if (info instanceof TypeNarrowVariable){
		result = new DereferencedTypeNarrowVariable(info);
	}
	else {
		result = ContextDesignator.Type.prototype.doMakeDerefVar.call(this, info);
	}
	return result;
};

function beginCall(d/*PType*/){
	var type = d.currentType;
	var info = d.info;
	if (info instanceof TypeId.Type && type instanceof Types.Record){
		var cx = ContextHierarchy.makeLanguageContext(d);
		d.procCall = EberonConstructor.makeConstructorCall(info, cx, false);
		ContextDesignator.discardCode(d);
	}
	else {
		d.procCall = ContextProcedure.makeCall(d, type, info);
	}
}

function endCall(d/*VAR Type*/){
	var e = d.procCall.end();
	ContextDesignator.advance(d, e.type(), new ResultVariable(e), e.code(), false);
	d.procCall = null;
}

function breakTypePromotion(msg/*VAR Message*/){
	var result = false;
	if (msg instanceof TransferPromotedTypesMsg){
		msg.promotion.reset();
		result = true;
	}
	return result;
}

function makePointer(type/*PStorageType*/){
	var typeId = new TypeId.Type(type);
	return new Record.Pointer("", typeId);
}
Type.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (msg instanceof ContextDesignator.BeginCallMsg){
		beginCall(this);
	}
	else if (msg instanceof ContextDesignator.EndCallMsg){
		endCall(this);
	}
	else if (msg instanceof OperatorNewMsg){
		var e = msg.expression;
		ContextDesignator.advance(this, e.type(), new ResultVariable(e), e.code(), false);
	}
	else if (!breakTypePromotion(msg)){
		result = ContextDesignator.Type.prototype.handleMessage.call(this, msg);
	}
	return result;
};
Type.prototype.handleExpression = function(e/*PType*/){
	if (this.procCall != null){
		this.procCall.handleArgument(e);
	}
	else {
		ContextDesignator.Type.prototype.handleExpression.call(this, e);
	}
};
Type.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "SELF"){
		var type = RTL$.typeGuard(this.handleMessage(getMethodSelfMsg), Types.StorageType);
		var info = new SelfVariable(type);
		ContextDesignator.advance(this, type, info, "this", false);
	}
	else if (s == "POINTER"){
		var type = RTL$.typeGuard(this.handleMessage(getSelfAsPointerMsg), Types.StorageType);
		ContextDesignator.advance(this, makePointer(type), new SelfAsPointer(), "", false);
	}
	else if (s == "SUPER"){
		var ms = RTL$.typeGuard(this.handleMessage(getMethodSuperMsg), SuperMethodInfo);
		ContextDesignator.advance(this, ms.info.type, ms.info, ms.code, false);
	}
	else {
		ContextDesignator.Type.prototype.handleLiteral.call(this, s);
	}
};
function ResultVariable(e/*PType*/){
	Types.Variable.call(this);
	this.expression = e;
}
ResultVariable.prototype.type = function(){
	return RTL$.typeGuard(this.expression.type(), Types.StorageType);
};
ResultVariable.prototype.isReference = function(){
	return false;
};
ResultVariable.prototype.isReadOnly = function(){
	return true;
};
ResultVariable.prototype.idType = function(){
	var result = '';
	if (this.expression.type() != null){
		result = "result";
	}
	else {
		result = "statement";
	}
	return "procedure call " + result;
};
function TypeNarrowVariable(type/*PStorageType*/, isRef/*BOOLEAN*/, isReadOnly/*BOOLEAN*/, code/*STRING*/){
	EberonTypePromotion.Variable.call(this);
	this.mType = type;
	this.isRef = isRef;
	this.readOnly = isReadOnly;
	this.code = code;
}
TypeNarrowVariable.prototype.type = function(){
	return this.mType;
};
TypeNarrowVariable.prototype.setType = function(type/*PStorageType*/){
	this.mType = type;
};
TypeNarrowVariable.prototype.isReference = function(){
	return this.isRef;
};
TypeNarrowVariable.prototype.isReadOnly = function(){
	return this.readOnly;
};
TypeNarrowVariable.prototype.id = function(){
	return this.code;
};
TypeNarrowVariable.prototype.idType = function(){
	var result = '';
	if (this.readOnly){
		result = "non-VAR formal parameter";
	}
	else {
		result = EberonTypePromotion.Variable.prototype.idType.call(this);
	}
	return result;
};
function DereferencedTypeNarrowVariable(var$/*PTypeNarrowVariable*/){
	EberonTypePromotion.Variable.call(this);
	this.var = var$;
}
DereferencedTypeNarrowVariable.prototype.type = function(){
	return Record.pointerBase(RTL$.typeGuard(this.var.type(), Record.Pointer));
};
DereferencedTypeNarrowVariable.prototype.setType = function(type/*PStorageType*/){
	this.var.setType(makePointer(type));
};
DereferencedTypeNarrowVariable.prototype.isReference = function(){
	return true;
};
DereferencedTypeNarrowVariable.prototype.isReadOnly = function(){
	return false;
};
DereferencedTypeNarrowVariable.prototype.id = function(){
	return this.var.id();
};
SelfAsPointer.prototype.idType = function(){
	return "SELF(POINTER)";
};
function SelfVariable(type/*PStorageType*/){
	Variable.Declared.call(this, "SELF", type, null);
}
function ExpressionProcedureCall(parent/*PNode*/){
	ContextHierarchy.Node.call(this, parent);
	this.attributes = new ContextHierarchy.Attributes();
}
ExpressionProcedureCall.prototype.endParse = function(){
	var e = null;
	var d = this.attributes.designator;
	var info = d.info();
	if (info instanceof ResultVariable){
		e = info.expression;
		e = new Expression.Type(d.code(), d.type(), null, e.constValue(), e.maxPrecedence());
	}
	else {
		e = ContextExpression.designatorAsExpression(d);
	}
	RTL$.typeGuard(this.parent(), ContextExpression.ExpressionHandler).handleExpression(e);
	return true;
};
AssignmentOrProcedureCall.prototype.handleExpression = function(e/*PType*/){
	this.right = e;
};
AssignmentOrProcedureCall.prototype.codeGenerator = function(){
	return CodeGenerator.nullGenerator();
};
AssignmentOrProcedureCall.prototype.endParse = function(){
	var code = '';
	var d = this.attributes.designator;
	var type = d.type();
	if (this.right != null){
		code = Operator.assign(d.info(), this.right, ContextHierarchy.makeLanguageContext(this));
	}
	else if (!(d.info() instanceof ResultVariable)){
		var procCall = ContextProcedure.makeCall(this, type, d.info());
		var result = procCall.end();
		Module.assertProcStatementResult(result.type());
		code = d.code() + result.code();
	}
	else {
		Module.assertProcStatementResult(type);
		code = d.code();
	}
	this.parent().codeGenerator().write(code);
	return true;
};
OperatorNew.prototype.handleQIdent = function(q/*QIdent*/){
	var found = ContextHierarchy.getQIdSymbolAndScope(this.root(), q);
	var s = found.symbol();
	var info = s.info();
	if (!(info instanceof TypeId.Type)){
		Errors.raise("record type is expected in operator NEW, got '" + info.idType() + "'");
	}
	else {
		var type = info.type();
		if (!(type instanceof Types.Record)){
			Errors.raise("record type is expected in operator NEW, got '" + type.description() + "'");
		}
		this.info = info;
	}
};
OperatorNew.prototype.handleExpression = function(e/*PType*/){
	this.call.handleArgument(e);
};
OperatorNew.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (msg instanceof ContextDesignator.BeginCallMsg){
		this.call = EberonConstructor.makeConstructorCall(this.info, ContextHierarchy.makeLanguageContext(this), true);
	}
	else if (msg instanceof ContextDesignator.EndCallMsg){
	}
	else {
		result = ContextDesignator.QIdentHandler.prototype.handleMessage.call(this, msg);
	}
	return result;
};
OperatorNew.prototype.endParse = function(){
	var void$ = this.handleMessage(new OperatorNewMsg(this.call.end()));
	return true;
};
function OperatorNewMsg(e/*PType*/){
	ContextHierarchy.Message.call(this);
	this.expression = e;
}
function TransferPromotedTypesMsg(p/*PType*/){
	ContextHierarchy.Message.call(this);
	this.promotion = p;
}
function SuperMethodInfo(info/*PProcedureId*/, code/*STRING*/){
	Object$.Type.call(this);
	this.info = info;
	this.code = code;
}
exports.Type = Type;
exports.TypeNarrowVariable = TypeNarrowVariable;
exports.SelfVariable = SelfVariable;
exports.ExpressionProcedureCall = ExpressionProcedureCall;
exports.AssignmentOrProcedureCall = AssignmentOrProcedureCall;
exports.OperatorNew = OperatorNew;
exports.TransferPromotedTypesMsg = TransferPromotedTypesMsg;
exports.GetMethodSelfMsg = GetMethodSelfMsg;
exports.GetSelfAsPointerMsg = GetSelfAsPointerMsg;
exports.GetMethodSuperMsg = GetMethodSuperMsg;
exports.SuperMethodInfo = SuperMethodInfo;
exports.checkMapKeyType = checkMapKeyType;
exports.breakTypePromotion = breakTypePromotion;
exports.makePointer = makePointer;
