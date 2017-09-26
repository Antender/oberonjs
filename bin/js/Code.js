var RTL$ = require("eberon/eberon_rtl.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ConstValue = require("js/ConstValue.js");
var Designator = require("js/Designator.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var Object$ = require("js/Object.js");
var Stream = require("js/Stream.js");
var ScopeBase = require("js/ScopeBase.js");
var Symbols = require("js/Symbols.js");
var Precedence = require("js/CodePrecedence.js");
var Record = require("js/Record.js");
var String = require("js/String.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var $scope = "Code";
ModuleGenerator.prototype.$scope = $scope;

function adjustPrecedence(e/*PType*/, precedence/*INTEGER*/){
	var result = '';
	result = e.code();
	if (precedence != Precedence.none && e.maxPrecedence() > precedence){
		result = "(" + result + ")";
	}
	return result;
}

function isPointerShouldBeExported(type/*Pointer*/){
	var result = '';
	var r = Record.pointerBase(type);
	if (r.finalizedAsNonExported){
		result = r.cons;
	}
	return result;
}

function typeShouldBeExported(typeId/*PType*/, defaultId/*STRING*/){
	var result = '';
	var type = typeId.type();
	if (type instanceof Record.Type){
		result = defaultId;
	}
	else if (type instanceof Record.Pointer){
		result = isPointerShouldBeExported(type);
	}
	return result;
}

function genExport(s/*Symbol*/){
	var codeId = CodeGenerator.mangleId(s.id());
	return s.isVariable() ? "function(){return " + codeId + ";}" : !s.isType() ? codeId : typeShouldBeExported(RTL$.typeGuard(s.info(), TypeId.Type), codeId);
}

function genCommaList(m/*MAP OF STRING*/, import$/*BOOLEAN*/){
	var result = '';
	var $seq1 = m;
	for(var name in $seq1){
		var alias = $seq1[name];
		if (result.length != 0){
			result = result + ", ";
		}
		result = result + (!import$ && name == "JS" ? "this" : CodeGenerator.mangleId(import$ ? alias : name));
	}
	return result;
}
ModuleGenerator.prototype.prolog = function(){
	return "var " + CodeGenerator.mangleId(this.name) + " = function (" + genCommaList(this.imports, true) + "){" + Stream.kCR;
};

function exportId(s/*Symbol*/){
	var result = '';
	var info = s.info();
	if (info instanceof TypeId.Type){
		var type = info.type();
		if (type instanceof Record.Pointer){
			var name = Record.pointerBase(type).cons;
			if (name.length != 0){
				result = name;
			}
		}
	}
	if (result.length == 0){
		result = s.id();
	}
	return Record.mangleJSProperty(result);
}
ModuleGenerator.prototype.epilog = function(exports/*MAP OF PSymbol*/){
	var result = '';
	var $seq1 = exports;
	for(var $key2 in $seq1){
		var s = $seq1[$key2];
		var code = genExport(s);
		if (code.length != 0){
			if (result.length != 0){
				result = result + "," + Stream.kCR;
			}
			result = result + CodeGenerator.kTab + exportId(s) + ": " + code;
		}
	}
	if (result.length != 0){
		result = "return {" + Stream.kCR + result + Stream.kCR + "}" + Stream.kCR;
	}
	result = result + "}(" + genCommaList(this.imports, false) + ");" + Stream.kCR;
	return result;
};
function ModuleGenerator(name/*STRING*/, imports/*MAP OF STRING*/){
	this.name = name;
	this.imports = RTL$.clone(imports, {map: null}, undefined);
}

function checkIndex(i/*INTEGER*/){
	if (i < 0){
		Errors.raise("index is negative: " + String.fromInt(i));
	}
}
exports.ModuleGenerator = ModuleGenerator;
exports.adjustPrecedence = adjustPrecedence;
exports.genExport = genExport;
exports.exportId = exportId;
exports.checkIndex = checkIndex;
