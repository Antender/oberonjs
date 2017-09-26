var RTL$ = require("eberon/eberon_rtl.js");
var CodeGenerator = require("js/CodeGenerator.js");
var Context = require("js/Context.js");
var Designator = require("js/Designator.js");
var Errors = require("js/Errors.js");
var LanguageContext = require("js/LanguageContext.js");
var Module = require("js/Module.js");
var OberonRtl = require("js/OberonRtl.js");
var Object$ = require("js/Object.js");
var Scope = require("js/Scope.js");
var ScopeBase = require("js/ScopeBase.js");
var Symbols = require("js/Symbols.js");
var String = require("js/String.js");
var Types = require("js/Types.js");
var $scope = "ContextHierarchy";
function Message(){
}
Message.prototype.$scope = $scope;
QIdent.prototype.$scope = $scope;
function Attributes(){
	this.designator = null;
}
Attributes.prototype.$scope = $scope;
RTL$.extend(Node, Context.Type, $scope);
RTL$.extend(Root, Node, $scope);
function QIdent(module/*PType*/, id/*STRING*/, code/*STRING*/){
	this.module = module;
	this.id = id;
	this.code = code;
}
function Node(parent/*PNode*/){
	Context.Type.call(this);
	this.mParent = parent;
	this.attributes = null;
	if (parent != null){
		this.attributes = parent.attributes;
	}
	else {
		this.attributes = new Attributes();
	}
}
Node.prototype.root = function(){
	return this.mParent.root();
};
Node.prototype.parent = function(){
	return this.mParent;
};
Node.prototype.handleMessage = function(msg/*VAR Message*/){
	return this.mParent.handleMessage(msg);
};
Node.prototype.codeGenerator = function(){
	return this.mParent.codeGenerator();
};
Node.prototype.qualifyScope = function(scope/*PType*/){
	return this.mParent.qualifyScope(scope);
};
Node.prototype.rtl = function(){
	return this.root().language().rtl;
};
Node.prototype.handleLiteral = function(s/*STRING*/){
};
Node.prototype.handleIdent = function(s/*STRING*/){
};
Node.prototype.genTypeName = function(){
	return this.mParent.genTypeName();
};
function Root(language/*PLanguage*/){
	Node.call(this, null);
	this.mLanguage = language;
	this.scopes = [];
	this.gen = 0;
}
Root.prototype.language = function(){
	return this.mLanguage;
};
Root.prototype.genTypeName = function(){
	++this.gen;
	return "anonymous$" + String.fromInt(this.gen);
};
Root.prototype.findSymbol = function(ident/*STRING*/){
	var result = null;
	var i = this.scopes.length;
	while (true){
		if (i != 0 && result == null){
			--i;
			var scope = this.scopes[i];
			result = scope.findSymbol(ident);
		} else break;
	}
	return result;
};
Root.prototype.findModule = function(name/*STRING*/){
	var result = null;
	if (name == "JS"){
		result = Module.makeJS();
	}
	else if (this.mLanguage.moduleResolver != null){
		result = this.mLanguage.moduleResolver(name);
	}
	return result;
};
Root.prototype.currentScope = function(){
	return this.scopes[this.scopes.length - 1 | 0];
};
Root.prototype.pushScope = function(scope/*PType*/){
	this.scopes.push(scope);
};
Root.prototype.popScope = function(){
	var i = this.scopes.length - 1 | 0;
	this.scopes[i].close();
	this.scopes.splice(i, 1);
};
Root.prototype.codeGenerator = function(){
	return this.mLanguage.codeTraits.generator();
};
Root.prototype.root = function(){
	return this;
};

function getSymbolAndScope(cx/*Root*/, id/*STRING*/){
	var s = cx.findSymbol(id);
	if (s == null){
		Errors.raise("undeclared identifier: '" + id + "'");
	}
	return s;
}

function getModuleSymbolAndScope(m/*Type*/, id/*STRING*/){
	var s = m.findSymbol(id);
	if (s == null){
		Errors.raise("identifier '" + id + "' is not exported by module '" + m.name + "'");
	}
	return s;
}

function getQIdSymbolAndScope(cx/*Root*/, q/*QIdent*/){
	var result = null;
	if (q.module != null){
		result = getModuleSymbolAndScope(q.module, q.id);
	}
	else {
		result = getSymbolAndScope(cx, q.id);
	}
	return result;
}

function getSymbol(cx/*Root*/, id/*STRING*/){
	return getSymbolAndScope(cx, id).symbol();
}

function makeLanguageContext(cx/*PNode*/){
	return new LanguageContext.Type(cx.root().language(), cx);
}
exports.Message = Message;
exports.QIdent = QIdent;
exports.Attributes = Attributes;
exports.Node = Node;
exports.Root = Root;
exports.getSymbolAndScope = getSymbolAndScope;
exports.getModuleSymbolAndScope = getModuleSymbolAndScope;
exports.getQIdSymbolAndScope = getQIdSymbolAndScope;
exports.getSymbol = getSymbol;
exports.makeLanguageContext = makeLanguageContext;
