var RTL$ = require("eberon/eberon_rtl.js");
var Stream = require("js/Stream.js");
var String = require("js/String.js");
var $scope = "CodeGenerator";
var kTab = "\t";
var jsReservedWords = ["break", "case", "catch", "const", "continue", "debugger", "default", "delete", "do", "else", "finally", "for", "function", "if", "in", "instanceof", "new", "return", "switch", "this", "throw", "try", "typeof", "var", "void", "while", "with", "false", "true", "null", "class", "enum", "export", "extends", "import", "super", "implements", "interface", "let", "package", "private", "protected", "public", "static", "yield", "Object", "Math", "Number"];
Insertion.prototype.$scope = $scope;
function IGenerator(){
}
IGenerator.prototype.$scope = $scope;
function NullGenerator(){
	IGenerator.call(this);
}
RTL$.extend(NullGenerator, IGenerator, $scope);
function SimpleGenerator(){
	NullGenerator.call(this);
	this.mResult = '';
}
RTL$.extend(SimpleGenerator, NullGenerator, $scope);
Indent.prototype.$scope = $scope;
RTL$.extend(Generator, IGenerator, $scope);
var nullGenerator = null;
function Insertion(index/*INTEGER*/){
	this.index = index;
}
NullGenerator.prototype.write = function(s/*STRING*/){
};
NullGenerator.prototype.openScope = function(){
};
NullGenerator.prototype.closeScope = function(ending/*STRING*/){
};
NullGenerator.prototype.makeInsertion = function(){
	return null;
};
NullGenerator.prototype.insert = function(i/*Insertion*/, s/*STRING*/){
};
NullGenerator.prototype.result = function(){
	return "";
};
SimpleGenerator.prototype.write = function(s/*STRING*/){
	this.mResult = this.mResult + s;
};
SimpleGenerator.prototype.result = function(){
	return this.mResult;
};

function makeIndent(count/*INTEGER*/){
	var result = '';
	for (var i = 0; i <= count - 1 | 0; ++i){
		result = result + kTab;
	}
	return result;
}

function indentText(s/*STRING*/, indent/*INTEGER*/){
	var result = '';
	var index = String.indexOf(s, 10);
	var pos = 0;
	while (true){
		if (index != -1){
			++index;
			result = result + String.substr(s, pos, index - pos | 0) + makeIndent(indent);
			pos = index;
			index = String.indexOfFrom(s, 10, pos);
		} else break;
	}
	return result + String.substr(s, pos, s.length - pos | 0);
}

function addIndentedText(s/*STRING*/, indent/*VAR Indent*/){
	indent.result = indent.result + indentText(s, indent.indent);
}

function openScope(indent/*VAR Indent*/){
	++indent.indent;
	indent.result = indent.result + "{" + Stream.kCR + makeIndent(indent.indent);
}

function closeScope(ending/*STRING*/, indent/*VAR Indent*/){
	--indent.indent;
	var lenWithoutLastIndent = indent.result.length - 1 | 0;
	indent.result = String.substr(indent.result, 0, lenWithoutLastIndent) + "}";
	if (ending.length != 0){
		addIndentedText(ending, indent);
	}
	else {
		indent.result = indent.result + Stream.kCR + makeIndent(indent.indent);
	}
}
Generator.prototype.write = function(s/*STRING*/){
	addIndentedText(s, this.indents[this.indents.length - 1 | 0]);
};
Generator.prototype.openScope = function(){
	openScope(this.indents[this.indents.length - 1 | 0]);
};
Generator.prototype.closeScope = function(ending/*STRING*/){
	var i = this.indents.length - 1 | 0;
	while (true){
		if (this.indents[i].result.length == 0){
			this.indents.splice(i, 1);
			--i;
		} else break;
	}
	closeScope(ending, this.indents[i]);
};
Generator.prototype.makeInsertion = function(){
	var index = this.indents.length - 1 | 0;
	var result = new Insertion(index);
	this.indents.push(new Indent(this.indents[index].indent));
	return result;
};
Generator.prototype.insert = function(i/*Insertion*/, s/*STRING*/){
	addIndentedText(s, this.indents[i.index]);
};
Generator.prototype.result = function(){
	var result = '';
	var $seq1 = this.indents;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var indent = $seq1[$key2];
		result = result + indent.result;
	}
	return result;
};
function Indent(indent/*INTEGER*/){
	this.indent = indent;
	this.result = '';
}
function Generator(){
	IGenerator.call(this);
	this.indents = [];
	this.indents.push(new Indent(0));
}

function mangleId(id/*STRING*/){
	return jsReservedWords.indexOf(id) != -1 ? id + "$" : id;
}
nullGenerator = new NullGenerator();
exports.kTab = kTab;
exports.Insertion = Insertion;
exports.IGenerator = IGenerator;
exports.SimpleGenerator = SimpleGenerator;
exports.Indent = Indent;
exports.Generator = Generator;
exports.nullGenerator = function(){return nullGenerator;};
exports.mangleId = mangleId;
