var RTL$ = require("eberon/eberon_rtl.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ContextDesignator = require("js/ContextDesignator.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextProcedure = require("js/ContextProcedure.js");
var Expression = require("js/Expression.js");
var Module = require("js/Module.js");
var Object$ = require("js/Object.js");
var Operator = require("js/Operator.js");
var Procedure = require("js/Procedure.js");
var Types = require("js/Types.js");
var $scope = "OberonContext";
RTL$.extend(ProcedureCall, ContextExpression.ExpressionHandler, $scope);
function StatementProcedureCall(){
	ProcedureCall.apply(this, arguments);
}
RTL$.extend(StatementProcedureCall, ProcedureCall, $scope);
function ExpressionProcedureCall(){
	ProcedureCall.apply(this, arguments);
	this.hasActualParameters = false;
}
RTL$.extend(ExpressionProcedureCall, ProcedureCall, $scope);
function Assignment(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
}
RTL$.extend(Assignment, ContextExpression.ExpressionHandler, $scope);
function ProcedureCall(parent/*PNode*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	this.code = new CodeGenerator.SimpleGenerator();
	this.type = null;
	this.id = '';
	this.call = null;
	this.cachedCallExpression = null;
	this.attributes = new ContextHierarchy.Attributes();
}
ProcedureCall.prototype.do = function(){
	if (this.call == null){
		var d = this.attributes.designator;
		this.type = d.type();
		this.id = d.code();
		this.call = ContextProcedure.makeCall(this, this.type, d.info());
		this.cachedCallExpression = null;
	}
	return this.call;
};
ProcedureCall.prototype.codeGenerator = function(){
	return this.code;
};
ProcedureCall.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (!(msg instanceof ContextDesignator.BeginCallMsg) && !(msg instanceof ContextDesignator.EndCallMsg)){
		result = ContextExpression.ExpressionHandler.prototype.handleMessage.call(this, msg);
	}
	return result;
};
ProcedureCall.prototype.handleExpression = function(e/*PType*/){
	this.do().handleArgument(e);
};
ProcedureCall.prototype.callExpression = function(){
	if (this.cachedCallExpression == null){
		var e = this.do().end();
		this.cachedCallExpression = new Expression.Type(this.id + e.code(), e.type(), null, e.constValue(), e.maxPrecedence());
	}
	return this.cachedCallExpression;
};
StatementProcedureCall.prototype.endParse = function(){
	var e = this.callExpression();
	Module.assertProcStatementResult(e.type());
	this.parent().codeGenerator().write(e.code());
	return true;
};
ExpressionProcedureCall.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (msg instanceof ContextDesignator.BeginCallMsg){
		this.hasActualParameters = true;
	}
	else {
		result = ProcedureCall.prototype.handleMessage.call(this, msg);
	}
	return result;
};
ExpressionProcedureCall.prototype.endParse = function(){
	var e = null;
	if (this.hasActualParameters){
		e = this.callExpression();
	}
	else {
		e = ContextExpression.designatorAsExpression(this.attributes.designator);
	}
	RTL$.typeGuard(this.parent(), ContextExpression.ExpressionHandler).handleExpression(e);
	return true;
};
Assignment.prototype.codeGenerator = function(){
	return CodeGenerator.nullGenerator();
};
Assignment.prototype.handleExpression = function(e/*PType*/){
	var d = this.attributes.designator;
	this.parent().codeGenerator().write(Operator.assign(d.info(), e, ContextHierarchy.makeLanguageContext(this)));
};
exports.StatementProcedureCall = StatementProcedureCall;
exports.ExpressionProcedureCall = ExpressionProcedureCall;
exports.Assignment = Assignment;
