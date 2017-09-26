var RTL$ = require("eberon/eberon_rtl.js");
var Code = require("js/Code.js");
var ConstValue = require("js/ConstValue.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Designator = require("js/Designator.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var ExpressionTree = require("js/ExpressionTree.js");
var Record = require("js/Record.js");
var String = require("js/String.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "ContextDesignator";
Index.prototype.$scope = $scope;
function QIdentHandler(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(QIdentHandler, ContextHierarchy.Node, $scope);
function Type(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
	this.currentType = null;
	this.info = null;
	this.code = '';
	this.derefCode = '';
	this.propCode = '';
	this.indexExpression = null;
}
RTL$.extend(Type, ContextExpression.ExpressionHandler, $scope);
function TypeCast(){
	QIdentHandler.apply(this, arguments);
	this.type = null;
}
RTL$.extend(TypeCast, QIdentHandler, $scope);
RTL$.extend(ActualParameters, ContextExpression.ExpressionHandler, $scope);
function BeginCallMsg(){
	ContextHierarchy.Message.call(this);
}
RTL$.extend(BeginCallMsg, ContextHierarchy.Message, $scope);
function EndCallMsg(){
	ContextHierarchy.Message.call(this);
}
RTL$.extend(EndCallMsg, ContextHierarchy.Message, $scope);
var beginCallMsg = new BeginCallMsg();
var endCallMsg = new EndCallMsg();
function Index(length/*INTEGER*/, type/*PType*/, info/*PId*/, code/*STRING*/, asProperty/*STRING*/){
	this.length = length;
	this.type = type;
	this.info = info;
	this.code = code;
	this.asProperty = asProperty;
}
Type.prototype.handleQIdent = function(q/*QIdent*/){
	var found = ContextHierarchy.getQIdSymbolAndScope(this.root(), q);
	var s = found.symbol();
	var info = s.info();
	var code = q.code;
	if (info instanceof TypeId.Type){
		this.currentType = info.type();
	}
	else if (info instanceof Types.Const){
		this.currentType = info.type;
	}
	else if (info instanceof Types.Variable){
		this.currentType = info.type();
		if (q.module != null){
			code = code + "()";
		}
	}
	else if (info instanceof Types.ProcedureId){
		var procType = info.type;
		code = procType.designatorCode(code);
		this.currentType = procType;
	}
	this.info = info;
	this.code = code;
};
Type.prototype.handleExpression = function(e/*PType*/){
	this.indexExpression = e;
};
Type.prototype.handleTypeCast = function(type/*PType*/){
	var info = this.info;
	if (info instanceof Types.Variable){
		ExpressionTree.checkTypeCast(info, this.currentType, type, "type cast");
	}
	else {
		Errors.raise("cannot apply type cast to " + info.idType());
	}
	var code = this.root().language().rtl.typeGuard(this.code, ExpressionTree.castCode(type, this));
	this.code = code;
	this.currentType = type;
};

function handleIndexExpression(designator/*Type*/){
	var e = designator.indexExpression;
	designator.doCheckIndexType(e.type());
	var index = designator.doIndexSequence(designator.info, designator.derefCode, Expression.deref(e).code());
	designator.doCheckIndexValue(index, e.constValue());
	return index;
}

function handleDeref(designator/*VAR Type*/){
	var t = designator.currentType;
	if (t instanceof Record.Pointer){
		var base = Record.pointerBase(t);
		if (base.finalizedAsNonExported){
			Errors.raise("POINTER TO non-exported RECORD type cannot be dereferenced");
		}
		designator.currentType = base;
		var info = designator.info;
		if (info instanceof Types.Variable && info.isReference()){
			designator.code = Expression.derefCode(designator.code);
		}
	}
	else {
		Errors.raise("POINTER TO type expected, got '" + designator.currentType.description() + "'");
	}
}

function getAt(d/*Type*/, type/*PStorageType*/){
	return d.root().language().codeTraits.getAt(d.derefCode, Expression.deref(d.indexExpression).code(), type);
}

function advance(d/*VAR Type*/, type/*PType*/, info/*PId*/, code/*STRING*/, replace/*BOOLEAN*/){
	d.currentType = type;
	d.info = info;
	if (replace){
		d.code = code;
	}
	else {
		d.code = d.code + code;
	}
}
Type.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "]" || s == ","){
		var index = handleIndexExpression(this);
		this.propCode = index.asProperty;
		advance(this, index.type, index.info, this.code + index.code, false);
	}
	if (s == "[" || s == ","){
		this.derefCode = this.code;
		this.code = "";
	}
	else if (s == "^"){
		handleDeref(this);
		this.info = this.doMakeDerefVar(this.info);
	}
};
Type.prototype.handleIdent = function(id/*STRING*/){
	var info = this.info;
	var isReadOnly = info instanceof Types.Variable && info.isReadOnly();
	var t = this.currentType;
	if (t instanceof Record.Pointer){
		handleDeref(this);
		isReadOnly = false;
	}
	if (info instanceof TypeId.Type){
		Types.raiseUnexpectedSelector(id, info.description());
	}
	else if (!(t instanceof Types.StorageType)){
		Types.raiseUnexpectedSelector(id, t.description());
	}
	else {
		var field = t.denote(id, isReadOnly);
		var currentType = field.type();
		var fieldCode = field.designatorCode(this.code, this);
		this.derefCode = fieldCode.derefCode;
		this.propCode = fieldCode.propCode;
		advance(this, currentType, field.asVar(this.code, isReadOnly, this), fieldCode.code, true);
	}
};
Type.prototype.doCheckIndexType = function(type/*PType*/){
	if (!Types.isInt(type)){
		Errors.raise(Types.intsDescription() + " expression expected, got '" + type.description() + "'");
	}
};
Type.prototype.doCheckIndexValue = function(index/*PIndex*/, pValue/*PType*/){
	if (pValue != null && pValue instanceof ConstValue.Int){
		var value = pValue.value;
		Code.checkIndex(value);
		var length = index.length;
		if ((this.currentType instanceof Types.StaticArray || this.currentType instanceof Types.String) && value >= length){
			Errors.raise("index out of bounds: maximum possible index is " + String.fromInt(length - 1 | 0) + ", got " + String.fromInt(value));
		}
	}
};
Type.prototype.doIndexSequence = function(info/*PId*/, code/*STRING*/, indexCode/*STRING*/){
	var length = 0;
	var indexType = null;
	var type = this.currentType;
	if (type instanceof Types.Array){
		indexType = type.elementsType;
	}
	else if (type instanceof Types.String){
		indexType = Types.basic().ch;
	}
	else {
		Errors.raise("ARRAY or string expected, got '" + type.description() + "'");
	}
	if (type instanceof Types.StaticArray){
		length = type.length();
	}
	else if (type instanceof Types.String){
		length = Types.stringLen(type);
		if (length == 0){
			Errors.raise("cannot index empty string");
		}
	}
	var leadCode = code;
	var wholeCode = getAt(this, indexType);
	var readOnly = info instanceof Types.Const || info instanceof Types.Variable && info.isReadOnly();
	var v = new Variable.PropertyVariable(indexType, leadCode, indexCode, readOnly);
	return new Index(length, indexType, v, wholeCode, indexCode);
};

function discardCode(d/*VAR Type*/){
	d.code = "";
}
Type.prototype.doMakeDerefVar = function(info/*PId*/){
	return new Variable.DerefVariable(RTL$.typeGuard(this.currentType, Types.StorageType), this.code);
};
Type.prototype.endParse = function(){
	this.parent().attributes.designator = new Designator.Type(this.code, this.currentType, this.info);
	return true;
};
TypeCast.prototype.handleQIdent = function(q/*QIdent*/){
	var info = ContextHierarchy.getQIdSymbolAndScope(this.root(), q).symbol().info();
	if (info instanceof TypeId.Type){
		this.type = info.type();
	}
};
TypeCast.prototype.endParse = function(){
	var result = false;
	if (this.type != null){
		RTL$.typeGuard(this.parent(), Type).handleTypeCast(this.type);
		result = true;
	}
	return result;
};
function ActualParameters(parent/*PExpressionHandler*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	this.expressionHandler = parent;
	var void$ = this.handleMessage(beginCallMsg);
}
ActualParameters.prototype.handleExpression = function(e/*PType*/){
	this.expressionHandler.handleExpression(e);
};
ActualParameters.prototype.endParse = function(){
	var void$ = this.handleMessage(endCallMsg);
	return true;
};
exports.Index = Index;
exports.QIdentHandler = QIdentHandler;
exports.Type = Type;
exports.TypeCast = TypeCast;
exports.ActualParameters = ActualParameters;
exports.BeginCallMsg = BeginCallMsg;
exports.EndCallMsg = EndCallMsg;
exports.getAt = getAt;
exports.advance = advance;
exports.discardCode = discardCode;
