var RTL$ = require("eberon/eberon_rtl.js");
var Context = require("js/Context.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ContextDesignator = require("js/ContextDesignator.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextType = require("js/ContextType.js");
var Module = require("js/Module.js");
var Record = require("js/Record.js");
var TypeId = require("js/TypeId.js");
var $scope = "ContextIdentdef";
RTL$.extend(Type, ContextHierarchy.Node, $scope);
RTL$.extend(Qualified, ContextHierarchy.Node, $scope);
function QualifiedModule(){
	ContextHierarchy.Node.apply(this, arguments);
	this.id = '';
}
RTL$.extend(QualifiedModule, ContextHierarchy.Node, $scope);
function Type(parent/*PDeclarationAndIdentHandle*/){
	ContextHierarchy.Node.call(this, parent);
	this.parentDecl = parent;
	this.id = '';
	this.export = false;
}
Type.prototype.handleIdent = function(id/*STRING*/){
	this.id = id;
};
Type.prototype.handleLiteral = function(s/*STRING*/){
	this.export = true;
};
Type.prototype.doMakeIdendef = function(){
	return new Context.IdentdefInfo(this.id, this.export);
};
Type.prototype.endParse = function(){
	this.parentDecl.handleIdentdef(this.doMakeIdendef());
	return true;
};
function Qualified(parent/*PQIdentHandler*/){
	ContextHierarchy.Node.call(this, parent);
	this.qidentHandler = parent;
	this.module = null;
	this.id = '';
	this.code = '';
}
Qualified.prototype.handleIdent = function(id/*STRING*/){
	this.id = id;
};
Qualified.prototype.handleModule = function(id/*STRING*/, module/*PType*/){
	this.module = module;
	this.code = CodeGenerator.mangleId(id) + ".";
};
Qualified.prototype.endParse = function(){
	var code = '';
	if (this.code.length == 0){
		code = CodeGenerator.mangleId(this.id);
	}
	else {
		code = this.code + Record.mangleJSProperty(this.id);
	}
	this.qidentHandler.handleQIdent(new ContextHierarchy.QIdent(this.module, this.id, code));
	return true;
};
QualifiedModule.prototype.handleIdent = function(id/*STRING*/){
	this.id = id;
};
QualifiedModule.prototype.endParse = function(){
	var result = false;
	var found = this.root().findSymbol(this.id);
	if (found != null){
		var s = found.symbol();
		if (s != null){
			var info = s.info();
			if (info instanceof Module.Type){
				RTL$.typeGuard(this.parent(), Qualified).handleModule(this.id, info);
				result = true;
			}
		}
	}
	return result;
};
exports.Type = Type;
exports.Qualified = Qualified;
exports.QualifiedModule = QualifiedModule;
