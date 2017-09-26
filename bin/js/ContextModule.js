var RTL$ = require("eberon/eberon_rtl.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextType = require("js/ContextType.js");
var Errors = require("js/Errors.js");
var LanguageContext = require("js/LanguageContext.js");
var Object$ = require("js/Object.js");
var Scope = require("js/Scope.js");
var ScopeBase = require("js/ScopeBase.js");
var String = require("js/String.js");
var Symbols = require("js/Symbols.js");
var Types = require("js/Types.js");
var $scope = "ContextModule";
function Declaration(){
	ContextHierarchy.Node.apply(this, arguments);
	this.name = '';
	this.imports = {};
	this.moduleScope = null;
	this.moduleGen = null;
	this.scopeInfo = null;
}
RTL$.extend(Declaration, ContextHierarchy.Node, $scope);
function Import(){
	ContextHierarchy.Node.apply(this, arguments);
	this.currentModule = '';
	this.currentAlias = '';
	this.import = {};
}
RTL$.extend(Import, ContextHierarchy.Node, $scope);
Declaration.prototype.handleIdent = function(id/*STRING*/){
	if (this.name.length == 0){
		this.name = id;
		var root = this.root();
		this.moduleScope = new Scope.Module(id, root.language().stdSymbols);
		root.pushScope(this.moduleScope);
	}
	else if (id == this.name){
		var scope = this.moduleScope;
		scope.close();
		Scope.defineExports(scope);
		this.codeGenerator().write(this.moduleGen.epilog(scope.exports));
	}
	else {
		Errors.raise("original module name '" + this.name + "' expected, got '" + id + "'");
	}
};
Declaration.prototype.findModule = function(name/*STRING*/){
	if (name == this.name){
		Errors.raise("module '" + this.name + "' cannot import itself");
	}
	return this.root().findModule(name);
};
Declaration.prototype.handleImport = function(modules/*ARRAY OF PSymbol*/){
	var moduleAliases = {};
	var root = this.root();
	var scope = root.currentScope();
	var $seq1 = modules;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var s = $seq1[$key2];
		var name = RTL$.typeGuard(s.info(), Types.Module).name;
		this.imports[name] = s;
		scope.addSymbol(s, false);
		moduleAliases[name] = s.id();
	}
	this.moduleGen = root.language().moduleGenerator(this.name, moduleAliases);
	var code = this.codeGenerator();
	code.write(this.moduleGen.prolog());
	this.scopeInfo = new ContextType.ScopeInfoGenerator(this.name, code, null);
};
Declaration.prototype.qualifyScope = function(scope/*PType*/){
	var result = '';
	if (scope != this.moduleScope && scope instanceof Scope.Module){
		var id = scope.symbol.id();
		result = !Object.prototype.hasOwnProperty.call(this.imports, id) ? "module '" + id + "' is not imported" : CodeGenerator.mangleId(RTL$.getMappedValue(this.imports, id).id()) + ".";
	}
	return result;
};
Declaration.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (!ContextType.handleDescribeScopeMsg(msg, this.scopeInfo)){
		result = ContextHierarchy.Node.prototype.handleMessage.call(this, msg);
	}
	return result;
};
Import.prototype.handleIdent = function(id/*STRING*/){
	this.currentModule = id;
};

function handleImport(import$/*VAR Import*/){
	var alias = import$.currentAlias;
	if (alias.length == 0){
		alias = import$.currentModule;
	}
	else {
		import$.currentAlias = "";
	}
	var $seq1 = import$.import;
	for(var a in $seq1){
		var m = $seq1[a];
		if (a == alias){
			Errors.raise("duplicated alias: '" + alias + "'");
		}
		else if (m == import$.currentModule){
			Errors.raise("module already imported: '" + import$.currentModule + "'");
		}
	}
	import$.import[alias] = import$.currentModule;
}
Import.prototype.handleLiteral = function(s/*STRING*/){
	if (s == ":="){
		this.currentAlias = this.currentModule;
	}
	else if (s == ","){
		handleImport(this);
	}
};
Import.prototype.endParse = function(){
	var modules = [];
	var unresolved = [];
	if (this.currentModule.length != 0){
		handleImport(this);
	}
	var parent = RTL$.typeGuard(this.parent(), Declaration);
	var $seq1 = this.import;
	for(var alias in $seq1){
		var moduleName = $seq1[alias];
		var module = parent.findModule(moduleName);
		if (module == null){
			unresolved.push(moduleName);
		}
		else {
			modules.push(new Symbols.Symbol(alias, module));
		}
	}
	if (unresolved.length != 0){
		Errors.raise("module(s) not found: " + String.join(unresolved, ", "));
	}
	parent.handleImport(modules);
	return true;
};
exports.Declaration = Declaration;
exports.Import = Import;
