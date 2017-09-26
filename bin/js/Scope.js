var RTL$ = require("eberon/eberon_rtl.js");
var Errors = require("js/Errors.js");
var M = require("js/Module.js");
var Object$ = require("js/Object.js");
var Procedures = require("js/Procedure.js");
var Record = require("js/Record.js");
var ScopeBase = require("js/ScopeBase.js");
var String = require("js/String.js");
var Symbols = require("js/Symbols.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "Scope";
Finalizer.prototype.$scope = $scope;
RTL$.extend(Type, ScopeBase.Type, $scope);
function Procedure(){
	Type.apply(this, arguments);
	this.tempVarCounter = 0;
}
RTL$.extend(Procedure, Type, $scope);
function CompiledModule(){
	M.Type.apply(this, arguments);
	this.exports = {};
}
RTL$.extend(CompiledModule, M.Type, $scope);
RTL$.extend(Module, Type, $scope);

function addSymbolForType(t/*PBasicType*/, result/*VAR MAP OF PSymbol*/){
	result[t.name] = new Symbols.Symbol(t.name, new TypeId.Type(t));
}

function makeStdSymbols(){
	var result = {};
	
	function addSymbol(t/*PBasicType*/){
		addSymbolForType(t, result);
	}
	addSymbol(Types.basic().bool);
	addSymbol(Types.basic().ch);
	addSymbol(Types.basic().integer);
	addSymbol(Types.basic().uint8);
	addSymbol(Types.basic().real);
	addSymbol(Types.basic().set);
	var $seq1 = Procedures.predefined();
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var proc = $seq1[$key2];
		result[proc.id()] = proc;
	}
	return result;
}
function Type(stdSymbols/*MAP OF PSymbol*/){
	ScopeBase.Type.call(this);
	this.stdSymbols = RTL$.clone(stdSymbols, {map: null}, undefined);
	this.symbols = {};
	this.unresolved = [];
	this.finalizers = [];
}
function Module(name/*STRING*/, stdSymbols/*MAP OF PSymbol*/){
	Type.call(this, stdSymbols);
	this.symbol = new Symbols.Symbol(name, new CompiledModule(name));
	this.exports = {};
	this.tempVarCounter = 0;
	this.addSymbol(this.symbol, false);
}

function addUnresolved(s/*VAR Type*/, id/*STRING*/){
	if (s.unresolved.indexOf(id) == -1){
		s.unresolved.push(id);
	}
}

function resolve(s/*VAR Type*/, symbol/*PSymbol*/){
	var id = '';
	var i = 0;
	var info = null;
	var type = null;
	id = symbol.id();
	i = s.unresolved.indexOf(id);
	if (i != -1){
		info = symbol.info();
		type = RTL$.typeGuard(info, TypeId.Type).type();
		if (type != null && !(type instanceof Record.Type)){
			Errors.raise("'" + id + "' must be of RECORD type because it was used before in the declation of POINTER");
		}
		s.unresolved.splice(i, 1);
	}
}

function checkAllResolved(s/*Type*/){
	if (s.unresolved.length != 0){
		Errors.raise("no declaration found for '" + String.join(s.unresolved, "', '") + "'");
	}
}
Type.prototype.close = function(){
	var $seq1 = this.finalizers;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var finalizer = $seq1[$key2];
		finalizer.proc(finalizer.closure);
	}
	this.finalizers.splice(0, Number.MAX_VALUE);
};
function Finalizer(proc/*FinalizerProc*/, closure/*PType*/){
	this.proc = proc;
	this.closure = closure;
}
Type.prototype.addFinalizer = function(proc/*FinalizerProc*/, closure/*PType*/){
	this.finalizers.push(new Finalizer(proc, closure));
};

function close(s/*Type*/){
	return s.unresolved.slice();
}
Type.prototype.addSymbol = function(s/*PSymbol*/, exported/*BOOLEAN*/){
	var id = s.id();
	if (this.findSymbol(id) != null){
		Errors.raise("'" + id + "' already declared");
	}
	this.symbols[id] = s;
};
Type.prototype.findSymbol = function(id/*STRING*/){
	var result = null;
	var found = null;
	if (Object.prototype.hasOwnProperty.call(this.symbols, id)){
		result = RTL$.getMappedValue(this.symbols, id);
	}
	else if (Object.prototype.hasOwnProperty.call(this.stdSymbols, id)){
		result = RTL$.getMappedValue(this.stdSymbols, id);
	}
	if (result != null){
		found = new Symbols.FoundSymbol(result, this);
	}
	return found;
};
Procedure.prototype.name = function(){
	return "procedure";
};
Procedure.prototype.addSymbol = function(s/*PSymbol*/, exported/*BOOLEAN*/){
	var info = null;
	if (exported){
		info = s.info();
		Errors.raise("cannot export from within procedure: " + info.idType() + " '" + s.id() + "'");
	}
	Type.prototype.addSymbol.call(this, s, exported);
};

function generateTempVar(pattern/*STRING*/, counter/*VAR INTEGER*/){
	counter.set(counter.get() + 1 | 0);
	return "$" + pattern + String.fromInt(counter.get());
}
Procedure.prototype.generateTempVar = function(pattern/*STRING*/){
	return generateTempVar(pattern, RTL$.makeRef(this, "tempVarCounter"));
};
Module.prototype.generateTempVar = function(pattern/*STRING*/){
	return generateTempVar(pattern, RTL$.makeRef(this, "tempVarCounter"));
};

function defineExports(m/*Module*/){
	var cm = RTL$.typeGuard(m.symbol.info(), CompiledModule);
	var $seq1 = m.exports;
	for(var id in $seq1){
		var k = $seq1[id];
		var symbol = k;
		var info = symbol.info();
		if (info instanceof Types.Variable){
			symbol = new Symbols.Symbol(id, new Variable.ExportedVariable(id, info.type()));
		}
		cm.exports[id] = symbol;
	}
}
CompiledModule.prototype.findSymbol = function(id/*STRING*/){
	var result = null;
	if (Object.prototype.hasOwnProperty.call(this.exports, id)){
		result = new Symbols.FoundSymbol(RTL$.getMappedValue(this.exports, id), null);
	}
	return result;
};
Module.prototype.name = function(){
	return "module";
};
Module.prototype.addSymbol = function(s/*PSymbol*/, exported/*BOOLEAN*/){
	Type.prototype.addSymbol.call(this, s, exported);
	if (exported){
		this.exports[s.id()] = s;
	}
};

function moduleSymbol(m/*Module*/){
	return m.symbol;
}
exports.Type = Type;
exports.Procedure = Procedure;
exports.Module = Module;
exports.addSymbolForType = addSymbolForType;
exports.makeStdSymbols = makeStdSymbols;
exports.addUnresolved = addUnresolved;
exports.resolve = resolve;
exports.checkAllResolved = checkAllResolved;
exports.close = close;
exports.defineExports = defineExports;
exports.moduleSymbol = moduleSymbol;
