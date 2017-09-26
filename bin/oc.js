var buildVersion = "\"2017-02-18 01:34:33 -0600\nde5159d4845bb59f4a2209905c9cb8c51f429e4b\"\n";
var GLOBAL = this;
var imports = {};
function require(module){return imports[module];}
imports["rtl.js"] = {};
(function module$rtl(exports){
"use strict";

if (typeof Uint16Array == "undefined"){
    GLOBAL.Uint16Array = function(length){
        Array.call(this, length);
        for(var i = 0; i < length; ++i)
            this[i] = 0;
    };
}

function applyMap(from, to){
    for(var p in from)
        to[p] = from[p];
}

function Class(){}
Class.extend = function extend(methods){
        function Type(){
            applyMap(methods, this);
        }
        Type.prototype = this.prototype;

        var result = methods.init;
        result.prototype = new Type(); // inherit this.prototype
        result.prototype.constructor = result; // to see constructor name in diagnostic
        
        result.extend = extend;
        return result;
    };

var methods = {
    extend: function(cons, base, scope){
        function Type(){}
        Type.prototype = base.prototype;
        cons.prototype = new Type();
        cons.prototype.constructor = cons;
        cons.prototype.$scope = scope;
    },
    typeGuard: function(from, to){
        if (!from)
            return from;
        if (!(from instanceof to)){
            var fromStr;
            var toStr;
            var scope;
            
            if (from && from.constructor && from.constructor.name){
                var name = from.constructor.name;
                scope = from.$scope;
                fromStr = scope ? scope + "." + name : name;
            }
            else
                fromStr = "" + from;
            
            if (to.name){
                toStr = "" + to.name;
                scope = to.prototype.$scope;
                toStr = scope ? scope + "." + toStr : toStr;
            }
            else
                toStr = "" + to;
            
            var msg = "cannot cast";
            if (fromStr || toStr)               
                msg += " to '" + toStr + "' from '" + fromStr + "'";
            throw new Error(msg);
        }
        return from;
    },
    charAt: function(s, index){
        if (index >= 0 && index < s.length)
            return s.charCodeAt(index);
        throw new Error("index out of bounds: " + index);
    },
    getAt: function(where, index){
        if (index >= 0 && index < where.length)
            return where[index];
        throw new Error("index out of bounds: " + index);
    },
    putAt: function(where, index, what){
        if (index >= 0 && index < where.length)
            where[index] = what;
        else
            throw new Error("index out of bounds: " + index);
    },
    makeArray: function(/*dimensions, initializer*/){
        var forward = Array.prototype.slice.call(arguments);
        var result = new Array(forward.shift());
        var i;
        if (forward.length == 1){
            var init = forward[0];
            if (typeof init == "function")
                for(i = 0; i < result.length; ++i)
                    result[i] = init();
            else
                for(i = 0; i < result.length; ++i)
                    result[i] = init;
        }
        else
            for(i = 0; i < result.length; ++i)
                result[i] = this.makeArray.apply(this, forward);
        return result;
    },
    __setupCharArrayMethods: function(a){
        var rtl = this;
        a.charCodeAt = function(i){return this[i];};
        a.slice = function(){
            var result = Array.prototype.slice.apply(this, arguments);
            rtl.__setupCharArrayMethods(result);
            return result;
        };
        a.toString = function(){
            return String.fromCharCode.apply(this, this);
        };
    },
    __makeCharArray: function(length){
        var result = new Uint16Array(length);
        this.__setupCharArrayMethods(result);
        return result;
    },
    makeCharArray: function(/*dimensions*/){
        var forward = Array.prototype.slice.call(arguments);
        var length = forward.pop();

        if (!forward.length)
            return this.__makeCharArray(length);

        function makeArray(){
            var forward = Array.prototype.slice.call(arguments);
            var result = new Array(forward.shift());
            var i;
            if (forward.length == 1){
                var init = forward[0];
                for(i = 0; i < result.length; ++i)
                    result[i] = init();
            }
            else
                for(i = 0; i < result.length; ++i)
                    result[i] = makeArray.apply(undefined, forward);
            return result;
        }

        forward.push(this.__makeCharArray.bind(this, length));
        return makeArray.apply(undefined, forward);
    },
    makeSet: function(/*...*/){
        var result = 0;
        
        function checkBit(b){
            if (b < 0 || b > 31)
                throw new Error("integers between 0 and 31 expected, got " + b);
        }

        function setBit(b){
            checkBit(b);
            result |= 1 << b;
        }
        
        for(var i = 0; i < arguments.length; ++i){
            var b = arguments[i];
            if (b instanceof Array){
                var from = b[0];
                var to = b[1];
                if (to < from)
                    throw new Error("invalid SET diapason: " + from + ".." + to);
                for(var bi = from; bi <= to; ++bi)
                    setBit(bi);
            }
            else
                setBit(b);
        }
        return result;
    },
    makeRef: function(obj, prop){
        return {set: function(v){ obj[prop] = v; },
                get: function(){ return obj[prop]; }};
    },
    setInclL: function(l, r){return (l & r) == l;},
    setInclR: function(l, r){return (l & r) == r;},
    assignArrayFromString: function(a, s){
        var i;
        for(i = 0; i < s.length; ++i)
            a[i] = s.charCodeAt(i);
        for(i = s.length; i < a.length; ++i)
            a[i] = 0;
    },
    strCmp: function(s1, s2){
        var cmp = 0;
        var i = 0;
        while (!cmp && i < s1.length && i < s2.length){
            cmp = s1.charCodeAt(i) - s2.charCodeAt(i);
            ++i;
        }
        return cmp ? cmp : s1.length - s2.length;
    },
    copy: function(from, to, type){
        var r = type.record;
        if (r){
            for(var f in r){
                var fieldType = r[f];
                if (fieldType)
                    this.copy(from[f], to[f], fieldType);
                else
                    to[f] = from[f];
            }
            return;
        }
        var a = type.array;
        if (a !== undefined ){
            if (a === null)
                // shallow copy
                Array.prototype.splice.apply(to, [0, to.length].concat(from));
            else {
                // deep copy
                to.splice(0, to.length);
                for(var i = 0; i < from.length; ++i)
                    to.push(this.clone(from[i], a));
            }
        }
    },
    clone: function(from, type, recordCons){
        var result;
        var r = type.record;
        if (r){
            var Ctr = recordCons || from.constructor;
            result = new Ctr();
            this.copy(from, result, type);
            return result;
        }
        var a = type.array;
        if (a !== undefined ){
            if (a === null)
                // shallow clone
                return from.slice();

            // deep clone
            var length = from.length;
            result = new Array(length);
            for(var i = 0; i < length; ++i)
                result[i] = this.clone(from[i], a);
            return result;
        }
    },
    assert: function(condition){
        if (!condition)
            throw new Error("assertion failed");
    }
};

exports.Class = Class;
exports.rtl = {
    dependencies: { 
        "copy": ["clone"],
        "clone": ["copy"],
        "makeCharArray": ["__makeCharArray"],
        "__makeCharArray": ["__setupCharArrayMethods"]
    },
    methods: methods,
    nodejsModule: "rtl.js"
};
exports.applyMap = applyMap;
applyMap(methods, exports);

})(imports["rtl.js"]);
imports["eberon/eberon_rtl.js"] = {};
(function module$eberon_rtl(exports){
"use strict";

var oberon_rtl = require("rtl.js");

function extendMap(base, ext){
    var result = {};
    oberon_rtl.applyMap(base, result);
    oberon_rtl.applyMap(ext, result);
    return result;
}

var methods = extendMap(oberon_rtl.rtl.methods, {
    getMappedValue: function(map, key){
        if (!map.hasOwnProperty(key))
            throw new Error("invalid key: " + key);
        return map[key];
    },
    clearMap: function(map){
        for(var p in map)
            delete map[p];
    },
    clone: function(from, type, recordCons){
        var m = type.map;
        if (m !== undefined){
            var result = {};
            this.__copyMap(from, result, m);
            return result;
        }
        return this.__inheritedClone(from, type, recordCons);
    },
    copy: function(from, to, type){
        var m = type.map;
        if (m !== undefined){
            this.clearMap(to);
            this.__copyMap(from, to, m);
        }
        else
            this.__inheritedCopy(from, to, type);
    },
    __copyMap: function(from, to, type){
        var k;
        if (type === null)
            // shallow copy
            for(k in from)
                to[k] = from[k];
        else
            // deep copy
            for(k in from)
                to[k] = this.clone(from[k], type);
    },
    __inheritedClone: oberon_rtl.rtl.methods.clone,
    __inheritedCopy: oberon_rtl.rtl.methods.copy
});
oberon_rtl.applyMap(methods, exports);

var dependencies = extendMap(oberon_rtl.rtl.dependencies, { 
        "clone": oberon_rtl.rtl.dependencies.clone.concat(["__copyMap", "__inheritedClone"]),
        "copy": oberon_rtl.rtl.dependencies.copy.concat(["clearMap", "__copyMap", "__inheritedCopy"])
    });

exports.rtl = {
    dependencies: dependencies,
    methods: methods,
    nodejsModule: "eberon/eberon_rtl.js"
};

})(imports["eberon/eberon_rtl.js"]);
imports["js/String.js"] = {};
(function module$String(exports){
var JS = GLOBAL;

function fromChar(c/*CHAR*/){
	var result = '';
	result = JS.String.fromCharCode(c);
	return result;
}

function fromInt(i/*INTEGER*/){
	var result = '';
	result = '' + i;
	return result;
}

function fromReal(r/*REAL*/){
	var result = '';
	result = '' + r;
	return result;
}

function parseReal(s/*STRING*/){
	var result = 0;
	result = JS.Number(s);
	return result;
}

function parseHex(s/*STRING*/){
	var result = 0;
	result = JS.parseInt(s, 16);
	return result;
}

function indexOf(self/*STRING*/, c/*CHAR*/){
	var result = 0;
	result = self.indexOf(JS.String.fromCharCode(c));
	return result;
}

function indexOfFrom(self/*STRING*/, c/*CHAR*/, pos/*INTEGER*/){
	var result = 0;
	result = self.indexOf(JS.String.fromCharCode(c), pos);
	return result;
}

function lastIndexOfFrom(self/*STRING*/, c/*CHAR*/, pos/*INTEGER*/){
	var result = 0;
	result = self.lastIndexOf(JS.String.fromCharCode(c), pos);
	return result;
}

function substr(self/*STRING*/, pos/*INTEGER*/, len/*INTEGER*/){
	var result = '';
	result = self.substr(pos, len);
	return result;
}

function join(a/*ARRAY OF STRING*/, separator/*STRING*/){
	var result = '';
	result = a.join(separator);
	return result;
}
exports.fromChar = fromChar;
exports.fromInt = fromInt;
exports.fromReal = fromReal;
exports.parseReal = parseReal;
exports.parseHex = parseHex;
exports.indexOf = indexOf;
exports.indexOfFrom = indexOfFrom;
exports.lastIndexOfFrom = lastIndexOfFrom;
exports.substr = substr;
exports.join = join;

})(imports["js/String.js"]);
imports["js/Stream.js"] = {};
(function module$Stream(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var String = require("js/String.js");
var $scope = "Stream";
var kCR = "\n";
Type.prototype.$scope = $scope;
function Type(text/*STRING*/){
	this.s = text;
	this.pos = 0;
}

function eof(self/*Type*/){
	return self.pos == self.s.length;
}

function pos(self/*Type*/){
	return self.pos;
}

function setPos(self/*VAR Type*/, pos/*INTEGER*/){
	RTL$.assert(pos <= self.s.length);
	self.pos = pos;
}

function next(self/*VAR Type*/, n/*INTEGER*/){
	RTL$.assert((self.pos + n | 0) <= self.s.length);
	self.pos = self.pos + n | 0;
}

function peekChar(self/*Type*/){
	RTL$.assert(!eof(self));
	return self.s.charCodeAt(self.pos);
}

function getChar(self/*VAR Type*/){
	var result = 0;
	RTL$.assert(!eof(self));
	result = self.s.charCodeAt(self.pos);
	++self.pos;
	return result;
}

function peekStr(self/*Type*/, s/*STRING*/){
	var result = false;
	var i = 0;
	if (s.length <= (self.s.length - self.pos | 0)){
		while (true){
			if (i < s.length && s.charCodeAt(i) == self.s.charCodeAt(self.pos + i | 0)){
				++i;
			} else break;
		}
		result = i == s.length;
	}
	return result;
}

function read(self/*VAR Type*/, f/*ReaderProc*/){
	while (true){
		if (!eof(self) && f(peekChar(self))){
			next(self, 1);
		} else break;
	}
	return !eof(self);
}

function lineNumber(self/*Type*/){
	var line = 0;
	var lastPos = 0;
	lastPos = String.indexOf(self.s, 10);
	while (true){
		if (lastPos != -1 && lastPos < self.pos){
			++line;
			lastPos = String.indexOfFrom(self.s, 10, lastPos + 1 | 0);
		} else break;
	}
	return line + 1 | 0;
}

function currentLine(self/*Type*/){
	var from = String.lastIndexOfFrom(self.s, 10, self.pos);
	if (from == -1){
		from = 0;
	}
	else {
		from = from + 1 | 0;
	}
	var to = String.indexOfFrom(self.s, 10, self.pos);
	if (to == -1){
		to = self.s.length;
	}
	return String.substr(self.s, from, to - from | 0);
}
exports.kCR = kCR;
exports.Type = Type;
exports.eof = eof;
exports.pos = pos;
exports.setPos = setPos;
exports.next = next;
exports.peekChar = peekChar;
exports.getChar = getChar;
exports.peekStr = peekStr;
exports.read = read;
exports.lineNumber = lineNumber;
exports.currentLine = currentLine;

})(imports["js/Stream.js"]);
imports["js/CodeGenerator.js"] = {};
(function module$CodeGenerator(exports){
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

})(imports["js/CodeGenerator.js"]);
imports["js/ConstValue.js"] = {};
(function module$ConstValue(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var $scope = "ConstValue";
function Type(){
}
Type.prototype.$scope = $scope;
RTL$.extend(Int, Type, $scope);
RTL$.extend(Real, Type, $scope);
RTL$.extend(Set, Type, $scope);
RTL$.extend(String, Type, $scope);
function Int(n/*INTEGER*/){
	Type.call(this);
	this.value = n;
}
function Real(r/*REAL*/){
	Type.call(this);
	this.value = r;
}
function Set(s/*SET*/){
	Type.call(this);
	this.value = s;
}
function String(s/*STRING*/){
	Type.call(this);
	this.value = s;
}
exports.Type = Type;
exports.Int = Int;
exports.Real = Real;
exports.Set = Set;
exports.String = String;

})(imports["js/ConstValue.js"]);
imports["js/Chars.js"] = {};
(function module$Chars(exports){
var doubleQuote = "\"";
var backspace = "\b";
var tab = "\t";
var ln = "\n";
var feed = "\f";
var cr = "\r";
var backslash = "\\";
exports.doubleQuote = doubleQuote;
exports.backspace = backspace;
exports.tab = tab;
exports.ln = ln;
exports.feed = feed;
exports.cr = cr;
exports.backslash = backslash;

})(imports["js/Chars.js"]);
imports["js/OberonRtl.js"] = {};
(function module$OberonRtl(exports){
var $scope = "OberonRtl";
function Type(){
	this.copy = null;
	this.clone = null;
	this.strCmp = null;
	this.assignArrayFromString = null;
	this.makeSet = null;
	this.setInclL = null;
	this.setInclR = null;
	this.assertId = null;
	this.makeRef = null;
}
Type.prototype.$scope = $scope;
exports.Type = Type;

})(imports["js/OberonRtl.js"]);
imports["js/Object.js"] = {};
(function module$Object(exports){
var $scope = "Object";
function Type(){
}
Type.prototype.$scope = $scope;
exports.Type = Type;

})(imports["js/Object.js"]);
imports["js/ScopeBase.js"] = {};
(function module$ScopeBase(exports){
var Object$ = require("js/Object.js");
var $scope = "ScopeBase";
function Type(){
}
Type.prototype.$scope = $scope;
exports.Type = Type;

})(imports["js/ScopeBase.js"]);
imports["js/Context.js"] = {};
(function module$Context(exports){
var OberonRtl = require("js/OberonRtl.js");
var ScopeBase = require("js/ScopeBase.js");
var $scope = "Context";
function Type(){
}
Type.prototype.$scope = $scope;
IdentdefInfo.prototype.$scope = $scope;
IdentdefInfo.prototype.id = function(){
	return this.mId;
};
IdentdefInfo.prototype.exported = function(){
	return this.mExported;
};
function IdentdefInfo(id/*STRING*/, exported/*BOOLEAN*/){
	this.mId = id;
	this.mExported = exported;
}
exports.Type = Type;
exports.IdentdefInfo = IdentdefInfo;

})(imports["js/Context.js"]);
imports["js/Errors.js"] = {};
(function module$Errors(exports){
var JS = GLOBAL;
var $scope = "Errors";
function Error(){
}
Error.prototype.$scope = $scope;

function raise(msg/*STRING*/){
	throw new Error(msg);
}
Error = function(msg){this.__msg = msg;};
Error.prototype.toString = function(){return this.__msg;};;
exports.Error = Error;
exports.raise = raise;

})(imports["js/Errors.js"]);
imports["js/Types.js"] = {};
(function module$Types(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var ConstValue = require("js/ConstValue.js");
var Context = require("js/Context.js");
var Errors = require("js/Errors.js");
var OberonRtl = require("js/OberonRtl.js");
var Object$ = require("js/Object.js");
var Str = require("js/String.js");
var $scope = "Types";
function Id(){
	Object$.Type.call(this);
}
RTL$.extend(Id, Object$.Type, $scope);
function Type(){
	Object$.Type.call(this);
}
RTL$.extend(Type, Object$.Type, $scope);
RTL$.extend(Const, Id, $scope);
function Variable(){
	Id.call(this);
}
RTL$.extend(Variable, Id, $scope);
function DeclaredVariable(){
	Variable.call(this);
}
RTL$.extend(DeclaredVariable, Variable, $scope);
RTL$.extend(ProcedureId, Id, $scope);
RTL$.extend(String, Type, $scope);
FieldCode.prototype.$scope = $scope;
function Field(){
}
Field.prototype.$scope = $scope;
function StorageType(){
	Type.call(this);
}
RTL$.extend(StorageType, Type, $scope);
RTL$.extend(NamedType, StorageType, $scope);
function Record(){
	NamedType.apply(this, arguments);
}
RTL$.extend(Record, NamedType, $scope);
RTL$.extend(Array, NamedType, $scope);
function OpenArray(){
	Array.apply(this, arguments);
}
RTL$.extend(OpenArray, Array, $scope);
RTL$.extend(StaticArray, Array, $scope);
ProcedureArgument.prototype.$scope = $scope;
function Procedure(){
	NamedType.apply(this, arguments);
}
RTL$.extend(Procedure, NamedType, $scope);
RTL$.extend(BasicType, NamedType, $scope);
function Nil(){
	Type.call(this);
}
RTL$.extend(Nil, Type, $scope);
RTL$.extend(Module, Id, $scope);
function anonymous$1(){
	this.bool = null;
	this.ch = null;
	this.integer = null;
	this.uint8 = null;
	this.real = null;
	this.set = null;
}
anonymous$1.prototype.$scope = $scope;
var basic = new anonymous$1();
var numeric = [];
var nil = null;

function typeName(type/*NamedType*/){
	return type.name;
}
ProcedureId.prototype.idType = function(){
	return "procedure";
};
String.prototype.description = function(){
	var prefix = '';
	if (this.s.length == 1){
		prefix = "single-";
	}
	else {
		prefix = "multi-";
	}
	return prefix + "character string";
};

function stringValue(s/*String*/){
	return s.s;
}

function stringLen(s/*String*/){
	return s.s.length;
}

function stringAsChar(s/*String*/, c/*VAR CHAR*/){
	var result = false;
	result = stringLen(s) == 1;
	if (result){
		c.set(s.s.charCodeAt(0));
	}
	return result;
}
Const.prototype.idType = function(){
	return "constant";
};
Variable.prototype.idType = function(){
	return "variable";
};
BasicType.prototype.description = function(){
	return this.name;
};
BasicType.prototype.initializer = function(cx/*Type*/){
	return this.mInitializer;
};
BasicType.prototype.isScalar = function(){
	return true;
};
Nil.prototype.description = function(){
	return "NIL";
};

function isInt(t/*PType*/){
	return t == basic.integer || t == basic.uint8;
}

function intsDescription(){
	return "'INTEGER' or 'BYTE'";
}

function isString(t/*PType*/){
	return t instanceof Array && t.elementsType == basic.ch || t instanceof String;
}
function BasicType(name/*STRING*/, initializer/*STRING*/){
	NamedType.call(this, name);
	this.mInitializer = initializer;
}

function foldArrayDimensions(a/*VAR Array*/, dimToStr/*ArrayDimensionDescriptionCallback*/, sizes/*VAR STRING*/, of/*VAR STRING*/){
	var elementsType = a.elementsType;
	if (!(a instanceof OpenArray) && elementsType instanceof Array){
		foldArrayDimensions(elementsType, dimToStr, sizes, of);
		sizes.set(dimToStr(a) + ", " + sizes.get());
	}
	else {
		sizes.set(dimToStr(a));
		of.set(a.elementsType.description());
	}
}

function arrayDimensionDescription(a/*VAR Array*/){
	var result = '';
	if (a instanceof StaticArray){
		result = Str.fromInt(a.length());
	}
	return result;
}

function arrayDescription(a/*VAR Array*/, dimToStr/*ArrayDimensionDescriptionCallback*/){
	var result = '';
	var sizes = '';var of = '';
	if (a.elementsType == null){
		result = a.name;
	}
	else {
		foldArrayDimensions(a, dimToStr, {set: function($v){sizes = $v;}, get: function(){return sizes;}}, {set: function($v){of = $v;}, get: function(){return of;}});
		if (sizes.length != 0){
			sizes = " " + sizes;
		}
		result = "ARRAY" + sizes + " OF " + of;
	}
	return result;
}
Array.prototype.description = function(){
	return arrayDescription(this, arrayDimensionDescription);
};
Array.prototype.isScalar = function(){
	return false;
};

function raiseUnexpectedSelector(id/*STRING*/, obj/*STRING*/){
	Errors.raise("selector '." + id + "' cannot be applied to '" + obj + "'");
}
StorageType.prototype.denote = function(id/*STRING*/, isReadOnly/*BOOLEAN*/){
	raiseUnexpectedSelector(id, this.description());
	return null;
};
OpenArray.prototype.initializer = function(cx/*Type*/){
	return "";
};
StaticArray.prototype.initializer = function(cx/*Type*/){
	return this.mInitializer;
};
StaticArray.prototype.length = function(){
	return this.len;
};
Procedure.prototype.initializer = function(cx/*Type*/){
	return "null";
};
Procedure.prototype.description = function(){
	return this.name;
};
Procedure.prototype.isScalar = function(){
	return true;
};
ProcedureArgument.prototype.description = function(){
	var result = '';
	if (this.isVar){
		result = "VAR ";
	}
	return result + this.type.description();
};
function ProcedureArgument(type/*PStorageType*/, isVar/*BOOLEAN*/){
	this.type = type;
	this.isVar = isVar;
}
Module.prototype.idType = function(){
	return "MODULE";
};
function String(s/*STRING*/){
	Type.call(this);
	this.s = s;
}
function NamedType(name/*STRING*/){
	StorageType.call(this);
	this.name = name;
}
function Array(elementsType/*PStorageType*/){
	NamedType.call(this, "");
	this.elementsType = elementsType;
}
function StaticArray(initializer/*STRING*/, elementsType/*PStorageType*/, len/*INTEGER*/){
	Array.call(this, elementsType);
	this.mInitializer = initializer;
	this.len = len;
}
function Const(type/*PType*/, value/*PType*/){
	Id.call(this);
	this.type = type;
	this.value = value;
}
function ProcedureId(type/*PProcedure*/){
	Id.call(this);
	this.type = type;
}
function Module(name/*STRING*/){
	Id.call(this);
	this.name = name;
}
function FieldCode(code/*STRING*/, derefCode/*STRING*/, propCode/*STRING*/){
	this.code = code;
	this.derefCode = derefCode;
	this.propCode = propCode;
}
basic.bool = new BasicType("BOOLEAN", "false");
basic.ch = new BasicType("CHAR", "0");
basic.integer = new BasicType("INTEGER", "0");
basic.uint8 = new BasicType("BYTE", "0");
basic.real = new BasicType("REAL", "0");
basic.set = new BasicType("SET", "0");
numeric.push(basic.integer);
numeric.push(basic.uint8);
numeric.push(basic.real);
nil = new Nil();
exports.Id = Id;
exports.Type = Type;
exports.Const = Const;
exports.Variable = Variable;
exports.DeclaredVariable = DeclaredVariable;
exports.ProcedureId = ProcedureId;
exports.String = String;
exports.FieldCode = FieldCode;
exports.Field = Field;
exports.StorageType = StorageType;
exports.NamedType = NamedType;
exports.Record = Record;
exports.Array = Array;
exports.OpenArray = OpenArray;
exports.StaticArray = StaticArray;
exports.ProcedureArgument = ProcedureArgument;
exports.Procedure = Procedure;
exports.BasicType = BasicType;
exports.Module = Module;
exports.basic = function(){return basic;};
exports.numeric = function(){return numeric;};
exports.nil = function(){return nil;};
exports.typeName = typeName;
exports.stringValue = stringValue;
exports.stringLen = stringLen;
exports.stringAsChar = stringAsChar;
exports.isInt = isInt;
exports.intsDescription = intsDescription;
exports.isString = isString;
exports.arrayDimensionDescription = arrayDimensionDescription;
exports.arrayDescription = arrayDescription;
exports.raiseUnexpectedSelector = raiseUnexpectedSelector;

})(imports["js/Types.js"]);
imports["js/Designator.js"] = {};
(function module$Designator(exports){
var Types = require("js/Types.js");
var $scope = "Designator";
Type.prototype.$scope = $scope;
Type.prototype.code = function(){
	return this.mCode;
};
Type.prototype.type = function(){
	return this.mType;
};
Type.prototype.info = function(){
	return this.mInfo;
};
function Type(code/*STRING*/, type/*PType*/, info/*PId*/){
	this.mCode = code;
	this.mType = type;
	this.mInfo = info;
}
exports.Type = Type;

})(imports["js/Designator.js"]);
imports["js/CodePrecedence.js"] = {};
(function module$CodePrecedence(exports){
var none = 0;
var unary = 4;
var mulDivMod = 5;
var addSub = 6;
var shift = 7;
var relational = 8;
var equal = 9;
var bitAnd = 10;
var bitXor = 11;
var bitOr = 12;
var and = 13;
var or = 14;
var conditional = 15;
var assignment = 17;
exports.none = none;
exports.unary = unary;
exports.mulDivMod = mulDivMod;
exports.addSub = addSub;
exports.shift = shift;
exports.relational = relational;
exports.equal = equal;
exports.bitAnd = bitAnd;
exports.bitXor = bitXor;
exports.bitOr = bitOr;
exports.and = and;
exports.or = or;
exports.conditional = conditional;
exports.assignment = assignment;

})(imports["js/CodePrecedence.js"]);
imports["js/Expression.js"] = {};
(function module$Expression(exports){
var ConstValue = require("js/ConstValue.js");
var Precedence = require("js/CodePrecedence.js");
var Types = require("js/Types.js");
var $scope = "Expression";
Type.prototype.$scope = $scope;
Type.prototype.code = function(){
	return this.mCode;
};
Type.prototype.type = function(){
	return this.mType;
};
Type.prototype.info = function(){
	return this.mInfo;
};
Type.prototype.constValue = function(){
	return this.mConstValue;
};
Type.prototype.maxPrecedence = function(){
	return this.mMaxPrecedence;
};
Type.prototype.isTerm = function(){
	return this.mInfo == null && this.mMaxPrecedence == Precedence.none;
};
function Type(code/*STRING*/, type/*PType*/, info/*PId*/, constValue/*PType*/, maxPrecedence/*INTEGER*/){
	this.mCode = code;
	this.mType = type;
	this.mInfo = info;
	this.mConstValue = constValue;
	this.mMaxPrecedence = maxPrecedence;
}

function make(code/*STRING*/, type/*PType*/, info/*PId*/, constValue/*PType*/){
	return new Type(code, type, info, constValue, Precedence.none);
}

function makeSimple(code/*STRING*/, type/*PType*/){
	return make(code, type, null, null);
}

function derefCode(code/*STRING*/){
	return code + ".get()";
}

function deref(e/*PType*/){
	var result = e;
	var info = e.mInfo;
	var type = e.mType;
	if (info != null && !(type instanceof Types.Array || type instanceof Types.Record)){
		if (info instanceof Types.Variable && info.isReference()){
			result = makeSimple(derefCode(e.code()), type);
		}
	}
	return result;
}

function isTemporary(e/*Type*/){
	return e.mInfo == null;
}
exports.Type = Type;
exports.make = make;
exports.makeSimple = makeSimple;
exports.derefCode = derefCode;
exports.deref = deref;
exports.isTemporary = isTemporary;

})(imports["js/Expression.js"]);
imports["js/TypeId.js"] = {};
(function module$TypeId(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Types = require("js/Types.js");
var Object$ = require("js/Object.js");
var $scope = "TypeId";
RTL$.extend(Type, Types.Id, $scope);
RTL$.extend(Forward, Type, $scope);
RTL$.extend(Lazy, Type, $scope);
Type.prototype.description = function(){
	return "type " + this.type().description();
};
Type.prototype.type = function(){
	return this.mType;
};
Type.prototype.reset = function(type/*PStorageType*/){
	this.mType = type;
};
function Forward(resolve/*ResolveTypeCallback*/, closure/*PType*/){
	Type.call(this, null);
	this.resolve = resolve;
	this.closure = closure;
}
Forward.prototype.type = function(){
	if (this.mType == null){
		this.mType = this.resolve(this.closure);
	}
	return this.mType;
};

function define(tId/*VAR Lazy*/, t/*PStorageType*/){
	tId.mType = t;
}
Type.prototype.idType = function(){
	return "type";
};
function Type(type/*PStorageType*/){
	Types.Id.call(this);
	this.mType = type;
}
function Lazy(){
	Type.call(this, null);
}
exports.Type = Type;
exports.Forward = Forward;
exports.Lazy = Lazy;
exports.define = define;

})(imports["js/TypeId.js"]);
imports["js/Symbols.js"] = {};
(function module$Symbols(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Object$ = require("js/Object.js");
var ScopeBase = require("js/ScopeBase.js");
var Types = require("js/Types.js");
var TypeId = require("js/TypeId.js");
var $scope = "Symbols";
RTL$.extend(Symbol, Object$.Type, $scope);
FoundSymbol.prototype.$scope = $scope;
Symbol.prototype.id = function(){
	return this.mId;
};
Symbol.prototype.info = function(){
	return this.mInfo;
};
Symbol.prototype.isModule = function(){
	return this.mInfo instanceof Types.Module;
};
Symbol.prototype.isVariable = function(){
	return this.mInfo instanceof Types.Variable;
};
Symbol.prototype.isConst = function(){
	return this.mInfo instanceof Types.Const;
};
Symbol.prototype.isType = function(){
	return this.mInfo instanceof TypeId.Type;
};
Symbol.prototype.isProcedure = function(){
	return this.mInfo instanceof Types.ProcedureId;
};
FoundSymbol.prototype.scope = function(){
	return this.mScope;
};
FoundSymbol.prototype.symbol = function(){
	return this.mSymbol;
};
function Symbol(id/*STRING*/, info/*PId*/){
	Object$.Type.call(this);
	this.mId = id;
	this.mInfo = info;
}
function FoundSymbol(s/*PSymbol*/, scope/*PType*/){
	this.mSymbol = s;
	this.mScope = scope;
}
exports.Symbol = Symbol;
exports.FoundSymbol = FoundSymbol;

})(imports["js/Symbols.js"]);
imports["js/Record.js"] = {};
(function module$Record(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var Context = require("js/Context.js");
var Errors = require("js/Errors.js");
var Object$ = require("js/Object.js");
var ScopeBase = require("js/ScopeBase.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var $scope = "Record";
RTL$.extend(Type, Types.Record, $scope);
RTL$.extend(Field, Types.Field, $scope);
RTL$.extend(Pointer, Types.NamedType, $scope);
RTL$.extend(FieldVariable, Types.Variable, $scope);
var pGenerateTypeInfo = null;

function finalizeRecord(closure/*PType*/){
	RTL$.typeGuard(closure, Type).finalize();
}
Type.prototype.codeForNew = function(cx/*Type*/){
	return this.initializer(cx);
};
Type.prototype.finalize = function(){
	var $seq1 = this.notExported;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var f = $seq1[$key2];
		delete this.fields[f];
	}
	this.notExported.splice(0, Number.MAX_VALUE);
};
Type.prototype.isScalar = function(){
	return false;
};
function Type(name/*STRING*/, cons/*STRING*/, scope/*PType*/){
	Types.Record.call(this, name);
	this.fields = {};
	this.base = null;
	this.cons = cons;
	this.scope = scope;
	this.notExported = [];
	this.finalizedAsNonExported = false;
	scope.addFinalizer(finalizeRecord, this);
}
Type.prototype.description = function(){
	var result = '';
	if (this.name.length != 0){
		result = this.name;
	}
	else {
		result = "anonymous RECORD";
	}
	return result;
};

function constructor(cx/*Type*/, r/*Type*/){
	return cx.qualifyScope(r.scope) + r.cons;
}

function initializer(cx/*Type*/, r/*Type*/, args/*STRING*/){
	return "new " + constructor(cx, r) + "(" + args + ")";
}
Type.prototype.initializer = function(cx/*Type*/){
	return initializer(cx, this, "");
};
Type.prototype.addField = function(f/*PField*/){
	if (Object.prototype.hasOwnProperty.call(this.fields, f.id())){
		Errors.raise("duplicated field: '" + f.id() + "'");
	}
	if (this.base != null && this.base.findSymbol(f.id()) != null){
		Errors.raise("base record already has field: '" + f.id() + "'");
	}
	this.fields[f.id()] = f;
	if (!f.exported()){
		this.notExported.push(f.id());
	}
};
Type.prototype.findSymbol = function(id/*STRING*/){
	var result = null;
	if (Object.prototype.hasOwnProperty.call(this.fields, id)){
		result = RTL$.getMappedValue(this.fields, id);
	}
	else if (this.base != null){
		result = this.base.findSymbol(id);
	}
	return result;
};

function existingField(r/*Type*/, id/*STRING*/, d/*NamedType*/){
	var result = r.findSymbol(id);
	if (result == null){
		Errors.raise("type '" + d.description() + "' has no '" + id + "' field");
	}
	return result;
}
Type.prototype.denote = function(id/*STRING*/, isReadObly/*BOOLEAN*/){
	return existingField(this, id, this);
};
Type.prototype.setBase = function(type/*PType*/){
	this.base = type;
};

function mangleJSProperty(id/*STRING*/){
	var result = id;
	if (id == "constructor" || id == "prototype"){
		result = result + "$";
	}
	return result;
}

function mangleField(id/*STRING*/){
	return mangleJSProperty(id);
}

function dumpFields(type/*PType*/){
	var result = '';
	if (type.base != null){
		result = dumpFields(type.base);
	}
	var $seq1 = type.fields;
	for(var k in $seq1){
		var v = $seq1[k];
		if (result.length != 0){
			result = result + ", ";
		}
		result = result + mangleField(k) + ": " + pGenerateTypeInfo(v.type());
	}
	return result;
}

function generateTypeInfo(type/*PType*/){
	var result = '';
	if (type instanceof Type){
		result = "{record: {" + dumpFields(type) + "}}";
	}
	else if (type instanceof Types.Array){
		result = "{array: " + generateTypeInfo(type.elementsType) + "}";
	}
	else {
		result = "null";
	}
	return result;
}

function stripTypeId(id/*VAR Type*/){
	var r = id.type();
	if (r instanceof Type){
		r.finalizedAsNonExported = true;
	}
	else {
		id.reset(null);
	}
}
Field.prototype.id = function(){
	return this.mIdentdef.id();
};
Field.prototype.exported = function(){
	return this.mIdentdef.exported();
};
Field.prototype.identdef = function(){
	return this.mIdentdef;
};
Field.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	var codeId = mangleField(this.mIdentdef.id());
	return new Types.FieldCode(leadCode + "." + codeId, leadCode, Chars.doubleQuote + codeId + Chars.doubleQuote);
};
Field.prototype.type = function(){
	return this.mType;
};
Field.prototype.asVar = function(leadCode/*STRING*/, isReadOnly/*BOOLEAN*/, cx/*Type*/){
	return new FieldVariable(this, leadCode, isReadOnly);
};
function Field(identdef/*PIdentdefInfo*/, type/*PStorageType*/){
	Types.Field.call(this);
	this.mIdentdef = identdef;
	this.mType = type;
}

function pointerBase(p/*Pointer*/){
	return RTL$.typeGuard(p.base.type(), Type);
}
function Pointer(name/*STRING*/, base/*PType*/){
	Types.NamedType.call(this, name);
	this.base = base;
}
Pointer.prototype.description = function(){
	var result = '';
	if (this.name.length != 0){
		result = this.name;
	}
	else {
		result = "POINTER TO " + pointerBase(this).description();
	}
	return result;
};
Pointer.prototype.initializer = function(cx/*Type*/){
	return "null";
};
Pointer.prototype.denote = function(id/*STRING*/, isReadObly/*BOOLEAN*/){
	var d = null;
	var base = pointerBase(this);
	if (this.name.length == 0 || base.name.length != 0){
		d = base;
	}
	else {
		d = this;
	}
	return existingField(base, id, d);
};
Pointer.prototype.isScalar = function(){
	return true;
};
function FieldVariable(f/*PField*/, leadCode/*STRING*/, isReadOnly/*BOOLEAN*/){
	Types.Variable.call(this);
	this.field = f;
	this.leadCode = leadCode;
	this.readOnly = isReadOnly;
}
FieldVariable.prototype.idType = function(){
	var result = '';
	result = "record's field";
	if (this.readOnly){
		result = "read-only " + result;
	}
	return result;
};
FieldVariable.prototype.type = function(){
	return this.field.mType;
};
FieldVariable.prototype.isReference = function(){
	return false;
};
FieldVariable.prototype.isReadOnly = function(){
	return this.readOnly;
};
pGenerateTypeInfo = generateTypeInfo;
exports.Type = Type;
exports.Field = Field;
exports.Pointer = Pointer;
exports.FieldVariable = FieldVariable;
exports.constructor$ = constructor;
exports.initializer = initializer;
exports.mangleJSProperty = mangleJSProperty;
exports.mangleField = mangleField;
exports.dumpFields = dumpFields;
exports.generateTypeInfo = generateTypeInfo;
exports.stripTypeId = stripTypeId;
exports.pointerBase = pointerBase;

})(imports["js/Record.js"]);
imports["js/Code.js"] = {};
(function module$Code(exports){
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

})(imports["js/Code.js"]);
imports["js/Variable.js"] = {};
(function module$Variable(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var ScopeBase = require("js/ScopeBase.js");
var Types = require("js/Types.js");
var $scope = "Variable";
RTL$.extend(TypedVariable, Types.Variable, $scope);
RTL$.extend(Declared, Types.DeclaredVariable, $scope);
RTL$.extend(ArgumentVariable, Declared, $scope);
RTL$.extend(PropertyVariable, TypedVariable, $scope);
RTL$.extend(DerefVariable, TypedVariable, $scope);
RTL$.extend(ExportedVariable, TypedVariable, $scope);
TypedVariable.prototype.type = function(){
	return this.mType;
};
function Declared(id/*STRING*/, type/*PStorageType*/, scope/*PType*/){
	Types.DeclaredVariable.call(this);
	this.mType = type;
	this.mId = id;
	this.scope = scope;
}
Declared.prototype.isReference = function(){
	return false;
};
Declared.prototype.isReadOnly = function(){
	return false;
};
Declared.prototype.type = function(){
	return this.mType;
};
Declared.prototype.id = function(){
	return this.mId;
};
PropertyVariable.prototype.idType = function(){
	var result = '';
	result = "array's element";
	if (this.readOnly){
		result = "read-only " + result;
	}
	return result;
};
PropertyVariable.prototype.isReference = function(){
	return false;
};
PropertyVariable.prototype.isReadOnly = function(){
	return this.readOnly;
};
DerefVariable.prototype.isReference = function(){
	return true;
};
DerefVariable.prototype.isReadOnly = function(){
	return false;
};
function ExportedVariable(id/*STRING*/, type/*PStorageType*/){
	TypedVariable.call(this, type);
	this.id = id;
}
ExportedVariable.prototype.idType = function(){
	return "imported variable";
};
ExportedVariable.prototype.isReference = function(){
	return false;
};
ExportedVariable.prototype.isReadOnly = function(){
	return true;
};
function TypedVariable(type/*PStorageType*/){
	Types.Variable.call(this);
	this.mType = type;
}
function PropertyVariable(type/*PStorageType*/, leadCode/*STRING*/, propCode/*STRING*/, isReadOnly/*BOOLEAN*/){
	TypedVariable.call(this, type);
	this.leadCode = leadCode;
	this.propCode = propCode;
	this.readOnly = isReadOnly;
}
function DerefVariable(type/*PStorageType*/, code/*STRING*/){
	TypedVariable.call(this, type);
	this.code = code;
}
function ArgumentVariable(id/*STRING*/, type/*PStorageType*/, var$/*BOOLEAN*/){
	Declared.call(this, id, type, null);
	this.var = var$;
}
ArgumentVariable.prototype.idType = function(){
	var result = '';
	result = "formal parameter";
	if (!this.var){
		result = "non-VAR " + result;
	}
	return result;
};
ArgumentVariable.prototype.isReference = function(){
	return this.var;
};
ArgumentVariable.prototype.isReadOnly = function(){
	var r = false;
	if (!this.var){
		var t = this.type();
		r = t instanceof Types.Array || t instanceof Types.Record;
	}
	return r;
};
exports.TypedVariable = TypedVariable;
exports.Declared = Declared;
exports.ArgumentVariable = ArgumentVariable;
exports.PropertyVariable = PropertyVariable;
exports.DerefVariable = DerefVariable;
exports.ExportedVariable = ExportedVariable;

})(imports["js/Variable.js"]);
imports["js/LanguageContext.js"] = {};
(function module$LanguageContext(exports){
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var Context = require("js/Context.js");
var Designator = require("js/Designator.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var OberonRtl = require("js/OberonRtl.js");
var Record = require("js/Record.js");
var Symbols = require("js/Symbols.js");
var T = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "LanguageContext";
function CastOp(){
}
CastOp.prototype.$scope = $scope;
function Types(){
}
Types.prototype.$scope = $scope;
function ModuleGenerator(){
}
ModuleGenerator.prototype.$scope = $scope;
CodeTraits.prototype.$scope = $scope;
function Language(){
	this.moduleResolver = null;
	this.rtl = null;
	this.codeTraits = null;
	this.types = null;
	this.stdSymbols = {};
}
Language.prototype.$scope = $scope;
Type.prototype.$scope = $scope;
function Type(language/*PLanguage*/, cx/*PType*/){
	this.language = language;
	this.cx = cx;
}
function CodeTraits(code/*PIGenerator*/, rtl/*PType*/, checkIndexes/*BOOLEAN*/){
	this.code = code;
	this.rtl = rtl;
	this.checkIndexes = checkIndexes;
}
CodeTraits.prototype.generator = function(){
	return this.code;
};
CodeTraits.prototype.getAt = function(e/*STRING*/, index/*STRING*/, type/*PStorageType*/){
	var r = '';
	if (!this.checkIndexes){
		if (type == T.basic().ch){
			r = e + ".charCodeAt(" + index + ")";
		}
		else {
			r = e + "[" + index + "]";
		}
	}
	else {
		if (type == T.basic().ch){
			r = this.rtl.charAt(e, index);
		}
		else {
			r = this.rtl.getAt(e, index);
		}
	}
	return r;
};
CodeTraits.prototype.putAt = function(where/*STRING*/, index/*STRING*/, what/*STRING*/){
	var r = '';
	if (!this.checkIndexes){
		r = where + "[" + index + "] = " + what;
	}
	else {
		r = this.rtl.putAt(where, index, what);
	}
	return r;
};
CodeTraits.prototype.referenceCode = function(info/*VAR Id*/){
	var result = '';
	if (info instanceof T.DeclaredVariable){
		result = CodeGenerator.mangleId(info.id());
		if (info.type().isScalar() && !(info instanceof Variable.ArgumentVariable && info.var)){
			result = "{set: function($v){" + result + " = $v;}, get: function(){return " + result + ";}}";
		}
	}
	else if (info instanceof Variable.PropertyVariable){
		if (info.type().isScalar()){
			result = this.rtl.makeRef(info.leadCode, info.propCode);
		}
		else {
			result = this.getAt(info.leadCode, info.propCode, info.type());
		}
	}
	else if (info instanceof Variable.DerefVariable){
		result = info.code;
	}
	else if (info instanceof Record.FieldVariable){
		var codeId = Record.mangleField(info.field.id());
		if (info.type().isScalar()){
			result = this.rtl.makeRef(info.leadCode, Chars.doubleQuote + codeId + Chars.doubleQuote);
		}
		else {
			result = info.leadCode + "." + codeId;
		}
	}
	else {
		Errors.raise("cannot reference " + info.idType());
	}
	return result;
};
CodeTraits.prototype.assign = function(info/*VAR Id*/, right/*PType*/){
	var result = '';
	var rightCode = Expression.deref(right).code();
	if (info instanceof T.DeclaredVariable){
		var idCode = CodeGenerator.mangleId(info.id());
		if (info instanceof Variable.ArgumentVariable && info.var){
			result = idCode + ".set(" + rightCode + ")";
		}
		else {
			result = idCode + " = " + rightCode;
		}
	}
	else if (info instanceof Variable.PropertyVariable){
		result = this.putAt(info.leadCode, info.propCode, rightCode);
	}
	else if (info instanceof Record.FieldVariable){
		result = info.leadCode + "." + Record.mangleField(info.field.id()) + " = " + rightCode;
	}
	return result;
};
exports.CastOp = CastOp;
exports.Types = Types;
exports.ModuleGenerator = ModuleGenerator;
exports.CodeTraits = CodeTraits;
exports.Language = Language;
exports.Type = Type;

})(imports["js/LanguageContext.js"]);
imports["js/Cast.js"] = {};
(function module$Cast(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Designator = require("js/Designator.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var OberonRtl = require("js/OberonRtl.js");
var Record = require("js/Record.js");
var String = require("js/String.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var $scope = "Cast";
var errNo = 0;
var err = 1;
var errVarParameter = 2;
function CastOpDoNothing(){
	LanguageContext.CastOp.call(this);
}
RTL$.extend(CastOpDoNothing, LanguageContext.CastOp, $scope);
function CastOpArray(){
	CastOpDoNothing.call(this);
}
RTL$.extend(CastOpArray, CastOpDoNothing, $scope);
function CastOpRecord(){
	CastOpDoNothing.call(this);
}
RTL$.extend(CastOpRecord, CastOpDoNothing, $scope);
function CastOpStrToChar(){
	CastOpDoNothing.call(this);
}
RTL$.extend(CastOpStrToChar, CastOpDoNothing, $scope);
function Operations(){
	this.castToRecord = null;
	this.castToUint8 = null;
}
Operations.prototype.$scope = $scope;
var areTypesExactlyMatch = null;
var doNothing = null;
var castOpStrToChar = null;
var castOpArray = null;

function findBaseType(base/*PType*/, type/*PType*/){
	var result = type;
	while (true){
		if (result != null && result != base){
			result = result.base;
		} else break;
	}
	return result;
}

function findPointerBaseType(base/*PPointer*/, type/*Pointer*/){
	var result = null;
	if (findBaseType(Record.pointerBase(base), Record.pointerBase(type)) != null){
		result = base;
	}
	return result;
}

function matchesToNIL(t/*VAR Type*/){
	return t instanceof Record.Pointer || t instanceof Types.Procedure;
}

function areTypesMatch(t1/*PType*/, t2/*PType*/){
	return areTypesExactlyMatch(t1, t2) || Types.isInt(t1) && Types.isInt(t2) || (t1 == Types.nil() && matchesToNIL(t2) || t2 == Types.nil() && matchesToNIL(t1));
}

function areArgsMatch(a1/*PProcedureArgument*/, a2/*PProcedureArgument*/, p1/*PProcedure*/, p2/*PProcedure*/){
	return a1.isVar == a2.isVar && (a1.type == p1 && a2.type == p2 || areTypesExactlyMatch(a1.type, a2.type));
}

function areProceduresMatch(p1/*PProcedure*/, p2/*PProcedure*/){
	var result = false;
	var args1 = p1.args();
	var args2 = p2.args();
	var argsLen = args1.length;
	if (args2.length == argsLen){
		var i = 0;
		while (true){
			if (i < argsLen && areArgsMatch(args1[i], args2[i], p1, p2)){
				++i;
			} else break;
		}
		if (i == argsLen){
			var r1 = p1.result();
			var r2 = p2.result();
			result = r1 == p1 && r2 == p2 || areTypesExactlyMatch(r1, r2);
		}
	}
	return result;
}

function areTypesExactlyMatchImpl(t1/*PType*/, t2/*PType*/){
	var result = false;
	if (t1 == t2){
		result = true;
	}
	else if (t1 instanceof Types.Array && t2 instanceof Types.OpenArray){
		result = areTypesMatch(t1.elementsType, t2.elementsType);
	}
	else if (t1 instanceof Types.StaticArray && t2 instanceof Types.StaticArray){
		result = t1.length() == t2.length() && areTypesMatch(t1.elementsType, t2.elementsType);
	}
	else if (t1 instanceof Record.Pointer && t2 instanceof Record.Pointer){
		result = areTypesMatch(Record.pointerBase(t1), Record.pointerBase(t2));
	}
	else if (t1 instanceof Types.Procedure && t2 instanceof Types.Procedure){
		result = areProceduresMatch(t1, t2);
	}
	return result;
}
CastOpDoNothing.prototype.make = function(cx/*PType*/, e/*PType*/){
	return e;
};

function passedByReference(info/*VAR Id*/){
	return info instanceof Types.Variable && info.isReference();
}

function assign(cx/*PType*/, info/*PVariable*/, right/*PType*/){
	return cx.language.codeTraits.assign(info, right);
}
CastOpDoNothing.prototype.assign = function(cx/*PType*/, info/*PVariable*/, right/*PType*/){
	return assign(cx, info, this.make(cx, right));
};
CastOpDoNothing.prototype.clone = function(cx/*PType*/, e/*PType*/){
	return Expression.deref(e).code();
};

function cloneArray(t/*PArray*/, code/*STRING*/, cx/*PType*/){
	var result = '';
	if (t.elementsType.isScalar()){
		result = code + ".slice()";
	}
	else {
		var l = cx.language;
		result = l.rtl.clone(code, l.types.typeInfo(t), "undefined");
	}
	return result;
}
CastOpArray.prototype.assign = function(cx/*PType*/, info/*PVariable*/, right/*PType*/){
	return assign(cx, info, Expression.makeSimple(cloneArray(RTL$.typeGuard(right.type(), Types.Array), right.code(), cx), right.type()));
};
CastOpArray.prototype.clone = function(cx/*PType*/, e/*PType*/){
	return cloneArray(RTL$.typeGuard(e.type(), Types.Array), e.code(), cx);
};
CastOpRecord.prototype.assign = function(cx/*PType*/, info/*PVariable*/, right/*PType*/){
	return cx.language.rtl.copy(right.code(), cx.language.codeTraits.referenceCode(info), Record.generateTypeInfo(info.type()));
};
CastOpStrToChar.prototype.make = function(cx/*PType*/, e/*PType*/){
	var s = RTL$.typeGuard(e.type(), Types.String);
	RTL$.assert(s.s.length == 1);
	var c = s.s.charCodeAt(0);
	var code = String.fromInt(c);
	return Expression.makeSimple(code, Types.basic().ch);
};

function implicit(from/*PType*/, to/*PType*/, toVar/*BOOLEAN*/, ops/*Operations*/, op/*VAR PCastOp*/){
	var ignore = false;
	var result = err;
	op.set(null);
	if (from == to){
		if (from instanceof Record.Type){
			op.set(ops.castToRecord);
		}
		else if (from instanceof Types.Array){
			op.set(castOpArray);
		}
		result = errNo;
	}
	else if (from == Types.basic().uint8 && to == Types.basic().integer){
		if (toVar){
			result = errVarParameter;
		}
		else {
			result = errNo;
		}
	}
	else if (from == Types.basic().integer && to == Types.basic().uint8){
		if (toVar){
			result = errVarParameter;
		}
		else {
			op.set(ops.castToUint8);
			result = errNo;
		}
	}
	else if (from instanceof Types.String){
		if (to == Types.basic().ch){
			if (from.s.length == 1){
				op.set(castOpStrToChar);
				result = errNo;
			}
		}
		else if (Types.isString(to)){
			result = errNo;
		}
	}
	else if (from instanceof Types.Array && to instanceof Types.OpenArray && areTypesExactlyMatch(from.elementsType, to.elementsType)){
		result = errNo;
	}
	else if (from instanceof Types.StaticArray && to instanceof Types.StaticArray && from.length() == to.length() && areTypesExactlyMatch(from.elementsType, to.elementsType)){
		op.set(castOpArray);
		result = errNo;
	}
	else if (from instanceof Record.Pointer && to instanceof Record.Pointer){
		if (!toVar){
			if (findPointerBaseType(to, from) != null){
				result = errNo;
			}
		}
		else if (areTypesExactlyMatchImpl(to, from)){
			result = errNo;
		}
		else {
			result = errVarParameter;
		}
	}
	else if (from instanceof Record.Type && to instanceof Record.Type){
		if (findBaseType(to, from) != null){
			op.set(ops.castToRecord);
			result = errNo;
		}
	}
	else if (from == Types.nil() && matchesToNIL(to)){
		result = errNo;
	}
	else if (from instanceof Types.Procedure && to instanceof Types.Procedure){
		if (areProceduresMatch(from, to)){
			result = errNo;
		}
	}
	if (result == errNo && op.get() == null){
		op.set(doNothing);
	}
	return result;
}
areTypesExactlyMatch = areTypesExactlyMatchImpl;
doNothing = new CastOpDoNothing();
castOpArray = new CastOpArray();
castOpStrToChar = new CastOpStrToChar();
exports.errNo = errNo;
exports.err = err;
exports.errVarParameter = errVarParameter;
exports.CastOpDoNothing = CastOpDoNothing;
exports.CastOpArray = CastOpArray;
exports.CastOpRecord = CastOpRecord;
exports.Operations = Operations;
exports.areTypesExactlyMatch = function(){return areTypesExactlyMatch;};
exports.doNothing = function(){return doNothing;};
exports.findPointerBaseType = findPointerBaseType;
exports.areTypesMatch = areTypesMatch;
exports.areProceduresMatch = areProceduresMatch;
exports.passedByReference = passedByReference;
exports.assign = assign;
exports.cloneArray = cloneArray;
exports.implicit = implicit;

})(imports["js/Cast.js"]);
imports["js/Operator.js"] = {};
(function module$Operator(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var Code = require("js/Code.js");
var ConstValue = require("js/ConstValue.js");
var Designator = require("js/Designator.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var OberonRtl = require("js/OberonRtl.js");
var Precedence = require("js/CodePrecedence.js");
var String = require("js/String.js");
var Types = require("js/Types.js");
var $scope = "Operator";
var equalCode = " == ";
var notEqualCode = " != ";
function CodeMaker(){
}
CodeMaker.prototype.$scope = $scope;
RTL$.extend(SimpleCodeMaker, CodeMaker, $scope);
function IntCodeMaker(){
	SimpleCodeMaker.apply(this, arguments);
}
RTL$.extend(IntCodeMaker, SimpleCodeMaker, $scope);
RTL$.extend(PredCodeMaker, CodeMaker, $scope);
function CastToUint8(){
	Cast.CastOpDoNothing.call(this);
}
RTL$.extend(CastToUint8, Cast.CastOpDoNothing, $scope);
var openArrayChar = null;
var castOperations = new Cast.Operations();

function binary(left/*PType*/, right/*PType*/, rtl/*PType*/, op/*BinaryOp*/, code/*PCodeMaker*/, precedence/*INTEGER*/, optResultType/*PType*/, optResultPrecedence/*INTEGER*/){
	var result = null;
	var leftValue = null;var rightValue = null;var resultValue = null;
	var leftCode = '';var rightCode = '';var resultCode = '';
	var resultType = null;
	var resultPrecedence = 0;
	var rightExpDeref = null;
	leftValue = left.constValue();
	rightValue = right.constValue();
	if (leftValue != null && rightValue != null){
		resultValue = op(leftValue, rightValue);
	}
	leftCode = Code.adjustPrecedence(Expression.deref(left), precedence);
	rightExpDeref = Expression.deref(right);
	if (precedence != Precedence.none){
		rightCode = Code.adjustPrecedence(rightExpDeref, precedence - 1 | 0);
	}
	else {
		rightCode = rightExpDeref.code();
	}
	resultCode = code.make(leftCode, rightCode, rtl);
	if (optResultType != null){
		resultType = optResultType;
	}
	else {
		resultType = left.type();
	}
	if (optResultPrecedence != Precedence.none){
		resultPrecedence = optResultPrecedence;
	}
	else {
		resultPrecedence = precedence;
	}
	return new Expression.Type(resultCode, resultType, null, resultValue, resultPrecedence);
}
SimpleCodeMaker.prototype.make = function(left/*STRING*/, right/*STRING*/, rtl/*PType*/){
	return left + this.code + right;
};
IntCodeMaker.prototype.make = function(left/*STRING*/, right/*STRING*/, rtl/*PType*/){
	return SimpleCodeMaker.prototype.make.call(this, left, right, rtl) + " | 0";
};
PredCodeMaker.prototype.make = function(left/*STRING*/, right/*STRING*/, rtl/*PType*/){
	return this.pred(left, right, rtl);
};
function SimpleCodeMaker(code/*STRING*/){
	CodeMaker.call(this);
	this.code = code;
}
function PredCodeMaker(pred/*CodePredicate*/){
	CodeMaker.call(this);
	this.pred = pred;
}

function binaryWithCodeEx(left/*PType*/, right/*PType*/, op/*BinaryOp*/, code/*STRING*/, precedence/*INTEGER*/, optResultType/*PType*/, optResultPrecedence/*INTEGER*/){
	return binary(left, right, null, op, new SimpleCodeMaker(code), precedence, optResultType, optResultPrecedence);
}

function binaryWithCode(left/*PType*/, right/*PType*/, op/*BinaryOp*/, code/*STRING*/, precedence/*INTEGER*/){
	return binaryWithCodeEx(left, right, op, code, precedence, null, Precedence.none);
}

function relational(left/*PType*/, right/*PType*/, op/*BinaryOp*/, code/*STRING*/){
	return binaryWithCodeEx(left, right, op, code, Precedence.relational, Types.basic().bool, Precedence.none);
}

function equal(left/*PType*/, right/*PType*/, op/*BinaryOp*/, code/*STRING*/){
	return binaryWithCodeEx(left, right, op, code, Precedence.equal, Types.basic().bool, Precedence.none);
}

function promoteToWideIfNeeded(e/*PType*/){
	var result = null;
	if (e.type() != Types.basic().uint8){
		result = e;
	}
	else {
		result = new Expression.Type(e.code(), Types.basic().integer, e.info(), e.constValue(), e.maxPrecedence());
	}
	return result;
}

function binaryInt(left/*PType*/, right/*PType*/, op/*BinaryOp*/, code/*STRING*/, precedence/*INTEGER*/){
	return promoteToWideIfNeeded(binary(left, right, null, op, new IntCodeMaker(code), precedence, null, Precedence.bitOr));
}

function binaryPred(left/*PType*/, right/*PType*/, rtl/*PType*/, op/*BinaryOp*/, pred/*CodePredicate*/){
	return binary(left, right, rtl, op, new PredCodeMaker(pred), Precedence.none, Types.basic().bool, Precedence.none);
}

function unary(e/*PType*/, op/*UnaryOp*/, code/*STRING*/){
	var value = null;
	value = e.constValue();
	if (value != null){
		value = op(value);
	}
	var resultCode = code + Code.adjustPrecedence(Expression.deref(e), Precedence.unary);
	return new Expression.Type(resultCode, e.type(), null, value, Precedence.unary);
}

function castToStr(e/*PType*/, cx/*PType*/){
	var resultExpression = null;
	var op = null;
	var ignored = 0;
	ignored = Cast.implicit(e.type(), openArrayChar, false, castOperations, {set: function($v){op = $v;}, get: function(){return op;}});
	if (op != null){
		resultExpression = op.make(cx, e);
	}
	else {
		resultExpression = e;
	}
	return resultExpression.code();
}

function opAddReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Real(RTL$.typeGuard(left, ConstValue.Real).value + RTL$.typeGuard(right, ConstValue.Real).value);
}

function opAddInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value + RTL$.typeGuard(right, ConstValue.Int).value | 0);
}

function opSubReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Real(RTL$.typeGuard(left, ConstValue.Real).value - RTL$.typeGuard(right, ConstValue.Real).value);
}

function opSubInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value - RTL$.typeGuard(right, ConstValue.Int).value | 0);
}

function opMulReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Real(RTL$.typeGuard(left, ConstValue.Real).value * RTL$.typeGuard(right, ConstValue.Real).value);
}

function opMulInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value * RTL$.typeGuard(right, ConstValue.Int).value | 0);
}

function opDivReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Real(RTL$.typeGuard(left, ConstValue.Real).value / RTL$.typeGuard(right, ConstValue.Real).value);
}

function opDivInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value / RTL$.typeGuard(right, ConstValue.Int).value | 0);
}

function opMod(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value % RTL$.typeGuard(right, ConstValue.Int).value);
}

function opSetUnion(left/*PType*/, right/*PType*/){
	return new ConstValue.Set(RTL$.typeGuard(left, ConstValue.Set).value | RTL$.typeGuard(right, ConstValue.Set).value);
}

function opSetDiff(left/*PType*/, right/*PType*/){
	return new ConstValue.Set(RTL$.typeGuard(left, ConstValue.Set).value & ~RTL$.typeGuard(right, ConstValue.Set).value);
}

function opSetIntersection(left/*PType*/, right/*PType*/){
	return new ConstValue.Set(RTL$.typeGuard(left, ConstValue.Set).value & RTL$.typeGuard(right, ConstValue.Set).value);
}

function opSetSymmetricDiff(left/*PType*/, right/*PType*/){
	return new ConstValue.Set(RTL$.typeGuard(left, ConstValue.Set).value ^ RTL$.typeGuard(right, ConstValue.Set).value);
}

function opSetInclL(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.setInclL(RTL$.typeGuard(left, ConstValue.Set).value, RTL$.typeGuard(right, ConstValue.Set).value) ? 1 : 0);
}

function opSetInclR(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.setInclR(RTL$.typeGuard(left, ConstValue.Set).value, RTL$.typeGuard(right, ConstValue.Set).value) ? 1 : 0);
}

function opOr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value != 0 || RTL$.typeGuard(right, ConstValue.Int).value != 0 ? 1 : 0);
}

function opAnd(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value != 0 && RTL$.typeGuard(right, ConstValue.Int).value != 0 ? 1 : 0);
}

function opEqualInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value == RTL$.typeGuard(right, ConstValue.Int).value ? 1 : 0);
}

function opEqualReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Real).value == RTL$.typeGuard(right, ConstValue.Real).value ? 1 : 0);
}

function opEqualSet(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Set).value == RTL$.typeGuard(right, ConstValue.Set).value ? 1 : 0);
}

function opNotEqualInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value != RTL$.typeGuard(right, ConstValue.Int).value ? 1 : 0);
}

function opNotEqualReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Real).value != RTL$.typeGuard(right, ConstValue.Real).value ? 1 : 0);
}

function opNotEqualSet(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Set).value != RTL$.typeGuard(right, ConstValue.Set).value ? 1 : 0);
}

function opLessInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value < RTL$.typeGuard(right, ConstValue.Int).value ? 1 : 0);
}

function opLessReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Real).value < RTL$.typeGuard(right, ConstValue.Real).value ? 1 : 0);
}

function opGreaterInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value > RTL$.typeGuard(right, ConstValue.Int).value ? 1 : 0);
}

function opGreaterReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Real).value > RTL$.typeGuard(right, ConstValue.Real).value ? 1 : 0);
}

function opEqLessInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value <= RTL$.typeGuard(right, ConstValue.Int).value ? 1 : 0);
}

function opEqLessReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Real).value <= RTL$.typeGuard(right, ConstValue.Real).value ? 1 : 0);
}

function opEqGreaterInt(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value >= RTL$.typeGuard(right, ConstValue.Int).value ? 1 : 0);
}

function opEqGreaterReal(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Real).value >= RTL$.typeGuard(right, ConstValue.Real).value ? 1 : 0);
}

function opNot(x/*PType*/){
	return new ConstValue.Int(!(RTL$.typeGuard(x, ConstValue.Int).value != 0) ? 1 : 0);
}

function opNegateInt(x/*PType*/){
	return new ConstValue.Int(-RTL$.typeGuard(x, ConstValue.Int).value | 0);
}

function opNegateReal(x/*PType*/){
	return new ConstValue.Real(-RTL$.typeGuard(x, ConstValue.Real).value);
}

function opUnaryPlus(x/*PType*/){
	return x;
}

function opSetComplement(x/*PType*/){
	return new ConstValue.Set(~RTL$.typeGuard(x, ConstValue.Set).value);
}

function opLsl(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value << RTL$.typeGuard(right, ConstValue.Int).value);
}

function opAsr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value >> RTL$.typeGuard(right, ConstValue.Int).value);
}

function opRor(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value >>> RTL$.typeGuard(right, ConstValue.Int).value);
}

function codeSetInclL(left/*STRING*/, right/*STRING*/, rtl/*PType*/){
	return rtl.setInclL(left, right);
}

function codeSetInclR(left/*STRING*/, right/*STRING*/, rtl/*PType*/){
	return rtl.setInclR(left, right);
}

function strCmp(op/*STRING*/, left/*PType*/, right/*PType*/, cx/*PType*/){
	return Expression.makeSimple(cx.language.rtl.strCmp(castToStr(left, cx), castToStr(right, cx)) + op + "0", Types.basic().bool);
}

function assign(info/*PId*/, right/*PType*/, cx/*PType*/){
	var rightCode = '';
	var isArray = false;
	var castOperation = null;
	var ignored = false;
	var result = '';
	
	function assignArrayFromString(a/*VAR Array*/, s/*String*/){
		if (!(a instanceof Types.StaticArray)){
			Errors.raise("string cannot be assigned to open " + a.description());
		}
		else if (Types.stringLen(s) > a.length()){
			Errors.raise(String.fromInt(a.length()) + "-character ARRAY is too small for " + String.fromInt(Types.stringLen(s)) + "-character string");
		}
		var l = cx.language;
		return l.rtl.assignArrayFromString(l.codeTraits.referenceCode(info), rightCode);
	}
	if (!(info instanceof Types.Variable) || info.isReadOnly()){
		Errors.raise("cannot assign to " + info.idType());
	}
	else {
		rightCode = right.code();
		var leftType = info.type();
		var rightType = right.type();
		isArray = leftType instanceof Types.Array;
		if (isArray && RTL$.typeGuard(leftType, Types.Array).elementsType == Types.basic().ch && rightType instanceof Types.String){
			result = assignArrayFromString(leftType, rightType);
		}
		else {
			if (cx.language.types.implicitCast(rightType, leftType, false, {set: function($v){castOperation = $v;}, get: function(){return castOperation;}}) != Cast.errNo){
				Errors.raise("type mismatch: '" + leftType.description() + "' cannot be assigned to '" + rightType.description() + "' expression");
			}
			if (leftType instanceof Types.OpenArray && rightType instanceof Types.Array){
				Errors.raise("open '" + leftType.description() + "' cannot be assigned");
			}
			result = castOperation.assign(cx, info, right);
		}
	}
	return result;
}

function inplace(left/*PType*/, right/*PType*/, cx/*PType*/, code/*STRING*/, altOp/*BinaryProc*/){
	var info = left.info();
	return info instanceof Types.Variable && info.isReference() ? assign(info, altOp(left, right), cx) : left.code() + code + Expression.deref(right).code();
}

function addReal(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opAddReal, " + ", Precedence.addSub);
}

function addInt(left/*PType*/, right/*PType*/){
	return binaryInt(left, right, opAddInt, " + ", Precedence.addSub);
}

function subReal(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opSubReal, " - ", Precedence.addSub);
}

function subInt(left/*PType*/, right/*PType*/){
	return binaryInt(left, right, opSubInt, " - ", Precedence.addSub);
}

function mulReal(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opMulReal, " * ", Precedence.mulDivMod);
}

function mulInt(left/*PType*/, right/*PType*/){
	return binaryInt(left, right, opMulInt, " * ", Precedence.mulDivMod);
}

function divReal(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opDivReal, " / ", Precedence.mulDivMod);
}

function divInt(left/*PType*/, right/*PType*/){
	return binaryInt(left, right, opDivInt, " / ", Precedence.mulDivMod);
}

function mod(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opMod, " % ", Precedence.mulDivMod);
}

function setUnion(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opSetUnion, " | ", Precedence.bitOr);
}

function setDiff(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opSetDiff, " & ~", Precedence.bitAnd);
}

function setIntersection(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opSetIntersection, " & ", Precedence.bitAnd);
}

function setSymmetricDiff(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opSetSymmetricDiff, " ^ ", Precedence.bitXor);
}

function setHasBit(left/*PType*/, right/*PType*/, cx/*PType*/){
	return new Expression.Type("1 << " + Code.adjustPrecedence(Expression.deref(left), Precedence.shift) + " & " + Code.adjustPrecedence(Expression.deref(right), Precedence.bitAnd), Types.basic().bool, null, null, Precedence.bitAnd);
}

function setInclL(left/*PType*/, right/*PType*/, cx/*PType*/){
	return binaryPred(left, right, cx.language.rtl, opSetInclL, codeSetInclL);
}

function setInclR(left/*PType*/, right/*PType*/, cx/*PType*/){
	return binaryPred(left, right, cx.language.rtl, opSetInclR, codeSetInclR);
}

function or(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opOr, " || ", Precedence.or);
}

function and(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opAnd, " && ", Precedence.and);
}

function equalInt(left/*PType*/, right/*PType*/, cx/*PType*/){
	return equal(left, right, opEqualInt, equalCode);
}

function equalReal(left/*PType*/, right/*PType*/, cx/*PType*/){
	return equal(left, right, opEqualReal, equalCode);
}

function equalSet(left/*PType*/, right/*PType*/, cx/*PType*/){
	return equal(left, right, opEqualSet, equalCode);
}

function equalStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return strCmp(equalCode, left, right, cx);
}

function notEqualInt(left/*PType*/, right/*PType*/, cx/*PType*/){
	return equal(left, right, opNotEqualInt, notEqualCode);
}

function notEqualReal(left/*PType*/, right/*PType*/, cx/*PType*/){
	return equal(left, right, opNotEqualReal, notEqualCode);
}

function notEqualSet(left/*PType*/, right/*PType*/, cx/*PType*/){
	return equal(left, right, opNotEqualSet, notEqualCode);
}

function notEqualStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return strCmp(notEqualCode, left, right, cx);
}

function is(left/*PType*/, right/*PType*/){
	return relational(left, right, null, " instanceof ");
}

function lessInt(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opLessInt, " < ");
}

function lessReal(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opLessReal, " < ");
}

function lessStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return strCmp(" < ", left, right, cx);
}

function greaterInt(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opGreaterInt, " > ");
}

function greaterReal(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opGreaterReal, " > ");
}

function greaterStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return strCmp(" > ", left, right, cx);
}

function eqLessInt(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opEqLessInt, " <= ");
}

function eqLessReal(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opEqLessReal, " <= ");
}

function eqLessStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return strCmp(" <= ", left, right, cx);
}

function eqGreaterInt(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opEqGreaterInt, " >= ");
}

function eqGreaterReal(left/*PType*/, right/*PType*/, cx/*PType*/){
	return relational(left, right, opEqGreaterReal, " >= ");
}

function eqGreaterStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return strCmp(" >= ", left, right, cx);
}

function not(x/*PType*/){
	return unary(x, opNot, "!");
}

function negateInt(x/*PType*/){
	var result = null;
	var overflowCheck = true;
	var c = x.constValue();
	if (c != null){
		var value = -RTL$.typeGuard(c, ConstValue.Int).value | 0;
		result = new Expression.Type(String.fromInt(value), Types.basic().integer, null, new ConstValue.Int(value), Precedence.unary);
	}
	else {
		result = promoteToWideIfNeeded(unary(x, opNegateInt, "-"));
		result = new Expression.Type(result.code() + " | 0", result.type(), result.info(), result.constValue(), Precedence.bitOr);
	}
	return result;
}

function negateReal(x/*PType*/){
	return promoteToWideIfNeeded(unary(x, opNegateReal, "-"));
}

function unaryPlus(x/*PType*/){
	return unary(x, opUnaryPlus, "");
}

function setComplement(x/*PType*/){
	return unary(x, opSetComplement, "~");
}

function lsl(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opLsl, " << ", Precedence.shift);
}

function asr(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opAsr, " >> ", Precedence.shift);
}

function ror(left/*PType*/, right/*PType*/){
	return binaryWithCode(left, right, opRor, " >>> ", Precedence.shift);
}

function mulInplace(left/*PType*/, right/*PType*/, cx/*PType*/){
	return inplace(left, right, cx, " *= ", mulReal);
}

function divInplace(left/*PType*/, right/*PType*/, cx/*PType*/){
	return inplace(left, right, cx, " /= ", divReal);
}

function pow2(e/*PType*/){
	var derefExp = null;
	derefExp = Expression.deref(e);
	return Expression.makeSimple("Math.pow(2, " + derefExp.code() + ")", Types.basic().real);
}

function log2(e/*PType*/){
	var derefExp = null;
	derefExp = Expression.deref(e);
	return new Expression.Type("(Math.log(" + derefExp.code() + ") / Math.LN2) | 0", Types.basic().integer, null, null, Precedence.bitOr);
}

function opCastToUint8(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.Int).value * RTL$.typeGuard(right, ConstValue.Int).value | 0);
}
CastToUint8.prototype.make = function(cx/*PType*/, e/*PType*/){
	return binaryWithCode(e, Expression.make("0xFF", Types.basic().integer, null, new ConstValue.Int(255)), opCastToUint8, " & ", Precedence.bitAnd);
};
CastToUint8.prototype.clone = function(cx/*PType*/, e/*PType*/){
	return this.make(cx, e).code();
};
openArrayChar = new Types.OpenArray(Types.basic().ch);
castOperations.castToUint8 = new CastToUint8();
castOperations.castToRecord = new Cast.CastOpRecord();
exports.equalCode = equalCode;
exports.notEqualCode = notEqualCode;
exports.CastToUint8 = CastToUint8;
exports.castOperations = function(){return castOperations;};
exports.binaryWithCode = binaryWithCode;
exports.relational = relational;
exports.equal = equal;
exports.assign = assign;
exports.addReal = addReal;
exports.addInt = addInt;
exports.subReal = subReal;
exports.subInt = subInt;
exports.mulReal = mulReal;
exports.mulInt = mulInt;
exports.divReal = divReal;
exports.divInt = divInt;
exports.mod = mod;
exports.setUnion = setUnion;
exports.setDiff = setDiff;
exports.setIntersection = setIntersection;
exports.setSymmetricDiff = setSymmetricDiff;
exports.setHasBit = setHasBit;
exports.setInclL = setInclL;
exports.setInclR = setInclR;
exports.or = or;
exports.and = and;
exports.equalInt = equalInt;
exports.equalReal = equalReal;
exports.equalSet = equalSet;
exports.equalStr = equalStr;
exports.notEqualInt = notEqualInt;
exports.notEqualReal = notEqualReal;
exports.notEqualSet = notEqualSet;
exports.notEqualStr = notEqualStr;
exports.is = is;
exports.lessInt = lessInt;
exports.lessReal = lessReal;
exports.lessStr = lessStr;
exports.greaterInt = greaterInt;
exports.greaterReal = greaterReal;
exports.greaterStr = greaterStr;
exports.eqLessInt = eqLessInt;
exports.eqLessReal = eqLessReal;
exports.eqLessStr = eqLessStr;
exports.eqGreaterInt = eqGreaterInt;
exports.eqGreaterReal = eqGreaterReal;
exports.eqGreaterStr = eqGreaterStr;
exports.not = not;
exports.negateInt = negateInt;
exports.negateReal = negateReal;
exports.unaryPlus = unaryPlus;
exports.setComplement = setComplement;
exports.lsl = lsl;
exports.asr = asr;
exports.ror = ror;
exports.mulInplace = mulInplace;
exports.divInplace = divInplace;
exports.pow2 = pow2;
exports.log2 = log2;

})(imports["js/Operator.js"]);
imports["js/Procedure.js"] = {};
(function module$Procedure(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var Code = require("js/Code.js");
var Context = require("js/Context.js");
var ConstValue = require("js/ConstValue.js");
var Designator = require("js/Designator.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var OberonRtl = require("js/OberonRtl.js");
var Object$ = require("js/Object.js");
var Operator = require("js/Operator.js");
var Precedence = require("js/CodePrecedence.js");
var Record = require("js/Record.js");
var String = require("js/String.js");
var Symbols = require("js/Symbols.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var $scope = "Procedure";
function Call(){
}
Call.prototype.$scope = $scope;
function StdCall(){
	Call.call(this);
	this.args = [];
}
RTL$.extend(StdCall, Call, $scope);
function CallLen(){
	StdCall.call(this);
	this.check = null;
}
RTL$.extend(CallLen, StdCall, $scope);
function CallGenerator(){
	Object$.Type.call(this);
}
RTL$.extend(CallGenerator, Object$.Type, $scope);
function CallGeneratorImpl(){
	CallGenerator.call(this);
	this.args = [];
	this.cx = null;
	this.call = null;
}
RTL$.extend(CallGeneratorImpl, CallGenerator, $scope);
function Type(){
	Types.Procedure.apply(this, arguments);
}
RTL$.extend(Type, Types.Procedure, $scope);
function Defined(){
	Type.apply(this, arguments);
	this.mArgs = [];
	this.mResult = null;
}
RTL$.extend(Defined, Type, $scope);
RTL$.extend(Std, Type, $scope);
RTL$.extend(Id, Types.ProcedureId, $scope);
RTL$.extend(StdId, Types.ProcedureId, $scope);
function ArgumentsCode(){
}
ArgumentsCode.prototype.$scope = $scope;
function GenArgCode(){
	ArgumentsCode.call(this);
	this.code = '';
	this.cx = null;
}
RTL$.extend(GenArgCode, ArgumentsCode, $scope);
var predefined = [];

function checkArgument(actual/*PType*/, expected/*PProcedureArgument*/, pos/*INTEGER*/, code/*PArgumentsCode*/, types/*PTypes*/){
	var result = null;
	var castErr = 0;
	var expectType = expected.type;
	if (expectType != null){
		var actualType = actual.type();
		castErr = types.implicitCast(actualType, expectType, expected.isVar, {set: function($v){result = $v;}, get: function(){return result;}});
		if (castErr == Cast.errVarParameter){
			Errors.raise("type mismatch for argument " + String.fromInt(pos + 1 | 0) + ": cannot pass '" + actualType.description() + "' as VAR parameter of type '" + expectType.description() + "'");
		}
		else if (castErr != Cast.errNo){
			Errors.raise("type mismatch for argument " + String.fromInt(pos + 1 | 0) + ": '" + actualType.description() + "' cannot be converted to '" + expectType.description() + "'");
		}
	}
	if (expected.isVar){
		var info = actual.info();
		if (info == null){
			Errors.raise("expression cannot be used as VAR parameter");
		}
		if (!(info instanceof Types.Variable) || info.isReadOnly()){
			Errors.raise(info.idType() + " cannot be passed as VAR actual parameter");
		}
	}
	if (code != null){
		code.write(actual, expected, result);
	}
}

function checkArgumentsType(actual/*ARRAY OF PType*/, expected/*ARRAY OF PProcedureArgument*/, code/*PArgumentsCode*/, types/*PTypes*/){
	var $seq1 = actual;
	for(var i = 0; i < $seq1.length; ++i){
		var a = $seq1[i];
		checkArgument(a, expected[i], i, code, types);
	}
}

function checkArgumentsCount(actual/*INTEGER*/, expected/*INTEGER*/){
	if (actual != expected){
		Errors.raise(String.fromInt(expected) + " argument(s) expected, got " + String.fromInt(actual));
	}
}

function processArguments(actual/*ARRAY OF PType*/, expected/*ARRAY OF PProcedureArgument*/, code/*PArgumentsCode*/, types/*PTypes*/){
	checkArgumentsCount(actual.length, expected.length);
	checkArgumentsType(actual, expected, code, types);
}

function checkArguments(actual/*ARRAY OF PType*/, expected/*ARRAY OF PProcedureArgument*/, types/*PTypes*/){
	processArguments(actual, expected, null, types);
}
Defined.prototype.designatorCode = function(id/*STRING*/){
	return id;
};
function Std(name/*STRING*/, call/*PCall*/){
	Type.call(this, name);
	this.call = null;
	this.call = call;
}
Std.prototype.args = function(){
	var result = [];
	return result;
};
Std.prototype.result = function(){
	return null;
};
function Id(type/*PProcedure*/, name/*STRING*/, local/*BOOLEAN*/){
	Types.ProcedureId.call(this, type);
	this.name = name;
	this.local = local;
}
Id.prototype.canBeReferenced = function(){
	return !this.local;
};
Id.prototype.idType = function(){
	return (this.local ? "local procedure" : Types.ProcedureId.prototype.idType.call(this)) + " '" + this.name + "'";
};
function StdId(type/*PStd*/, name/*STRING*/){
	Types.ProcedureId.call(this, type);
	this.name = name;
}
StdId.prototype.idType = function(){
	return "standard procedure " + this.name;
};
StdId.prototype.canBeReferenced = function(){
	return false;
};
CallGeneratorImpl.prototype.handleArgument = function(e/*PType*/){
	this.args.push(e);
};
CallGeneratorImpl.prototype.end = function(){
	return this.call.make(this.args, this.cx);
};

function makeCallGenerator(call/*PCall*/, cx/*PType*/){
	RTL$.assert(cx != null);
	var result = new CallGeneratorImpl();
	result.cx = cx;
	result.call = call;
	return result;
}
GenArgCode.prototype.write = function(actual/*PType*/, expected/*PProcedureArgument*/, cast/*PCastOp*/){
	var e = null;
	var coercedArg = null;
	if (expected != null && expected.isVar){
		coercedArg = Expression.makeSimple(this.cx.language.codeTraits.referenceCode(actual.info()), actual.type());
	}
	else {
		coercedArg = Expression.deref(actual);
	}
	if (this.code.length != 0){
		this.code = this.code + ", ";
	}
	if (cast != null){
		e = cast.make(this.cx, coercedArg);
	}
	else {
		e = coercedArg;
	}
	this.code = this.code + e.code();
};
GenArgCode.prototype.result = function(){
	return this.code;
};

function makeProcCallGeneratorWithCustomArgs(cx/*PType*/, type/*Type*/, argumentsCode/*PArgumentsCode*/){
	var $scope1 = $scope + ".makeProcCallGeneratorWithCustomArgs";
	function CallImpl(){
		Call.call(this);
		this.args = [];
		this.result = null;
		this.argumentsCode = null;
	}
	RTL$.extend(CallImpl, Call, $scope1);
	CallImpl.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		processArguments(args, this.args, this.argumentsCode, cx.language.types);
		return Expression.makeSimple("(" + this.argumentsCode.result() + ")", this.result);
	};
	var call = new CallImpl();
	Array.prototype.splice.apply(call.args, [0, Number.MAX_VALUE].concat(type.args()));
	call.result = type.result();
	call.argumentsCode = argumentsCode;
	return makeCallGenerator(call, cx);
}

function makeArgumentsCode(cx/*PType*/){
	var result = new GenArgCode();
	result.cx = cx;
	return result;
}

function makeProcCallGenerator(cx/*PType*/, type/*Type*/){
	return makeProcCallGeneratorWithCustomArgs(cx, type, makeArgumentsCode(cx));
}
Std.prototype.description = function(){
	return "standard procedure " + this.name;
};
Std.prototype.callGenerator = function(cx/*PType*/){
	return makeCallGenerator(this.call, cx);
};
Std.prototype.designatorCode = function(id/*STRING*/){
	return "";
};

function makeStdSymbol(p/*PStd*/){
	return new Symbols.Symbol(p.name, new StdId(p, p.name));
}

function hasArgument(call/*PStdCall*/, type/*PStorageType*/){
	call.args.push(new Types.ProcedureArgument(type, false));
}

function hasVarArgument(call/*PStdCall*/, type/*PStorageType*/){
	call.args.push(new Types.ProcedureArgument(type, true));
}

function hasArgumentWithCustomType(call/*PStdCall*/){
	call.args.push(new Types.ProcedureArgument(null, false));
}

function hasVarArgumnetWithCustomType(call/*PStdCall*/){
	call.args.push(new Types.ProcedureArgument(null, true));
}

function checkSingleArgument(actual/*ARRAY OF PType*/, call/*StdCall*/, types/*PTypes*/, code/*PArgumentsCode*/){
	RTL$.assert(call.args.length == 1);
	processArguments(actual, call.args, code, types);
	RTL$.assert(actual.length == 1);
	return actual[0];
}

function makeNew(){
	var $scope1 = $scope + ".makeNew";
	function CallImpl(){
		StdCall.call(this);
	}
	RTL$.extend(CallImpl, StdCall, $scope1);
	CallImpl.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		var result = null;
		var arg = checkSingleArgument(args, this, cx.language.types, null);
		var argType = arg.type();
		if (!(argType instanceof Record.Pointer)){
			Errors.raise("POINTER variable expected, got '" + argType.description() + "'");
		}
		else {
			var baseType = Record.pointerBase(argType);
			if (baseType.finalizedAsNonExported){
				Errors.raise("non-exported RECORD type cannot be used in NEW");
			}
			var right = Expression.makeSimple(baseType.codeForNew(cx.cx), argType);
			result = Expression.makeSimple(Operator.assign(arg.info(), right, cx), null);
		}
		return result;
	};
	var call = new CallImpl();
	hasVarArgumnetWithCustomType(call);
	return makeStdSymbol(new Std("NEW", call));
}

function lenArgumentCheck(argType/*PType*/){
	return argType instanceof Types.Array || argType instanceof Types.String;
}
CallLen.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	var arg = null;
	var argType = null;
	arg = checkSingleArgument(args, this, cx.language.types, null);
	argType = arg.type();
	if (!this.check(argType)){
		Errors.raise("ARRAY or string is expected as an argument of LEN, got '" + argType.description() + "'");
	}
	return Expression.makeSimple(arg.code() + ".length", Types.basic().integer);
};

function makeLen(check/*LenArgumentCheck*/){
	var call = new CallLen();
	call.check = check;
	hasArgumentWithCustomType(call);
	return makeStdSymbol(new Std("LEN", call));
}

function makeOdd(){
	var $scope1 = $scope + ".makeOdd";
	function CallImpl(){
		StdCall.call(this);
	}
	RTL$.extend(CallImpl, StdCall, $scope1);
	CallImpl.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		var arg = null;
		var code = '';
		var constValue = null;
		arg = checkSingleArgument(args, this, cx.language.types, null);
		code = Code.adjustPrecedence(arg, Precedence.bitAnd);
		constValue = arg.constValue();
		if (constValue != null){
			constValue = new ConstValue.Int(RTL$.typeGuard(constValue, ConstValue.Int).value & 1 ? 1 : 0);
		}
		return new Expression.Type(code + " & 1", Types.basic().bool, null, constValue, Precedence.bitAnd);
	};
	var call = new CallImpl();
	hasArgument(call, Types.basic().integer);
	return makeStdSymbol(new Std("ODD", call));
}

function makeAssert(){
	var $scope1 = $scope + ".makeAssert";
	function CallImpl(){
		StdCall.call(this);
	}
	RTL$.extend(CallImpl, StdCall, $scope1);
	CallImpl.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		var arg = null;
		arg = checkSingleArgument(args, this, cx.language.types, null);
		return Expression.makeSimple(cx.language.rtl.assertId() + "(" + arg.code() + ")", null);
	};
	var call = new CallImpl();
	hasArgument(call, Types.basic().bool);
	return makeStdSymbol(new Std("ASSERT", call));
}

function setBitImpl(name/*STRING*/, bitOp/*BinaryOpStr*/){
	var $scope1 = $scope + ".setBitImpl";
	function CallImpl(){
		StdCall.call(this);
		this.name = '';
		this.bitOp = null;
	}
	RTL$.extend(CallImpl, StdCall, $scope1);
	CallImpl.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		var x = null;var y = null;
		var yValue = 0;
		var value = null;
		var valueCodeExp = null;
		var valueCode = '';
		var comment = '';
		checkArguments(args, this.args, cx.language.types);
		RTL$.assert(args.length == 2);
		x = args[0];
		y = args[1];
		value = y.constValue();
		if (value == null){
			valueCodeExp = Operator.lsl(Expression.make("1", Types.basic().integer, null, new ConstValue.Int(1)), y);
			valueCode = valueCodeExp.code();
		}
		else {
			yValue = RTL$.typeGuard(value, ConstValue.Int).value;
			if (yValue < 0 || yValue > 31){
				Errors.raise("value (0..31) expected as a second argument of " + this.name + ", got " + String.fromInt(yValue));
			}
			comment = "bit: ";
			if (y.isTerm()){
				comment = comment + String.fromInt(yValue);
			}
			else {
				comment = comment + Code.adjustPrecedence(y, Precedence.shift);
			}
			yValue = 1 << yValue;
			valueCode = String.fromInt(yValue) + "/*" + comment + "*/";
		}
		return Expression.makeSimple(this.bitOp(Code.adjustPrecedence(x, Precedence.assignment), valueCode), null);
	};
	var call = new CallImpl();
	call.name = name;
	call.bitOp = bitOp;
	hasVarArgument(call, Types.basic().set);
	hasArgument(call, Types.basic().integer);
	return makeStdSymbol(new Std(call.name, call));
}

function checkVariableArgumentsCount(min/*INTEGER*/, max/*INTEGER*/, actual/*ARRAY OF PType*/){
	var len = actual.length;
	if (len < min){
		Errors.raise("at least " + String.fromInt(min) + " argument expected, got " + String.fromInt(len));
	}
	else if (len > max){
		Errors.raise("at most " + String.fromInt(max) + " arguments expected, got " + String.fromInt(len));
	}
}

function incImpl(name/*STRING*/, unary/*STRING*/, incOp/*BinaryOpStr*/, incRefOp/*BinaryProc*/){
	var $scope1 = $scope + ".incImpl";
	function CallImpl(){
		StdCall.call(this);
		this.name = '';
		this.unary = '';
		this.incOp = null;
		this.incRefOp = null;
	}
	RTL$.extend(CallImpl, StdCall, $scope1);
	CallImpl.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		var x = null;var y = null;
		var code = '';
		var value = null;
		var valueCode = '';
		checkVariableArgumentsCount(1, 2, args);
		checkArgumentsType(args, this.args, null, cx.language.types);
		x = args[0];
		if (Cast.passedByReference(x.info())){
			if (args.length == 1){
				y = Expression.makeSimple("1", null);
			}
			else {
				y = args[1];
			}
			var addExp = this.incRefOp(x, y);
			code = Cast.assign(cx, RTL$.typeGuard(x.info(), Types.Variable), addExp);
		}
		else if (args.length == 1){
			code = this.unary + x.code();
		}
		else {
			y = args[1];
			value = y.constValue();
			if (value == null){
				valueCode = y.code();
			}
			else {
				valueCode = String.fromInt(RTL$.typeGuard(value, ConstValue.Int).value);
				if (!y.isTerm()){
					valueCode = valueCode + "/*" + y.code() + "*/";
				}
			}
			code = this.incOp(x.code(), valueCode);
		}
		return Expression.makeSimple(code, null);
	};
	var call = new CallImpl();
	call.name = name;
	call.unary = unary;
	call.incOp = incOp;
	call.incRefOp = incRefOp;
	hasVarArgument(call, Types.basic().integer);
	hasArgument(call, Types.basic().integer);
	return makeStdSymbol(new Std(call.name, call));
}

function inclOp(x/*STRING*/, y/*STRING*/){
	return x + " |= " + y;
}

function exclOp(x/*STRING*/, y/*STRING*/){
	return x + " &= ~(" + y + ")";
}

function incOp(x/*STRING*/, y/*STRING*/){
	return x + " += " + y;
}

function decOp(x/*STRING*/, y/*STRING*/){
	return x + " -= " + y;
}

function makeAbs(){
	var $scope1 = $scope + ".makeAbs";
	function CallImpl(){
		StdCall.call(this);
	}
	RTL$.extend(CallImpl, StdCall, $scope1);
	CallImpl.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		var arg = null;
		var argType = null;
		arg = checkSingleArgument(args, this, cx.language.types, null);
		argType = arg.type();
		if (Types.numeric().indexOf(argType) == -1){
			Errors.raise("type mismatch: expected numeric type, got '" + argType.description() + "'");
		}
		return Expression.makeSimple("Math.abs(" + arg.code() + ")", argType);
	};
	var call = new CallImpl();
	hasArgumentWithCustomType(call);
	return makeStdSymbol(new Std("ABS", call));
}

function makeFloor(){
	var $scope1 = $scope + ".makeFloor";
	function CallImpl(){
		StdCall.call(this);
	}
	RTL$.extend(CallImpl, StdCall, $scope1);
	CallImpl.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		var arg = null;
		arg = checkSingleArgument(args, this, cx.language.types, null);
		var code = Code.adjustPrecedence(arg, Precedence.bitOr) + " | 0";
		return new Expression.Type(code, Types.basic().integer, null, null, Precedence.bitOr);
	};
	var call = new CallImpl();
	hasArgument(call, Types.basic().real);
	return makeStdSymbol(new Std("FLOOR", call));
}

function makeFlt(){
	var $scope1 = $scope + ".makeFlt";
	function CallImpl(){
		StdCall.call(this);
	}
	RTL$.extend(CallImpl, StdCall, $scope1);
	CallImpl.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		var arg = null;
		var value = null;
		arg = checkSingleArgument(args, this, cx.language.types, null);
		value = arg.constValue();
		if (value != null){
			value = new ConstValue.Real(RTL$.typeGuard(value, ConstValue.Int).value);
		}
		return new Expression.Type(arg.code(), Types.basic().real, null, value, arg.maxPrecedence());
	};
	var call = new CallImpl();
	hasArgument(call, Types.basic().integer);
	return makeStdSymbol(new Std("FLT", call));
}

function bitShiftImpl(name/*STRING*/, op/*BinaryProc*/){
	var $scope1 = $scope + ".bitShiftImpl";
	function CallImpl(){
		StdCall.call(this);
		this.name = '';
		this.op = null;
	}
	RTL$.extend(CallImpl, StdCall, $scope1);
	CallImpl.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		checkArguments(args, this.args, cx.language.types);
		RTL$.assert(args.length == 2);
		return this.op(args[0], args[1]);
	};
	var call = new CallImpl();
	call.name = name;
	call.op = op;
	hasArgument(call, Types.basic().integer);
	hasArgument(call, Types.basic().integer);
	return makeStdSymbol(new Std(call.name, call));
}

function makeOrd(){
	var $scope1 = $scope + ".makeOrd";
	function CallImpl(){
		StdCall.call(this);
	}
	RTL$.extend(CallImpl, StdCall, $scope1);
	CallImpl.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		var arg = null;
		var argType = null;
		var value = null;
		var code = '';
		var ch = 0;
		var result = null;
		arg = checkSingleArgument(args, this, cx.language.types, null);
		argType = arg.type();
		if (argType == Types.basic().ch || argType == Types.basic().set){
			value = arg.constValue();
			if (value != null && argType == Types.basic().set){
				value = new ConstValue.Int(RTL$.typeGuard(value, ConstValue.Set).value);
			}
			result = Expression.make(arg.code(), Types.basic().integer, null, value);
		}
		else if (argType == Types.basic().bool){
			code = Code.adjustPrecedence(arg, Precedence.conditional) + " ? 1 : 0";
			result = new Expression.Type(code, Types.basic().integer, null, arg.constValue(), Precedence.conditional);
		}
		else if (argType instanceof Types.String && Types.stringAsChar(RTL$.typeGuard(argType, Types.String), {set: function($v){ch = $v;}, get: function(){return ch;}})){
			result = Expression.make(String.fromInt(ch), Types.basic().integer, null, new ConstValue.Int(ch));
		}
		else {
			Errors.raise("ORD function expects CHAR or BOOLEAN or SET as an argument, got '" + argType.description() + "'");
		}
		return result;
	};
	var call = new CallImpl();
	hasArgumentWithCustomType(call);
	return makeStdSymbol(new Std("ORD", call));
}

function makeChr(){
	var $scope1 = $scope + ".makeChr";
	function CallImpl(){
		StdCall.call(this);
	}
	RTL$.extend(CallImpl, StdCall, $scope1);
	CallImpl.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		var arg = null;
		arg = checkSingleArgument(args, this, cx.language.types, null);
		return Expression.makeSimple(arg.code(), Types.basic().ch);
	};
	var call = new CallImpl();
	hasArgument(call, Types.basic().integer);
	return makeStdSymbol(new Std("CHR", call));
}

function makePack(){
	var $scope1 = $scope + ".makePack";
	function CallImpl(){
		StdCall.call(this);
	}
	RTL$.extend(CallImpl, StdCall, $scope1);
	CallImpl.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		var x = null;var y = null;
		checkArguments(args, this.args, cx.language.types);
		x = args[0];
		y = args[1];
		return Expression.makeSimple(Operator.mulInplace(x, Operator.pow2(y), cx), null);
	};
	var call = new CallImpl();
	hasVarArgument(call, Types.basic().real);
	hasArgument(call, Types.basic().integer);
	return makeStdSymbol(new Std("PACK", call));
}

function makeUnpk(){
	var $scope1 = $scope + ".makeUnpk";
	function CallImpl(){
		StdCall.call(this);
	}
	RTL$.extend(CallImpl, StdCall, $scope1);
	CallImpl.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		var x = null;var y = null;
		checkArguments(args, this.args, cx.language.types);
		x = args[0];
		y = args[1];
		return Expression.makeSimple(Operator.assign(y.info(), Operator.log2(x), cx) + "; " + Operator.divInplace(x, Operator.pow2(y), cx), null);
	};
	var call = new CallImpl();
	hasVarArgument(call, Types.basic().real);
	hasVarArgument(call, Types.basic().integer);
	return makeStdSymbol(new Std("UNPK", call));
}

function dumpProcArgs(proc/*Defined*/){
	var result = '';
	if (proc.mArgs.length == 0){
		if (proc.mResult != null){
			result = "()";
		}
	}
	else {
		result = "(";
		var $seq1 = proc.mArgs;
		for(var i = 0; i < $seq1.length; ++i){
			var arg = $seq1[i];
			if (i != 0){
				result = result + ", ";
			}
			RTL$.assert(arg.type != null);
			result = result + arg.type.description();
		}
		result = result + ")";
	}
	return result;
}
Defined.prototype.description = function(){
	var result = '';
	result = this.name;
	if (result.length == 0){
		result = "PROCEDURE" + dumpProcArgs(this);
		if (this.mResult != null){
			result = result + ": " + this.mResult.description();
		}
	}
	return result;
};
Defined.prototype.callGenerator = function(cx/*PType*/){
	return makeProcCallGenerator(cx, this);
};
Defined.prototype.define = function(args/*ARRAY OF PProcedureArgument*/, result/*PType*/){
	var $seq1 = args;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var a = $seq1[$key2];
		RTL$.assert(a.type != null);
	}
	Array.prototype.splice.apply(this.mArgs, [0, Number.MAX_VALUE].concat(args));
	this.mResult = result;
};
Defined.prototype.args = function(){
	return this.mArgs.slice();
};
Defined.prototype.result = function(){
	return this.mResult;
};
predefined.push(makeNew());
predefined.push(makeOdd());
predefined.push(makeAssert());
predefined.push(setBitImpl("INCL", inclOp));
predefined.push(setBitImpl("EXCL", exclOp));
predefined.push(incImpl("INC", "++", incOp, Operator.addInt));
predefined.push(incImpl("DEC", "--", decOp, Operator.subInt));
predefined.push(makeAbs());
predefined.push(makeFloor());
predefined.push(makeFlt());
predefined.push(bitShiftImpl("LSL", Operator.lsl));
predefined.push(bitShiftImpl("ASR", Operator.asr));
predefined.push(bitShiftImpl("ROR", Operator.ror));
predefined.push(makeOrd());
predefined.push(makeChr());
predefined.push(makePack());
predefined.push(makeUnpk());
exports.Call = Call;
exports.StdCall = StdCall;
exports.CallLen = CallLen;
exports.CallGenerator = CallGenerator;
exports.Type = Type;
exports.Defined = Defined;
exports.Std = Std;
exports.Id = Id;
exports.ArgumentsCode = ArgumentsCode;
exports.predefined = function(){return predefined;};
exports.checkArgument = checkArgument;
exports.checkArgumentsCount = checkArgumentsCount;
exports.processArguments = processArguments;
exports.makeCallGenerator = makeCallGenerator;
exports.makeProcCallGeneratorWithCustomArgs = makeProcCallGeneratorWithCustomArgs;
exports.makeArgumentsCode = makeArgumentsCode;
exports.makeProcCallGenerator = makeProcCallGenerator;
exports.makeStdSymbol = makeStdSymbol;
exports.hasArgumentWithCustomType = hasArgumentWithCustomType;
exports.checkSingleArgument = checkSingleArgument;
exports.lenArgumentCheck = lenArgumentCheck;
exports.makeLen = makeLen;

})(imports["js/Procedure.js"]);
imports["js/Module.js"] = {};
(function module$Module(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Context = require("js/Context.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var Procedure = require("js/Procedure.js");
var Symbols = require("js/Symbols.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "Module";
function Type(){
	Types.Module.apply(this, arguments);
}
RTL$.extend(Type, Types.Module, $scope);
RTL$.extend(AnyType, Procedure.Type, $scope);
RTL$.extend(AnyVariable, Variable.TypedVariable, $scope);
RTL$.extend(AnyField, Types.Field, $scope);
function AnyProcCall(){
	Procedure.Call.call(this);
}
RTL$.extend(AnyProcCall, Procedure.Call, $scope);
function JS(){
	Type.apply(this, arguments);
}
RTL$.extend(JS, Type, $scope);
var doProcId = '';var varTypeId = '';
var any = null;
var anyVar = null;
var doProcSymbol = null;var varTypeSymbol = null;
AnyType.prototype.description = function(){
	return "JS.var";
};
AnyType.prototype.initializer = function(cx/*Type*/){
	return "undefined";
};

function makeCallGenerator(cx/*PType*/){
	return Procedure.makeCallGenerator(new AnyProcCall(), cx);
}
AnyType.prototype.callGenerator = function(cx/*PType*/){
	return makeCallGenerator(cx);
};
AnyType.prototype.denote = function(id/*STRING*/, isReadObly/*BOOLEAN*/){
	return new AnyField(id);
};
AnyType.prototype.designatorCode = function(id/*STRING*/){
	return id;
};
AnyType.prototype.isScalar = function(){
	return false;
};
AnyType.prototype.args = function(){
	var result = [];
	return result;
};
AnyType.prototype.result = function(){
	return null;
};
function AnyVariable(){
	Variable.TypedVariable.call(this, any);
}
AnyVariable.prototype.isReadOnly = function(){
	return false;
};
AnyVariable.prototype.isReference = function(){
	return true;
};
AnyField.prototype.id = function(){
	return "any field";
};
AnyField.prototype.exported = function(){
	return false;
};
AnyField.prototype.type = function(){
	return any;
};
AnyField.prototype.asVar = function(leadCode/*STRING*/, isReadOnly/*BOOLEAN*/, cx/*Type*/){
	return anyVar;
};
AnyField.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	return new Types.FieldCode(leadCode + "." + this.mId, "", "");
};
AnyProcCall.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	var argCode = Procedure.makeArgumentsCode(cx);
	var $seq1 = args;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var a = $seq1[$key2];
		argCode.write(a, null, null);
	}
	return Expression.makeSimple("(" + argCode.result() + ")", any);
};
JS.prototype.findSymbol = function(id/*STRING*/){
	var result = null;
	if (id == doProcId){
		result = doProcSymbol;
	}
	else if (id == varTypeId){
		result = varTypeSymbol;
	}
	else {
		result = new Symbols.Symbol(id, new Procedure.Id(any, id, false));
	}
	return new Symbols.FoundSymbol(result, null);
};

function makeVarTypeSymbol(){
	return new Symbols.Symbol(varTypeId, new TypeId.Type(any));
}

function makeDoProcSymbol(){
	var $scope1 = $scope + ".makeDoProcSymbol";
	function Call(){
		Procedure.StdCall.call(this);
	}
	RTL$.extend(Call, Procedure.StdCall, $scope1);
	function Proc(){
		Procedure.Std.apply(this, arguments);
	}
	RTL$.extend(Proc, Procedure.Std, $scope1);
	var description = '';
	Call.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
		var arg = null;
		var type = null;
		arg = Procedure.checkSingleArgument(args, this, cx.language.types, null);
		type = arg.type();
		if (!(type instanceof Types.String)){
			Errors.raise("string is expected as an argument of " + description + ", got " + type.description());
		}
		return Expression.makeSimple(Types.stringValue(RTL$.typeGuard(type, Types.String)), null);
	};
	Proc.prototype.description = function(){
		return description;
	};
	description = "JS predefined procedure 'do'";
	var call = new Call();
	Procedure.hasArgumentWithCustomType(call);
	return Procedure.makeStdSymbol(new Procedure.Std("", call));
}

function makeJS(){
	return new JS("JS");
}
function AnyType(){
	Procedure.Type.call(this, "any type");
}
function AnyField(id/*STRING*/){
	Types.Field.call(this);
	this.mId = id;
}

function assertProcStatementResult(type/*PType*/){
	if (type != null && !(type instanceof AnyType)){
		Errors.raise("procedure returning a result cannot be used as a statement");
	}
}
doProcId = "do";
varTypeId = "var";
any = new AnyType();
anyVar = new AnyVariable();
doProcSymbol = makeDoProcSymbol();
varTypeSymbol = makeVarTypeSymbol();
exports.Type = Type;
exports.makeJS = makeJS;
exports.assertProcStatementResult = assertProcStatementResult;

})(imports["js/Module.js"]);
imports["js/Scope.js"] = {};
(function module$Scope(exports){
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

})(imports["js/Scope.js"]);
imports["js/ContextHierarchy.js"] = {};
(function module$ContextHierarchy(exports){
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

})(imports["js/ContextHierarchy.js"]);
imports["js/ExpressionTree.js"] = {};
(function module$ExpressionTree(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var Context = require("js/Context.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var JS = GLOBAL;
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var Operator = require("js/Operator.js");
var Record = require("js/Record.js");
var String = require("js/String.js");
var Types = require("js/Types.js");
var TypeId = require("js/TypeId.js");
var $scope = "ExpressionTree";
function Ops(){
}
Ops.prototype.$scope = $scope;
function Factor(){
	this.not = false;
	this.expression = null;
}
Factor.prototype.$scope = $scope;
function TermItem(){
	this.factor = null;
	this.next = null;
}
TermItem.prototype.$scope = $scope;
RTL$.extend(TermItemOp, TermItem, $scope);
function TermList(){
	TermItem.call(this);
	this.last = null;
}
RTL$.extend(TermList, TermItem, $scope);
function SimpleItem(){
	this.term = null;
	this.next = null;
}
SimpleItem.prototype.$scope = $scope;
RTL$.extend(SimpleItemOp, SimpleItem, $scope);
function SimpleList(){
	SimpleItem.call(this);
	this.unaryOp = '';
	this.last = null;
}
RTL$.extend(SimpleList, SimpleItem, $scope);
Node.prototype.$scope = $scope;
RightNode.prototype.$scope = $scope;
function OpTypeCheck(){
}
OpTypeCheck.prototype.$scope = $scope;
function IntOpTypeCheck(){
	OpTypeCheck.call(this);
}
RTL$.extend(IntOpTypeCheck, OpTypeCheck, $scope);
function NumericOpTypeCheck(){
	OpTypeCheck.call(this);
}
RTL$.extend(NumericOpTypeCheck, OpTypeCheck, $scope);
function NumericOrSetOpTypeCheck(){
	NumericOpTypeCheck.call(this);
}
RTL$.extend(NumericOrSetOpTypeCheck, NumericOpTypeCheck, $scope);
var intOpTypeCheck = new IntOpTypeCheck();
var numericOpTypeCheck = new NumericOpTypeCheck();
var numericOrSetOpTypeCheck = new NumericOrSetOpTypeCheck();

function throwTypeNameExpected(){
	Errors.raise("type name expected");
}

function castCode(type/*PType*/, cx/*Type*/){
	var result = '';
	if (type instanceof Record.Pointer){
		var baseType = Record.pointerBase(type);
		result = Record.constructor$(cx, baseType);
	}
	else {
		result = Record.constructor$(cx, RTL$.typeGuard(type, Record.Type));
	}
	return result;
}

function unwrapTypeId(id/*PId*/){
	var result = null;
	if (!(id instanceof TypeId.Type)){
		throwTypeNameExpected();
	}
	else {
		result = id;
	}
	return result;
}

function unwrapType(id/*PId*/){
	return unwrapTypeId(id).type();
}

function checkTypeCast(fromInfo/*PVariable*/, fromType/*PType*/, toType/*PType*/, msg/*STRING*/){
	
	function checkCommonBase(from/*PType*/, to/*PType*/, prefix/*STRING*/){
		var t = to.base;
		while (true){
			if (t != null && t != from){
				t = t.base;
			} else break;
		}
		if (t == null){
			Errors.raise(prefix + ": '" + to.description() + "' is not an extension of '" + from.description() + "'");
		}
	}
	var prefix = "invalid " + msg;
	var pointerExpected = fromType instanceof Record.Pointer;
	if (!pointerExpected && !(fromType instanceof Record.Type)){
		Errors.raise(prefix + ": POINTER to type or RECORD expected, got '" + fromType.description() + "'");
	}
	if (!pointerExpected){
		if (fromInfo != null && !fromInfo.isReference()){
			Errors.raise(prefix + ": a value variable cannot be used");
		}
		else if (!(toType instanceof Record.Type)){
			Errors.raise(prefix + ": RECORD type expected as an argument of RECORD " + msg + ", got '" + toType.description() + "'");
		}
	}
	else if (!(toType instanceof Record.Pointer)){
		Errors.raise(prefix + ": POINTER type expected as an argument of POINTER " + msg + ", got '" + toType.description() + "'");
	}
	if (pointerExpected){
		checkCommonBase(Record.pointerBase(RTL$.typeGuard(fromType, Record.Pointer)), Record.pointerBase(RTL$.typeGuard(toType, Record.Pointer)), prefix);
	}
	else {
		checkCommonBase(RTL$.typeGuard(fromType, Record.Type), RTL$.typeGuard(toType, Record.Type), prefix);
	}
}

function typeTest(left/*PType*/, right/*PId*/, cx/*Node*/){
	var leftVar = null;
	var info = left.info();
	if (info instanceof Types.Variable){
		leftVar = info;
	}
	var rightType = unwrapType(right);
	checkTypeCast(leftVar, left.type(), rightType, "type test");
	return Operator.is(left, Expression.makeSimple(castCode(rightType, cx), null));
}

function throwTypeMismatch(from/*PType*/, to/*PType*/){
	var fromDescription = '';
	if (from != null){
		fromDescription = "'" + from.description() + "'";
	}
	else {
		fromDescription = "no type (proper procedure call)";
	}
	Errors.raise("type mismatch: expected '" + to.description() + "', got " + fromDescription);
}

function throwOperatorTypeMismatch(op/*STRING*/, expect/*STRING*/, type/*PType*/){
	Errors.raise("operator '" + op + "' type mismatch: " + expect + " expected, got '" + type.description() + "'");
}

function checkTypeMatch(from/*PType*/, to/*PType*/){
	if (!Cast.areTypesMatch(from, to)){
		throwTypeMismatch(from, to);
	}
}

function checkImplicitCast(cx/*Root*/, from/*PType*/, to/*PType*/){
	var op = null;
	if (cx.language().types.implicitCast(from, to, false, {set: function($v){op = $v;}, get: function(){return op;}}) != Cast.errNo){
		throwTypeMismatch(from, to);
	}
}

function useIntOrderOp(t/*PType*/){
	return Types.isInt(t) || t == Types.basic().ch;
}

function useIntEqOp(t/*PType*/){
	return Types.isInt(t) || t == Types.basic().bool || t == Types.basic().ch || t instanceof Record.Pointer || t instanceof Types.Procedure || t == Types.nil();
}

function assertOpType(type/*PType*/, check/*OpTypeCheck*/, literal/*STRING*/){
	if (!check.check(type)){
		throwOperatorTypeMismatch(literal, check.expect(), type);
	}
}

function assertIntOp(type/*PType*/, literal/*STRING*/, op/*BinaryOperator*/){
	assertOpType(type, intOpTypeCheck, literal);
	return op;
}

function assertNumericOrSetOp(type/*PType*/, literal/*STRING*/, op/*BinaryOperator*/, intOp/*BinaryOperator*/, setOp/*BinaryOperator*/){
	var result = null;
	assertOpType(type, numericOrSetOpTypeCheck, literal);
	if (Types.isInt(type)){
		result = intOp;
	}
	else if (type == Types.basic().set){
		result = setOp;
	}
	else {
		result = op;
	}
	return result;
}

function notTypeId(e/*PType*/){
	var info = e.info();
	if (info instanceof TypeId.Type){
		Errors.raise("type name '" + info.type().description() + "' cannot be used as an expression");
	}
}

function promoteTypeInExpression(e/*PType*/, type/*PType*/){
	var v = 0;
	var result = null;
	var fromType = e.type();
	if (type == Types.basic().ch && fromType instanceof Types.String && Types.stringAsChar(fromType, {set: function($v){v = $v;}, get: function(){return v;}})){
		result = Expression.makeSimple(String.fromInt(v), type);
	}
	else {
		result = e;
	}
	return result;
}

function relationOp(left/*PType*/, right/*PType*/, literal/*STRING*/, ops/*Ops*/, context/*VAR Node*/){
	var type = null;
	var o = null;
	var mismatch = '';
	notTypeId(left);
	if (literal != "IS"){
		notTypeId(right);
		if (literal != "IN"){
			type = ops.coalesceType(left.type(), right.type());
		}
	}
	if (literal == "="){
		o = ops.eq(type);
		if (o == null){
			mismatch = ops.eqExpect();
		}
	}
	else if (literal == "#"){
		o = ops.notEq(type);
		if (o == null){
			mismatch = ops.eqExpect();
		}
	}
	else if (literal == "<"){
		o = ops.less(type);
		if (o == null){
			mismatch = ops.strongRelExpect();
		}
	}
	else if (literal == ">"){
		o = ops.greater(type);
		if (o == null){
			mismatch = ops.strongRelExpect();
		}
	}
	else if (literal == "<="){
		o = ops.lessEq(type);
		if (o == null){
			mismatch = ops.relExpect();
		}
	}
	else if (literal == ">="){
		o = ops.greaterEq(type);
		if (o == null){
			mismatch = ops.relExpect();
		}
	}
	else if (literal == "IS"){
		o = ops.is(context);
	}
	else if (literal == "IN"){
		o = ops.in(left.type(), right.type(), context);
	}
	if (mismatch.length != 0){
		throwOperatorTypeMismatch(literal, mismatch, type);
	}
	return o;
}

function mulOp(s/*STRING*/, type/*PType*/){
	var o = null;
	if (s == "*"){
		o = assertNumericOrSetOp(type, s, Operator.mulReal, Operator.mulInt, Operator.setIntersection);
	}
	else if (s == "/"){
		if (Types.isInt(type)){
			Errors.raise("operator DIV expected for integer division");
		}
		o = assertNumericOrSetOp(type, s, Operator.divReal, null, Operator.setSymmetricDiff);
	}
	else if (s == "DIV"){
		o = assertIntOp(type, s, Operator.divInt);
	}
	else if (s == "MOD"){
		o = assertIntOp(type, s, Operator.mod);
	}
	else if (s == "&"){
		if (type != Types.basic().bool){
			Errors.raise("BOOLEAN expected as operand of '&', got '" + type.description() + "'");
		}
		o = Operator.and;
	}
	else {
		RTL$.assert(false);
	}
	return o;
}

function makeFromFactor(f/*Factor*/){
	var result = f.expression;
	if (f.not){
		notTypeId(result);
		checkTypeMatch(result.type(), Types.basic().bool);
		result = Operator.not(result);
	}
	return result;
}

function makeFromTermList(list/*TermList*/, root/*Root*/){
	var result = makeFromFactor(list.factor);
	var next = list.next;
	while (true){
		if (next != null){
			notTypeId(result);
			var e = makeFromFactor(next.factor);
			notTypeId(e);
			var type = result.type();
			var o = mulOp(next.op, type);
			checkImplicitCast(root, e.type(), type);
			result = o(result, e);
			next = next.next;
		} else break;
	}
	return result;
}

function makeFirstFromSimpleList(list/*SimpleList*/, root/*Root*/){
	var o = null;
	var result = makeFromTermList(list.term, root);
	if (list.unaryOp == "-"){
		var type = result.type();
		if (Types.isInt(type)){
			o = Operator.negateInt;
		}
		else if (type == Types.basic().set){
			o = Operator.setComplement;
		}
		else if (type == Types.basic().real){
			o = Operator.negateReal;
		}
		else {
			throwOperatorTypeMismatch(list.unaryOp, numericOrSetOpTypeCheck.expect(), type);
		}
	}
	else if (list.unaryOp == "+"){
		assertOpType(result.type(), numericOpTypeCheck, list.unaryOp);
		o = Operator.unaryPlus;
	}
	if (o != null){
		notTypeId(result);
		result = o(result);
	}
	return result;
}

function matchAddOperator(ops/*Ops*/, s/*STRING*/, type/*PType*/){
	var result = null;
	if (s == "+"){
		result = ops.plus(type);
	}
	else if (s == "-"){
		result = assertNumericOrSetOp(type, s, Operator.subReal, Operator.subInt, Operator.setDiff);
	}
	else if (s == "OR"){
		if (type != Types.basic().bool){
			Errors.raise("BOOLEAN expected as operand of 'OR', got '" + type.description() + "'");
		}
		result = Operator.or;
	}
	return result;
}

function makeFromSimpleList(list/*SimpleList*/, ops/*Ops*/, cx/*Root*/){
	var result = makeFirstFromSimpleList(list, cx);
	var next = list.next;
	while (true){
		if (next != null){
			notTypeId(result);
			var e = makeFromTermList(next.term, cx);
			notTypeId(e);
			var o = matchAddOperator(ops, next.op, result.type());
			checkImplicitCast(cx, e.type(), result.type());
			result = o(result, e);
			next = next.next;
		} else break;
	}
	return result;
}

function makeFromNode(node/*Node*/, ops/*Ops*/, cx/*PNode*/){
	var root = cx.root();
	var result = makeFromSimpleList(node.left, ops, root);
	var right = node.right;
	if (right != null){
		var leftExpression = result;
		var rightExpression = makeFromSimpleList(right.simple, ops, root);
		leftExpression = promoteTypeInExpression(leftExpression, rightExpression.type());
		rightExpression = promoteTypeInExpression(rightExpression, leftExpression.type());
		var o = relationOp(leftExpression, rightExpression, right.op, ops, cx);
		result = o(leftExpression, rightExpression, ContextHierarchy.makeLanguageContext(cx));
	}
	notTypeId(result);
	var type = result.type();
	if (type == null){
		Errors.raise("procedure returning no result cannot be used in an expression");
	}
	return result;
}
Ops.prototype.is = function(cx/*VAR Node*/){
	var r = null;
	
	function is(left/*PType*/, right/*PType*/, unused/*PType*/){
		var result = null;
		var info = right.info();
		if (info == null){
			throwTypeNameExpected();
		}
		else {
			result = typeTest(left, info, cx);
		}
		return result;
	}
	r = is;
	return r;
};
Ops.prototype.in = function(left/*PType*/, right/*PType*/, cx/*Node*/){
	if (!Types.isInt(left)){
		Errors.raise(Types.intsDescription() + " expected as an element of SET, got '" + left.description() + "'");
	}
	checkImplicitCast(cx.root(), right, Types.basic().set);
	return Operator.setHasBit;
};
Ops.prototype.eqExpect = function(){
	return "numeric type or SET or BOOLEAN or CHAR or character array or POINTER or PROCEDURE";
};
Ops.prototype.strongRelExpect = function(){
	return "numeric type or CHAR or character array";
};
Ops.prototype.relExpect = function(){
	return "numeric type or SET or CHAR or character array";
};
Ops.prototype.coalesceType = function(leftType/*PType*/, rightType/*PType*/){
	var result = null;
	if (leftType instanceof Record.Pointer && rightType instanceof Record.Pointer){
		result = Cast.findPointerBaseType(leftType, rightType);
		if (result == null){
			result = Cast.findPointerBaseType(rightType, leftType);
		}
	}
	if (result == null){
		var isStrings = Types.isString(leftType) && Types.isString(rightType);
		if (!isStrings){
			checkTypeMatch(rightType, leftType);
		}
		result = leftType;
	}
	return result;
};
Ops.prototype.eq = function(type/*PType*/){
	var result = null;
	if (useIntEqOp(type)){
		result = Operator.equalInt;
	}
	else if (Types.isString(type)){
		result = Operator.equalStr;
	}
	else if (type == Types.basic().real){
		result = Operator.equalReal;
	}
	else if (type == Types.basic().set){
		result = Operator.equalSet;
	}
	return result;
};
Ops.prototype.notEq = function(type/*PType*/){
	var result = null;
	if (useIntEqOp(type)){
		result = Operator.notEqualInt;
	}
	else if (Types.isString(type)){
		result = Operator.notEqualStr;
	}
	else if (type == Types.basic().real){
		result = Operator.notEqualReal;
	}
	else if (type == Types.basic().set){
		result = Operator.notEqualSet;
	}
	return result;
};
Ops.prototype.less = function(type/*PType*/){
	var result = null;
	if (useIntOrderOp(type)){
		result = Operator.lessInt;
	}
	else if (Types.isString(type)){
		result = Operator.lessStr;
	}
	else if (type == Types.basic().real){
		result = Operator.lessReal;
	}
	return result;
};
Ops.prototype.greater = function(type/*PType*/){
	var result = null;
	if (useIntOrderOp(type)){
		result = Operator.greaterInt;
	}
	else if (Types.isString(type)){
		result = Operator.greaterStr;
	}
	else if (type == Types.basic().real){
		result = Operator.greaterReal;
	}
	return result;
};
Ops.prototype.lessEq = function(type/*PType*/){
	var result = null;
	if (useIntOrderOp(type)){
		result = Operator.eqLessInt;
	}
	else if (Types.isString(type)){
		result = Operator.eqLessStr;
	}
	else if (type == Types.basic().real){
		result = Operator.eqLessReal;
	}
	else if (type == Types.basic().set){
		result = Operator.setInclL;
	}
	return result;
};
Ops.prototype.greaterEq = function(type/*PType*/){
	var result = null;
	if (useIntOrderOp(type)){
		result = Operator.eqGreaterInt;
	}
	else if (Types.isString(type)){
		result = Operator.eqGreaterStr;
	}
	else if (type == Types.basic().real){
		result = Operator.eqGreaterReal;
	}
	else if (type == Types.basic().set){
		result = Operator.setInclR;
	}
	return result;
};
Ops.prototype.plus = function(type/*PType*/){
	var result = null;
	if (type == Types.basic().set){
		result = Operator.setUnion;
	}
	else if (Types.isInt(type)){
		result = Operator.addInt;
	}
	else if (type == Types.basic().real){
		result = Operator.addReal;
	}
	else {
		throwOperatorTypeMismatch("+", this.plusExpect(), type);
	}
	return result;
};
Ops.prototype.plusExpect = function(){
	return "numeric type or SET";
};
Factor.prototype.logicalNot = function(){
	this.not = !this.not;
};
function TermItemOp(op/*STRING*/){
	TermItem.call(this);
	this.op = op;
}
function SimpleItemOp(op/*STRING*/){
	SimpleItem.call(this);
	this.op = op;
}
function RightNode(op/*STRING*/){
	this.op = op;
	this.simple = null;
}
TermList.prototype.makeFactor = function(){
	return new Factor();
};
TermList.prototype.addFactor = function(f/*PFactor*/){
	if (this.factor == null){
		this.factor = f;
	}
	else {
		this.last.factor = f;
	}
};
TermList.prototype.addOp = function(op/*STRING*/){
	var next = new TermItemOp(op);
	if (this.last == null){
		this.next = next;
	}
	else {
		this.last.next = next;
	}
	this.last = next;
};
SimpleList.prototype.makeTerm = function(){
	return new TermList();
};
SimpleList.prototype.addTerm = function(t/*PTermList*/){
	if (this.term == null){
		this.term = t;
	}
	else {
		this.last.term = t;
	}
};
SimpleList.prototype.addOp = function(op/*STRING*/){
	var next = new SimpleItemOp(op);
	if (this.last == null){
		this.next = next;
	}
	else {
		this.last.next = next;
	}
	this.last = next;
};
function Node(ops/*POps*/){
	this.ops = ops;
	this.left = null;
	this.right = null;
}
Node.prototype.makeSimple = function(){
	return new SimpleList();
};
Node.prototype.addSimple = function(s/*PSimpleList*/){
	if (this.left == null){
		this.left = s;
	}
	else {
		this.right.simple = s;
	}
};
Node.prototype.addOp = function(op/*STRING*/){
	this.right = new RightNode(op);
};
Node.prototype.asExpression = function(cx/*PNode*/){
	return makeFromNode(this, this.ops, cx);
};
IntOpTypeCheck.prototype.expect = function(){
	return Types.intsDescription();
};
IntOpTypeCheck.prototype.check = function(t/*PType*/){
	return Types.isInt(t);
};
NumericOpTypeCheck.prototype.expect = function(){
	return "numeric type";
};
NumericOpTypeCheck.prototype.check = function(t/*PType*/){
	return Types.numeric().indexOf(t) != -1;
};
NumericOrSetOpTypeCheck.prototype.expect = function(){
	return NumericOpTypeCheck.prototype.expect.call(this) + " or SET";
};
NumericOrSetOpTypeCheck.prototype.check = function(t/*PType*/){
	return NumericOpTypeCheck.prototype.check.call(this, t) || t == Types.basic().set;
};
exports.Ops = Ops;
exports.Factor = Factor;
exports.TermItem = TermItem;
exports.TermList = TermList;
exports.SimpleItem = SimpleItem;
exports.SimpleList = SimpleList;
exports.Node = Node;
exports.RightNode = RightNode;
exports.IntOpTypeCheck = IntOpTypeCheck;
exports.throwTypeNameExpected = throwTypeNameExpected;
exports.castCode = castCode;
exports.unwrapTypeId = unwrapTypeId;
exports.unwrapType = unwrapType;
exports.checkTypeCast = checkTypeCast;
exports.typeTest = typeTest;
exports.checkImplicitCast = checkImplicitCast;
exports.makeFromFactor = makeFromFactor;

})(imports["js/ExpressionTree.js"]);
imports["js/ContextExpression.js"] = {};
(function module$ContextExpression(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ConstValue = require("js/ConstValue.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Designator = require("js/Designator.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var ExpressionTree = require("js/ExpressionTree.js");
var Scope = require("js/Scope.js");
var String = require("js/String.js");
var Types = require("js/Types.js");
var $scope = "ContextExpression";
function ExpressionHandler(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(ExpressionHandler, ContextHierarchy.Node, $scope);
RTL$.extend(SimpleExpression, ContextHierarchy.Node, $scope);
RTL$.extend(ExpressionNode, ContextHierarchy.Node, $scope);
RTL$.extend(Factor, ExpressionHandler, $scope);
RTL$.extend(Term, ContextHierarchy.Node, $scope);
function MulOperator(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(MulOperator, ContextHierarchy.Node, $scope);
function AddOperator(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(AddOperator, ContextHierarchy.Node, $scope);
function Const(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(Const, ContextHierarchy.Node, $scope);
function Integer(){
	Const.apply(this, arguments);
}
RTL$.extend(Integer, Const, $scope);
function Real(){
	Const.apply(this, arguments);
}
RTL$.extend(Real, Const, $scope);
function Str(){
	Const.apply(this, arguments);
}
RTL$.extend(Str, Const, $scope);
RTL$.extend(SetElement, ExpressionHandler, $scope);
function Set(){
	ContextHierarchy.Node.apply(this, arguments);
	this.value = 0;
	this.expression = '';
}
RTL$.extend(Set, ContextHierarchy.Node, $scope);
var globalOps = null;
function ExpressionNode(parent/*PExpressionHandler*/, node/*PNode*/){
	ContextHierarchy.Node.call(this, parent);
	this.node = node;
	if (this.node == null){
		this.node = new ExpressionTree.Node(globalOps);
	}
}
ExpressionNode.prototype.handleLiteral = function(s/*STRING*/){
	this.node.addOp(s);
};
ExpressionNode.prototype.codeGenerator = function(){
	return CodeGenerator.nullGenerator();
};
ExpressionNode.prototype.endParse = function(){
	var expression = this.node.asExpression(this);
	var parent = RTL$.typeGuard(this.parent(), ExpressionHandler);
	parent.codeGenerator().write(expression.code());
	parent.handleExpression(expression);
	return true;
};
function SimpleExpression(parent/*PNode*/){
	ContextHierarchy.Node.call(this, parent);
	this.list = RTL$.typeGuard(parent, ExpressionNode).node.makeSimple();
}
SimpleExpression.prototype.handleLiteral = function(s/*STRING*/){
	this.list.unaryOp = s;
};
SimpleExpression.prototype.handleOperator = function(op/*STRING*/){
	this.list.addOp(op);
};
SimpleExpression.prototype.endParse = function(){
	RTL$.typeGuard(this.parent(), ExpressionNode).node.addSimple(this.list);
	return true;
};

function expressionFromConst(type/*PType*/, value/*PType*/, code/*STRING*/){
	return Expression.make(code, type, null, value);
}
function Factor(parent/*PNode*/){
	ExpressionHandler.call(this, parent);
	this.factor = null;
	if (parent instanceof Factor){
		this.factor = parent.factor;
	}
	else {
		this.factor = RTL$.typeGuard(parent, Term).list.makeFactor();
	}
}
Factor.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "NIL"){
		this.handleExpression(expressionFromConst(Types.nil(), null, "null"));
	}
	else if (s == "TRUE"){
		this.handleExpression(expressionFromConst(Types.basic().bool, new ConstValue.Int(1), "true"));
	}
	else if (s == "FALSE"){
		this.handleExpression(expressionFromConst(Types.basic().bool, new ConstValue.Int(0), "false"));
	}
	else if (s == "~"){
		this.factor.logicalNot();
	}
};
Factor.prototype.handleExpression = function(e/*PType*/){
	this.factor.expression = e;
};
Factor.prototype.endParse = function(){
	var const$ = null;
	if (this.factor.expression == null){
		var d = this.attributes.designator;
		var info = d.info();
		if (info instanceof Types.Const){
			const$ = info.value;
		}
		this.factor.expression = Expression.make(d.code(), d.type(), d.info(), const$);
	}
	var parent = this.parent();
	if (parent instanceof Term){
		parent.list.addFactor(this.factor);
	}
	return true;
};
function Term(parent/*PNode*/){
	ContextHierarchy.Node.call(this, parent);
	this.list = RTL$.typeGuard(parent, SimpleExpression).list.makeTerm();
}
Term.prototype.endParse = function(){
	RTL$.typeGuard(this.parent(), SimpleExpression).list.addTerm(this.list);
	return true;
};
MulOperator.prototype.handleLiteral = function(s/*STRING*/){
	RTL$.typeGuard(this.parent(), Term).list.addOp(s);
};
AddOperator.prototype.handleLiteral = function(s/*STRING*/){
	var parent = RTL$.typeGuard(this.parent(), SimpleExpression);
	parent.handleOperator(s);
};
Integer.prototype.handleInt = function(n/*INTEGER*/){
	RTL$.typeGuard(this.parent(), ExpressionHandler).handleExpression(expressionFromConst(Types.basic().integer, new ConstValue.Int(n), String.fromInt(n)));
};
Real.prototype.handleReal = function(r/*REAL*/){
	RTL$.typeGuard(this.parent(), ExpressionHandler).handleExpression(expressionFromConst(Types.basic().real, new ConstValue.Real(r), String.fromReal(r)));
};

function escapeString(s/*STRING*/){
	var doubleQuote = Chars.doubleQuote;
	var ln = Chars.ln;
	var cr = Chars.cr;
	var tab = Chars.tab;
	var backspace = Chars.backspace;
	var feed = Chars.feed;
	var backslash = Chars.backslash;
	var result = '';
	result = doubleQuote;
	var from = 0;
	for (var i = 0; i <= s.length - 1 | 0; ++i){
		var escape = 0;
		var $case1 = s.charCodeAt(i);
		if ($case1 === 92){
			escape = 92;
		}
		else if ($case1 === 34){
			escape = 34;
		}
		else if ($case1 === 10){
			escape = 110;
		}
		else if ($case1 === 13){
			escape = 114;
		}
		else if ($case1 === 9){
			escape = 116;
		}
		else if ($case1 === 8){
			escape = 98;
		}
		else if ($case1 === 12){
			escape = 102;
		}
		if (escape != 0){
			result = result + String.substr(s, from, i - from | 0) + backslash + String.fromChar(escape);
			from = i + 1 | 0;
		}
	}
	return result + String.substr(s, from, s.length - from | 0) + doubleQuote;
}
Str.prototype.handleStr = function(s/*STRING*/){
	RTL$.typeGuard(this.parent(), ExpressionHandler).handleExpression(expressionFromConst(new Types.String(s), new ConstValue.String(s), escapeString(s)));
};
function SetElement(parent/*PSet*/){
	ExpressionHandler.call(this, parent);
	this.from = '';
	this.to = '';
	this.fromValue = null;
	this.toValue = null;
	this.code = new CodeGenerator.SimpleGenerator();
}
SetElement.prototype.codeGenerator = function(){
	return this.code;
};
SetElement.prototype.handleExpression = function(e/*PType*/){
	var value = RTL$.typeGuard(e.constValue(), ConstValue.Int);
	if (this.from.length == 0){
		this.from = this.code.result();
		this.fromValue = value;
		this.code = new CodeGenerator.SimpleGenerator();
	}
	else {
		this.to = this.code.result();
		this.toValue = value;
	}
};
SetElement.prototype.endParse = function(){
	RTL$.typeGuard(this.parent(), Set).handleElement(this);
	return true;
};
Set.prototype.handleElement = function(s/*SetElement*/){
	if (s.fromValue != null && (s.to.length == 0 || s.toValue != null)){
		if (s.to.length != 0){
			for (var i = s.fromValue.value; i <= s.toValue.value; ++i){
				this.value |= 1 << i;
			}
		}
		else {
			this.value |= 1 << s.fromValue.value;
		}
	}
	else {
		if (this.expression.length != 0){
			this.expression = this.expression + ", ";
		}
		if (s.to.length != 0){
			this.expression = this.expression + "[" + s.from + ", " + s.to + "]";
		}
		else {
			this.expression = this.expression + s.from;
		}
	}
};
Set.prototype.endParse = function(){
	var parent = RTL$.typeGuard(this.parent(), Factor);
	if (this.expression.length == 0){
		parent.handleExpression(expressionFromConst(Types.basic().set, new ConstValue.Set(this.value), String.fromInt(this.value)));
	}
	else {
		var code = this.root().language().rtl.makeSet(this.expression);
		if (this.value != 0){
			code = code + " | " + String.fromInt(this.value);
		}
		var e = Expression.makeSimple(code, Types.basic().set);
		parent.handleExpression(e);
	}
	return true;
};

function designatorAsExpression(d/*PType*/){
	var value = null;
	var info = d.info();
	if (info instanceof Types.ProcedureId){
		if (!info.canBeReferenced()){
			Errors.raise(info.idType() + " cannot be referenced");
		}
	}
	else if (info instanceof Types.Const){
		value = info.value;
	}
	return Expression.make(d.code(), d.type(), d.info(), value);
}
globalOps = new ExpressionTree.Ops();
exports.ExpressionHandler = ExpressionHandler;
exports.SimpleExpression = SimpleExpression;
exports.ExpressionNode = ExpressionNode;
exports.Factor = Factor;
exports.Term = Term;
exports.MulOperator = MulOperator;
exports.AddOperator = AddOperator;
exports.Integer = Integer;
exports.Real = Real;
exports.Str = Str;
exports.SetElement = SetElement;
exports.Set = Set;
exports.designatorAsExpression = designatorAsExpression;

})(imports["js/ContextExpression.js"]);
imports["js/Lexer.js"] = {};
(function module$Lexer(exports){
var Chars = require("js/Chars.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Errors = require("js/Errors.js");
var Stream = require("js/Stream.js");
var String = require("js/String.js");
var $scope = "Lexer";
var doubleQuote = Chars.doubleQuote;
var commentBegin = "(*";
var commentEnd = "*)";
Literal.prototype.$scope = $scope;

function isDigit(c/*CHAR*/){
	return c >= 48 && c <= 57;
}

function isLetter(c/*CHAR*/){
	return c >= 97 && c <= 122 || c >= 65 && c <= 90;
}

function peekSeparator(stream/*VAR Type*/){
	var result = true;
	if (!Stream.eof(stream)){
		var c = Stream.peekChar(stream);
		if (isLetter(c)){
			result = false;
		}
		else if (c == 46){
			result = Stream.peekStr(stream, "..");
		}
	}
	return result;
}

function integer(stream/*VAR Type*/, cx/*VAR Integer*/){
	var hexDetected = false;
	var dec = 0;var hex = 0;
	
	function collect(c/*CHAR*/){
		var d = -1;
		if (isDigit(c)){
			d = c - 48 | 0;
		}
		else if (c >= 65 && c <= 70){
			d = (c - 65 | 0) + 10 | 0;
			hexDetected = true;
		}
		if (d != -1){
			hex = (hex * 16 | 0) + d | 0;
			if (!hexDetected){
				dec = (dec * 10 | 0) + d | 0;
			}
		}
		return d != -1;
	}
	var result = false;
	if (!Stream.eof(stream) && collect(Stream.getChar(stream)) && !hexDetected){
		while (true){
			if (!Stream.eof(stream) && collect(Stream.peekChar(stream))){
				Stream.next(stream, 1);
			} else break;
		}
		if (!Stream.eof(stream) && Stream.peekChar(stream) == 72){
			hexDetected = true;
			Stream.next(stream, 1);
		}
		else if (hexDetected){
			Errors.raise("integer constant looks like having hexadecimal format but 'H' suffix is missing");
		}
		if (peekSeparator(stream)){
			if (hexDetected){
				cx.handleInt(hex);
			}
			else {
				cx.handleInt(dec);
			}
			result = true;
		}
	}
	return result;
}

function real(stream/*VAR Type*/, cx/*VAR Real*/){
	var c = 0;
	var s = '';
	
	function peekChar(){
		var result = false;
		if (!Stream.eof(stream)){
			c = Stream.peekChar(stream);
			result = true;
		}
		return result;
	}
	
	function getChar(){
		var result = false;
		if (!Stream.eof(stream)){
			c = Stream.getChar(stream);
			result = true;
		}
		return result;
	}
	
	function next(){
		Stream.next(stream, 1);
	}
	
	function collectOptionalDigits(){
		while (true){
			if (peekChar() && isDigit(c)){
				s = s + String.fromChar(c);
				next();
			} else break;
		}
	}
	
	function collectDigits(){
		var result = false;
		if (getChar() && isDigit(c)){
			s = s + String.fromChar(c);
			collectOptionalDigits();
			result = true;
		}
		return result;
	}
	
	function collectScale(){
		
		function collectPlusOrMinus(){
			if (peekChar()){
				if (c == 45){
					s = s + "-";
					next();
				}
				else if (c == 43){
					next();
				}
			}
		}
		var result = true;
		if (peekChar() && c == 69){
			s = s + "E";
			next();
			collectPlusOrMinus();
			result = collectDigits();
		}
		return result;
	}
	var result = false;
	if (collectDigits() && getChar() && c == 46){
		s = s + ".";
		collectOptionalDigits();
		if (collectScale() && peekSeparator(stream)){
			cx.handleReal(String.parseReal(s));
			result = true;
		}
	}
	return result;
}

function isHexDigit(c/*CHAR*/){
	return isDigit(c) || c >= 65 && c <= 70;
}

function point(stream/*VAR Type*/, context/*Node*/){
	var result = false;
	if (!Stream.eof(stream) && Stream.getChar(stream) == 46 && (Stream.eof(stream) || Stream.peekChar(stream) != 46)){
		context.handleLiteral(".");
		result = true;
	}
	return result;
}

function string(stream/*VAR Type*/, cx/*VAR Str*/){
	
	function quotedString(){
		var c = 0;
		var s = '';
		if (!Stream.eof(stream)){
			c = Stream.getChar(stream);
			while (true){
				if (c != 34 && !Stream.eof(stream)){
					if (c != 34){
						s = s + String.fromChar(c);
					}
					c = Stream.getChar(stream);
				} else break;
			}
		}
		else {
			c = 0;
		}
		if (c != 34){
			Errors.raise("unexpected end of string");
		}
		cx.handleStr(s);
	}
	
	function hexString(firstChar/*CHAR*/){
		var result = false;
		var s = String.fromChar(firstChar);
		while (true){
			if (!Stream.eof(stream) && isHexDigit(Stream.peekChar(stream))){
				s = s + String.fromChar(Stream.getChar(stream));
			} else break;
		}
		if (!Stream.eof(stream) && Stream.getChar(stream) == 88){
			cx.handleStr(String.fromChar(String.parseHex(s)));
			result = true;
		}
		return result;
	}
	var result = false;
	if (!Stream.eof(stream)){
		var c = Stream.getChar(stream);
		if (c == 34){
			quotedString();
			result = true;
		}
		else if (isDigit(c)){
			result = hexString(c);
		}
	}
	return result;
}

function ident(stream/*VAR Type*/, context/*Node*/, reservedWords/*ARRAY OF STRING*/){
	var result = false;
	var c = 0;
	var s = '';
	if (!Stream.eof(stream)){
		c = Stream.getChar(stream);
		if (isLetter(c)){
			while (true){
				if (!Stream.eof(stream) && (isLetter(c) || isDigit(c))){
					s = s + String.fromChar(c);
					c = Stream.getChar(stream);
				} else break;
			}
			if (isLetter(c) || isDigit(c)){
				s = s + String.fromChar(c);
			}
			else {
				Stream.next(stream, -1);
			}
			if (reservedWords.indexOf(s) == -1){
				context.handleIdent(s);
				result = true;
			}
		}
	}
	return result;
}

function skipComment(stream/*VAR Type*/, context/*Node*/){
	var result = false;
	if (Stream.peekStr(stream, commentBegin)){
		Stream.next(stream, commentBegin.length);
		while (true){
			if (!Stream.peekStr(stream, commentEnd)){
				if (!skipComment(stream, context)){
					Stream.next(stream, 1);
					if (Stream.eof(stream)){
						Errors.raise("comment was not closed");
					}
				}
			} else break;
		}
		Stream.next(stream, commentEnd.length);
		result = true;
	}
	return result;
}

function readSpaces(c/*CHAR*/){
	return c == 32 || c == 8 || c == 9 || c == 10 || c == 13;
}

function skipSpaces(stream/*VAR Type*/, context/*Node*/){
	while (true){
		if (Stream.read(stream, readSpaces) && skipComment(stream, context)){
		} else break;
	}
}
function Literal(s/*STRING*/){
	this.s = s;
}

function literal(l/*Literal*/, stream/*VAR Type*/, context/*Node*/){
	var result = false;
	if (Stream.peekStr(stream, l.s)){
		Stream.next(stream, l.s.length);
		if (!isLetter(l.s.charCodeAt(l.s.length - 1 | 0)) || Stream.eof(stream) || !isLetter(Stream.peekChar(stream)) && !isDigit(Stream.peekChar(stream))){
			context.handleLiteral(l.s);
			result = true;
		}
	}
	return result;
}
exports.Literal = Literal;
exports.integer = integer;
exports.real = real;
exports.point = point;
exports.string = string;
exports.ident = ident;
exports.skipSpaces = skipSpaces;
exports.literal = literal;

})(imports["js/Lexer.js"]);
imports["rtl_code.js"] = {};
(function module$rtl_code(exports){
"use strict";

// support IE8
if (!Array.prototype.indexOf)
    Array.prototype.indexOf = function(x){
        for(var i = 0; i < this.length; ++i)
            if (this[i] === x)
                return i;
        return -1;
    };

// support Function.bind
if (!Function.prototype.bind)
    Function.prototype.bind = function(thisArg){
        var self = this;
        var bindArgs = Array.prototype.slice.call(arguments, 1);
        return function(){
            return self.apply(thisArg, bindArgs.concat(Array.prototype.slice.call(arguments)));
        };
    };

function RtlCons(rtl, demandedCallback){
    this.__entries = {};
    this.__rtl = rtl;
    this.__demandedCallback = demandedCallback;

    for(var name in rtl.methods){
        this[name] = this.__makeOnDemand(name);
        this[name + "Id"] = this.__makeIdOnDemand(name);
    }
}
var rtlPrototype = {
    name: function(){return "RTL$";},
    module: function(){return this.__rtl.nodejsModule;},
    generate: function(){
        var result = "var " + this.name() + " = {\n";
        var firstEntry = true;
        for (var name in this.__entries){
            if (!firstEntry)
                result += ",\n";
            else
                firstEntry = false;
            result += "    " + name + ": " + this.__entries[name].toString();
        }
        if (!firstEntry)
            result += "\n};\n";
        else
            result = undefined;
        
        return result;
    },
    __putEntry: function(name){
        if (this.__entries[name])
            return;
        
        this.__entries[name] = this.__rtl.methods[name];
        
        var dependencies = this.__rtl.dependencies[name];
        if (dependencies)
            for(var i = 0; i < dependencies.length; ++i)
                this.__putEntry(dependencies[i]);
    },
    __makeIdOnDemand: function(name){
        return function(){
            if (this.__demandedCallback)
                this.__demandedCallback();
            this.__putEntry(name);
            return this.name() + "." + name;
        };
    },
    __makeOnDemand: function(name){
        return function(){
            var result = this[name +"Id"]() + "(";
            if (arguments.length){
                result += arguments[0];
                for(var a = 1; a < arguments.length; ++a)
                    result += ", " + arguments[a];
            }
            result += ")";
            return result;
        };
    }
};

function makeRTL(rtl, demandedCallback){
    function RTL(){
        RtlCons.apply(this, arguments);
    }

    rtl.methods.extend(RTL, rtl.base);
    for(var m in rtlPrototype)
        RTL.prototype[m] = rtlPrototype[m];
    return new RTL(rtl, demandedCallback);
}

exports.makeRTL = makeRTL;

})(imports["rtl_code.js"]);
imports["oc.js"] = {};
(function module$oc(exports){
"use strict";

var Class = require("rtl.js").Class;
var Code = require("js/Code.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Errors = require("js/Errors.js");
var LanguageContext = require("js/LanguageContext.js");
var Lexer = require("js/Lexer.js");
var makeRTL = require("rtl_code.js").makeRTL;
var Scope = require("js/Scope.js");
var Stream = require("js/Stream.js");

var CompiledModule = Class.extend({
    init: function CompiledModule(symbol, code, exports){
        this.__symbol = symbol;
        this.__code = code;
        this.__exports = exports;
    },
    symbol: function(){return this.__symbol;},
    code: function(){return this.__code;},
    exports: function(){return this.__exports;}
});

function compileModule(grammar, stream, context, handleErrors){
    Lexer.skipSpaces(stream, context);  
    try {
        if (!grammar.module(stream, context))
            throw new Errors.Error("syntax error");
    }
    catch (x) {
        if (x instanceof Errors.Error) {
            if (handleErrors){
                handleErrors("line " + Stream.lineNumber(stream) + ": " + x);
                return undefined;
            }
        }
        if (x.message)
            x.message = "internal compiler error while parsing line " + Stream.lineNumber(stream) + ": " + Stream.currentLine(stream) + "\n" + x.message;
        throw x;
    }
    var scope = context.root().currentScope();
    return new CompiledModule(
            Scope.moduleSymbol(scope),
            context.codeGenerator().result(),
            scope.exports);
}

function compileModulesFromText(
        text,
        grammar,
        contextFactory,
        resolveModule,
        handleCompiledModule,
        handleErrors){
    var stream = new Stream.Type(text);
    do {
        var context = contextFactory(resolveModule);
        var module = compileModule(grammar, stream, context, handleErrors);
        if (!module)
            return false;
        handleCompiledModule(module);
        Lexer.skipSpaces(stream, context);
    }
    while (!Stream.eof(stream));
    return true;
}

var ModuleResolver = Class.extend({
    init: function Oc$ModuleResolver(compile, handleCompiledModule, moduleReader, handleErrors){
        this.__modules = {};
        this.__compile = compile;
        this.__moduleReader = moduleReader;
        this.__handleCompiledModule = handleCompiledModule;
        this.__handleErrors = handleErrors;
        this.__detectRecursion = [];
    },
    compile: function(text){
        return this.__compile(text, this.__resolveModule.bind(this), this.__handleModule.bind(this));
    },
    __resolveModule: function(name){
        if (this.__moduleReader && !this.__modules[name]){
            if (this.__detectRecursion.indexOf(name) != -1){
                this.__handleErrors("recursive import: " + this.__detectRecursion.join(" -> "));
                return undefined;
            }
            this.__detectRecursion.push(name);

            try {
                this.compile(this.__moduleReader(name));
            }
            finally {
                this.__detectRecursion.pop();
            }
        }
        return this.__modules[name];
    },
    __handleModule: function(module){
        var symbol = module.symbol();
        var moduleName = symbol.id();
        this.__modules[moduleName] = symbol.info();
        this.__handleCompiledModule(moduleName, module.code());
    }
});

function makeResolver(grammar, contextFactory, handleCompiledModule, handleErrors, moduleReader){
    return new ModuleResolver(
        function(text, resolveModule, handleModule){
            return compileModulesFromText(
                text,
                grammar,
                contextFactory,
                resolveModule,
                handleModule,
                handleErrors);
        },
        handleCompiledModule,
        moduleReader,
        handleErrors
        );
}

function compileModules(names, moduleReader, grammar, contextFactory, handleErrors, handleCompiledModule){
    var resolver = makeResolver(grammar, contextFactory, handleCompiledModule, handleErrors, moduleReader);
    var i = 0;
    var success = true;
    while (i < names.length && success){
        success = resolver.compile(moduleReader(names[i]));
        ++i;
    }
    return success;
}

function compile(text, language, handleErrors, options, moduleReader){
    var result = "";
    var rtl = new makeRTL(language.rtl);
    var moduleCode = function(name, imports){return new Code.ModuleGenerator(name, imports);};
    var resolver = makeResolver(
            language.grammar,
            function(moduleResolver){
                return new ContextHierarchy.Root(
                    { codeTraits: language.makeCodeTraits(language.codeGenerator.make(), rtl, options),
                      moduleGenerator: moduleCode,
                      rtl: rtl,
                      types: language.types,
                      stdSymbols: language.stdSymbols,
                      moduleResolver: moduleResolver
                    });
            },
            function(name, code){result += code;},
            handleErrors,
            moduleReader
            );
    resolver.compile(text);

    var rtlCode = rtl.generate();
    if (rtlCode)
        result = rtlCode + result;
    return result;
}

exports.compileModule = compileModule;
exports.compile = compile;
exports.compileModules = compileModules;
})(imports["oc.js"]);
imports["js/ContextCase.js"] = {};
(function module$ContextCase(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ConstValue = require("js/ConstValue.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Designator = require("js/Designator.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var ExpressionTree = require("js/ExpressionTree.js");
var Record = require("js/Record.js");
var Scope = require("js/Scope.js");
var String = require("js/String.js");
var Symbols = require("js/Symbols.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "ContextCase";
RTL$.extend(Type, ContextExpression.ExpressionHandler, $scope);
function Label(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(Label, ContextHierarchy.Node, $scope);
function LabelList(){
	ContextHierarchy.Node.apply(this, arguments);
	this.glue = '';
}
RTL$.extend(LabelList, ContextHierarchy.Node, $scope);
function Range(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
	this.from = null;
	this.to = null;
	this.typeGuardHandled = false;
}
RTL$.extend(Range, ContextExpression.ExpressionHandler, $scope);
RTL$.extend(GuardedVariable, Types.DeclaredVariable, $scope);
function Type(parent/*PNode*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	this.mCodeGenerator = CodeGenerator.nullGenerator();
	this.var = '';
	this.type = null;
	this.guardVar = null;
	this.typeTest = null;
	this.firstCaseParsed = false;
}
Type.prototype.codeGenerator = function(){
	return this.mCodeGenerator;
};
Type.prototype.handleExpression = function(e/*PType*/){
	var c = 0;
	var declVar = null;
	var normExp = e;
	var type = e.type();
	if (type instanceof Types.String && Types.stringAsChar(type, {set: function($v){c = $v;}, get: function(){return c;}})){
		normExp = Expression.makeSimple(String.fromInt(c), Types.basic().ch);
	}
	else {
		var info = e.info();
		if (info instanceof Types.DeclaredVariable){
			declVar = info;
			if (!info.isReference()){
				this.var = declVar.id();
			}
		}
		if (type instanceof Types.Record || type instanceof Record.Pointer){
			var isReference = info instanceof Types.Variable && info.isReference();
			if (type instanceof Types.Record && !isReference){
				Errors.raise("only records passed as VAR argument can be used to test type in CASE");
			}
			else if (!(type instanceof Record.Pointer) || !isReference){
				this.guardVar = declVar;
			}
			this.typeTest = e;
		}
		else if (!Types.isInt(type) && type != Types.basic().ch){
			Errors.raise("'RECORD' or 'POINTER' or " + Types.intsDescription() + " or 'CHAR' expected as CASE expression");
		}
	}
	this.type = normExp.type();
	this.mCodeGenerator = this.parent().codeGenerator();
	if (this.var.length == 0){
		this.var = this.root().currentScope().generateTempVar("case");
		this.mCodeGenerator.write("var " + this.var + " = " + Expression.deref(normExp).code() + ";" + Chars.ln);
		if (this.typeTest != null){
			this.typeTest = Expression.makeSimple(this.var, type);
		}
	}
};
Type.prototype.beginCase = function(){
	if (!this.firstCaseParsed){
		this.firstCaseParsed = true;
	}
	else {
		this.codeGenerator().write("else ");
	}
};
Type.prototype.handleLabelType = function(type/*PType*/){
	if (!Cast.areTypesMatch(type, this.type)){
		Errors.raise("label must be '" + this.type.description() + "' (the same as case expression), got '" + type.description() + "'");
	}
};
LabelList.prototype.handleRange = function(from/*PInt*/, to/*PInt*/){
	var cond = '';
	var parent = RTL$.typeGuard(this.parent(), Label);
	if (this.glue.length == 0){
		parent.caseLabelBegin();
	}
	if (from != null){
		var v = RTL$.typeGuard(parent.parent(), Type).var;
		if (to == null){
			cond = v + " === " + String.fromInt(from.value);
		}
		else {
			cond = "(" + v + " >= " + String.fromInt(from.value) + " && " + v + " <= " + String.fromInt(to.value) + ")";
		}
	}
	this.codeGenerator().write(this.glue + cond);
	this.glue = " || ";
};
LabelList.prototype.endParse = function(){
	RTL$.typeGuard(this.parent(), Label).caseLabelEnd();
	return true;
};

function contextFromLabel(l/*Label*/){
	return RTL$.typeGuard(l.parent(), Type);
}
Label.prototype.caseLabelBegin = function(){
	contextFromLabel(this).beginCase();
	this.codeGenerator().write("if (");
};
Label.prototype.caseLabelEnd = function(){
	var gen = this.codeGenerator();
	gen.write(")");
	gen.openScope();
};
Label.prototype.handleTypeGuard = function(e/*PType*/, info/*PType*/){
	this.caseLabelBegin();
	var guardVar = contextFromLabel(this).guardVar;
	if (guardVar != null){
		var root = this.root();
		var scope = new Scope.Procedure(root.language().stdSymbols);
		root.pushScope(scope);
		scope.addSymbol(new Symbols.Symbol(guardVar.id(), new GuardedVariable(guardVar, info.type())), false);
	}
	this.codeGenerator().write(ExpressionTree.typeTest(e, info, this).code());
};
Label.prototype.endParse = function(){
	if (contextFromLabel(this).guardVar != null){
		this.root().popScope();
	}
	this.codeGenerator().closeScope("");
	return true;
};

function labelContext(r/*VAR Range*/){
	return RTL$.typeGuard(r.parent().parent(), Label);
}

function caseContext(r/*VAR Range*/){
	return RTL$.typeGuard(labelContext(r).parent(), Type);
}

function handleLabel(r/*VAR Range*/, type/*PType*/, v/*PInt*/){
	caseContext(r).handleLabelType(type);
	if (r.from == null){
		r.from = v;
	}
	else {
		r.to = v;
	}
}
Range.prototype.codeGenerator = function(){
	return CodeGenerator.nullGenerator();
};
Range.prototype.handleExpression = function(e/*PType*/){
	var c = 0;
	if (caseContext(this).typeTest != null){
		Errors.raise("type's name expected in label, got expression: " + e.code());
	}
	var type = e.type();
	if (type instanceof Types.String){
		if (!Types.stringAsChar(type, {set: function($v){c = $v;}, get: function(){return c;}})){
			Errors.raise("single-character string expected");
		}
		handleLabel(this, Types.basic().ch, new ConstValue.Int(c));
	}
	else {
		handleLabel(this, type, RTL$.typeGuard(e.constValue(), ConstValue.Int));
	}
};
Range.prototype.handleQIdent = function(q/*QIdent*/){
	if (this.typeGuardHandled){
		Errors.raise("cannot use diapason (..) with type guard");
	}
	var found = ContextHierarchy.getQIdSymbolAndScope(this.root(), q);
	var info = found.symbol().info();
	var typeTest = caseContext(this).typeTest;
	if (typeTest != null){
		if (info instanceof TypeId.Type){
			labelContext(this).handleTypeGuard(typeTest, info);
			this.typeGuardHandled = true;
		}
		else {
			Errors.raise("'" + q.code + "' is not a type");
		}
	}
	else if (!(info instanceof Types.Const)){
		Errors.raise("'" + q.code + "' is not a constant");
	}
	else {
		var type = info.type;
		if (type instanceof Types.String){
			this.handleExpression(Expression.makeSimple("", type));
		}
		else {
			handleLabel(this, type, RTL$.typeGuard(info.value, ConstValue.Int));
		}
	}
};
Range.prototype.endParse = function(){
	if (this.from != null){
		RTL$.typeGuard(this.parent(), LabelList).handleRange(this.from, this.to);
	}
	return true;
};
function GuardedVariable(caseVariable/*PDeclaredVariable*/, guardedType/*PStorageType*/){
	Types.DeclaredVariable.call(this);
	this.caseVariable = caseVariable;
	this.guardedType = guardedType;
}
GuardedVariable.prototype.type = function(){
	return this.guardedType;
};
GuardedVariable.prototype.isReadOnly = function(){
	return this.caseVariable.isReadOnly();
};
GuardedVariable.prototype.isReference = function(){
	return this.caseVariable.isReference();
};
GuardedVariable.prototype.id = function(){
	return this.caseVariable.id();
};
exports.Type = Type;
exports.Label = Label;
exports.LabelList = LabelList;
exports.Range = Range;

})(imports["js/ContextCase.js"]);
imports["js/ContextConst.js"] = {};
(function module$ContextConst(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var ConstValue = require("js/ConstValue.js");
var Context = require("js/Context.js");
var ContextExpression = require("js/ContextExpression.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var Symbols = require("js/Symbols.js");
var Types = require("js/Types.js");
var $scope = "ContextConst";
function Type(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
	this.id = null;
	this.type = null;
	this.value = null;
}
RTL$.extend(Type, ContextExpression.ExpressionHandler, $scope);
Type.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	this.id = id;
	this.codeGenerator().write("var " + id.id() + " = ");
};
Type.prototype.handleExpression = function(e/*PType*/){
	var value = e.constValue();
	if (value == null){
		Errors.raise("constant expression expected");
	}
	this.type = e.type();
	this.value = value;
};
Type.prototype.endParse = function(){
	var c = new Types.Const(this.type, this.value);
	this.root().currentScope().addSymbol(new Symbols.Symbol(this.id.id(), c), this.id.exported());
	this.codeGenerator().write(";" + Chars.ln);
	return true;
};
exports.Type = Type;

})(imports["js/ContextConst.js"]);
imports["js/ContextDesignator.js"] = {};
(function module$ContextDesignator(exports){
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

})(imports["js/ContextDesignator.js"]);
imports["js/ContextType.js"] = {};
(function module$ContextType(exports){
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

})(imports["js/ContextType.js"]);
imports["js/ContextIdentdef.js"] = {};
(function module$ContextIdentdef(exports){
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

})(imports["js/ContextIdentdef.js"]);
imports["js/ContextIf.js"] = {};
(function module$ContextIf(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var Types = require("js/Types.js");
var $scope = "ContextIf";
RTL$.extend(Type, ContextExpression.ExpressionHandler, $scope);

function handleIfExpression(e/*PType*/){
	var type = e.type();
	if (type != Types.basic().bool){
		Errors.raise("'BOOLEAN' expression expected, got '" + type.description() + "'");
	}
}
function Type(parent/*PNode*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	this.codeGenerator().write("if (");
}
Type.prototype.handleExpression = function(e/*PType*/){
	handleIfExpression(e);
	var gen = this.codeGenerator();
	gen.write(")");
	gen.openScope();
};
Type.prototype.handleLiteral = function(s/*STRING*/){
	var gen = this.codeGenerator();
	if (s == "ELSIF"){
		gen.closeScope("");
		gen.write("else if (");
	}
	else if (s == "ELSE"){
		gen.closeScope("");
		gen.write("else ");
		gen.openScope();
	}
};
Type.prototype.endParse = function(){
	this.codeGenerator().closeScope("");
	return true;
};
exports.Type = Type;
exports.handleIfExpression = handleIfExpression;

})(imports["js/ContextIf.js"]);
imports["js/ContextLoop.js"] = {};
(function module$ContextLoop(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ConstValue = require("js/ConstValue.js");
var Context = require("js/Context.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextIf = require("js/ContextIf.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var Operator = require("js/Operator.js");
var String = require("js/String.js");
var Types = require("js/Types.js");
var $scope = "ContextLoop";
RTL$.extend(While, ContextExpression.ExpressionHandler, $scope);
RTL$.extend(Repeat, ContextHierarchy.Node, $scope);
RTL$.extend(Until, ContextExpression.ExpressionHandler, $scope);
RTL$.extend(For, ContextExpression.ExpressionHandler, $scope);
function While(parent/*PNode*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	var gen = this.codeGenerator();
	gen.write("while (true)");
	gen.openScope();
	gen.write("if (");
}
While.prototype.handleExpression = function(e/*PType*/){
	ContextIf.handleIfExpression(e);
	var gen = this.codeGenerator();
	gen.write(")");
	gen.openScope();
};
While.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "ELSIF"){
		var gen = this.codeGenerator();
		gen.closeScope("");
		gen.write("else if (");
	}
};
While.prototype.endParse = function(){
	var gen = this.codeGenerator();
	gen.closeScope(" else break;" + Chars.ln);
	gen.closeScope("");
	return true;
};
function Repeat(parent/*PNode*/){
	ContextHierarchy.Node.call(this, parent);
	var gen = this.codeGenerator();
	gen.write("do ");
	gen.openScope();
}
function Until(parent/*PNode*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	parent.codeGenerator().closeScope(" while (");
}
Until.prototype.codeGenerator = function(){
	return CodeGenerator.nullGenerator();
};
Until.prototype.handleExpression = function(e/*PType*/){
	ContextIf.handleIfExpression(e);
	this.parent().codeGenerator().write(Operator.not(e).code());
};
Until.prototype.endParse = function(){
	this.parent().codeGenerator().write(");" + Chars.ln);
	return true;
};
function For(parent/*PNode*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	this.toExpr = new CodeGenerator.SimpleGenerator();
	this.var = '';
	this.initExprParsed = false;
	this.toParsed = false;
	this.byParsed = false;
	this.by = 1;
}
For.prototype.handleIdent = function(id/*STRING*/){
	var s = ContextHierarchy.getSymbol(this.root(), id);
	var info = s.info();
	if (!(info instanceof Types.Variable)){
		Errors.raise("'" + s.id() + "' is not a variable");
	}
	else {
		var type = info.type();
		if (type != Types.basic().integer){
			Errors.raise("'" + s.id() + "' is a '" + type.description() + "' variable, 'FOR' control variable must be 'INTEGER'");
		}
		this.doHandleInitCode(id, "for (" + id + " = ");
	}
};
For.prototype.doHandleInitCode = function(id/*STRING*/, code/*STRING*/){
	this.var = id;
	this.codeGenerator().write(code);
};
For.prototype.doHandleInitExpression = function(type/*PType*/){
	if (type != Types.basic().integer){
		Errors.raise("'INTEGER' expression expected to assign '" + this.var + "', got '" + type.description() + "'");
	}
	this.initExprParsed = true;
};
For.prototype.handleExpression = function(e/*PType*/){
	var type = e.type();
	if (!this.initExprParsed){
		this.doHandleInitExpression(type);
	}
	else if (!this.toParsed){
		if (type != Types.basic().integer){
			Errors.raise("'INTEGER' expression expected as 'TO' parameter, got '" + type.description() + "'");
		}
		this.toParsed = true;
	}
	else {
		if (type != Types.basic().integer){
			Errors.raise("'INTEGER' expression expected as 'BY' parameter, got '" + type.description() + "'");
		}
		var value = e.constValue();
		if (value == null){
			Errors.raise("constant expression expected as 'BY' parameter");
		}
		this.by = RTL$.typeGuard(value, ConstValue.Int).value;
	}
};
For.prototype.codeGenerator = function(){
	var result = null;
	if (this.initExprParsed && !this.toParsed){
		result = this.toExpr;
	}
	else if (this.toParsed && !this.byParsed){
		result = CodeGenerator.nullGenerator();
	}
	else {
		result = this.parent().codeGenerator();
	}
	return result;
};
For.prototype.endParse = function(){
	this.codeGenerator().closeScope("");
	return true;
};

function emitForBegin(cx/*VAR For*/){
	var relation = '';var step = '';
	cx.byParsed = true;
	if (cx.by < 0){
		relation = " >= ";
	}
	else {
		relation = " <= ";
	}
	if (cx.by == 1){
		step = "++" + cx.var;
	}
	else if (cx.by == -1){
		step = "--" + cx.var;
	}
	else if (cx.by < 0){
		step = cx.var + " -= " + String.fromInt(-cx.by | 0);
	}
	else {
		step = cx.var + " += " + String.fromInt(cx.by);
	}
	var s = "; " + cx.var + relation + cx.toExpr.result() + "; " + step + ")";
	var gen = cx.codeGenerator();
	gen.write(s);
	gen.openScope();
}
exports.While = While;
exports.Repeat = Repeat;
exports.Until = Until;
exports.For = For;
exports.emitForBegin = emitForBegin;

})(imports["js/ContextLoop.js"]);
imports["js/ContextModule.js"] = {};
(function module$ContextModule(exports){
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

})(imports["js/ContextModule.js"]);
imports["js/ContextProcedure.js"] = {};
(function module$ContextProcedure(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var Context = require("js/Context.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextType = require("js/ContextType.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var ExpressionTree = require("js/ExpressionTree.js");
var LanguageContext = require("js/LanguageContext.js");
var Object$ = require("js/Object.js");
var Procedure = require("js/Procedure.js");
var Scope = require("js/Scope.js");
var Symbols = require("js/Symbols.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "ContextProcedure";
RTL$.extend(Declaration, ContextType.DeclarationAndIdentHandle, $scope);
RTL$.extend(FormalParameters, ContextHierarchy.Node, $scope);
function FormalParametersProcDecl(){
	FormalParameters.apply(this, arguments);
}
RTL$.extend(FormalParametersProcDecl, FormalParameters, $scope);
function DefinedParameters(){
	ContextType.HandleSymbolAsType.apply(this, arguments);
	this.isVar = false;
	this.argNamesForType = [];
}
RTL$.extend(DefinedParameters, ContextType.HandleSymbolAsType, $scope);
function Return(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
}
RTL$.extend(Return, ContextExpression.ExpressionHandler, $scope);
RTL$.extend(AddArgumentMsg, ContextHierarchy.Message, $scope);
function EndParametersMsg(){
	ContextHierarchy.Message.call(this);
}
RTL$.extend(EndParametersMsg, ContextHierarchy.Message, $scope);
function Declaration(parent/*PNode*/){
	ContextType.DeclarationAndIdentHandle.call(this, parent);
	this.outerScope = this.root().currentScope();
	this.id = null;
	this.type = null;
	this.multipleArguments = false;
	this.returnParsed = false;
	this.scopeInfo = null;
}

function handleIdentdef(d/*VAR Declaration*/, id/*PIdentdefInfo*/){
	d.id = id;
	d.codeGenerator().write(d.doProlog());
	var root = d.root();
	root.pushScope(new Scope.Procedure(root.language().stdSymbols));
}
Declaration.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	handleIdentdef(this, id);
};
Declaration.prototype.handleIdent = function(id/*STRING*/){
	var expectId = this.id.id();
	if (expectId != id){
		Errors.raise("mismatched procedure names: '" + expectId + "' at the begining and '" + id + "' at the end");
	}
};
Declaration.prototype.doProlog = function(){
	return Chars.ln + "function " + CodeGenerator.mangleId(this.id.id()) + "(";
};
Declaration.prototype.doEpilog = function(){
	return "";
};
Declaration.prototype.doBeginBody = function(){
	var code = this.codeGenerator();
	code.openScope();
	this.scopeInfo = new ContextType.ScopeInfoGenerator(this.id.id(), code, this.parent());
};
Declaration.prototype.typeName = function(){
	return "";
};
Declaration.prototype.setType = function(type/*PStorageType*/){
	var t = RTL$.typeGuard(type, Procedure.Type);
	var id = this.id.id();
	var procSymbol = new Symbols.Symbol(id, new Procedure.Id(t, id, this.outerScope instanceof Scope.Procedure));
	this.outerScope.addSymbol(procSymbol, this.id.exported());
	this.type = t;
};

function addArgument(declaration/*VAR Declaration*/, name/*STRING*/, arg/*ProcedureArgument*/){
	if (name == declaration.id.id()){
		Errors.raise("argument '" + name + "' has the same name as procedure");
	}
	var v = declaration.doMakeArgumentVariable(arg, name);
	var s = new Symbols.Symbol(name, v);
	declaration.root().currentScope().addSymbol(s, false);
	var code = declaration.codeGenerator();
	if (declaration.multipleArguments){
		code.write(", ");
	}
	else {
		declaration.multipleArguments = true;
	}
	code.write(CodeGenerator.mangleId(name) + "/*" + arg.description() + "*/");
}
Declaration.prototype.doMakeArgumentVariable = function(arg/*ProcedureArgument*/, name/*STRING*/){
	return new Variable.ArgumentVariable(name, arg.type, arg.isVar);
};
Declaration.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (msg instanceof EndParametersMsg){
		this.codeGenerator().write(")");
		this.doBeginBody();
	}
	else if (msg instanceof AddArgumentMsg){
		RTL$.assert(msg.arg != null);
		addArgument(this, msg.name, msg.arg);
	}
	else if (ContextType.handleDescribeScopeMsg(msg, this.scopeInfo)){
	}
	else {
		result = ContextType.DeclarationAndIdentHandle.prototype.handleMessage.call(this, msg);
	}
	return result;
};
Declaration.prototype.doMakeReturnCode = function(e/*PType*/, op/*CastOp*/){
	return op.clone(ContextHierarchy.makeLanguageContext(this), e);
};
Declaration.prototype.handleReturn = function(e/*PType*/){
	var op = null;
	var type = e.type();
	var result = this.type.result();
	if (result == null){
		Errors.raise("unexpected RETURN in PROCEDURE declared with no result type");
	}
	var language = this.root().language();
	if (language.types.implicitCast(type, result, false, {set: function($v){op = $v;}, get: function(){return op;}}) != Cast.errNo){
		Errors.raise("RETURN '" + result.description() + "' expected, got '" + type.description() + "'");
	}
	this.codeGenerator().write("return " + this.doMakeReturnCode(e, op) + ";" + Chars.ln);
	this.returnParsed = true;
};
Declaration.prototype.endParse = function(){
	this.codeGenerator().closeScope(this.doEpilog());
	this.root().popScope();
	var result = this.type.result();
	if (result != null && !this.returnParsed){
		Errors.raise("RETURN expected at the end of PROCEDURE declared with '" + result.description() + "' result type");
	}
	return true;
};
function FormalParameters(parent/*PDeclarationAndIdentHandle*/){
	ContextHierarchy.Node.call(this, parent);
	this.arguments = [];
	this.type = new Procedure.Defined(parent.typeName());
	this.result = null;
	parent.setType(this.type);
}
FormalParameters.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (msg instanceof AddArgumentMsg){
		this.arguments.push(msg.arg);
	}
	else {
		result = ContextHierarchy.Node.prototype.handleMessage.call(this, msg);
	}
	return result;
};
FormalParameters.prototype.handleQIdent = function(q/*QIdent*/){
	var s = ContextHierarchy.getQIdSymbolAndScope(this.root(), q);
	var resultType = ExpressionTree.unwrapType(s.symbol().info());
	this.doCheckResultType(resultType);
	this.result = resultType;
};
FormalParameters.prototype.doCheckResultType = function(type/*PStorageType*/){
	if (!type.isScalar()){
		Errors.raise("procedure cannot return " + type.description());
	}
};
FormalParameters.prototype.endParse = function(){
	this.type.define(this.arguments, this.result);
	return true;
};
FormalParametersProcDecl.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = FormalParameters.prototype.handleMessage.call(this, msg);
	if (msg instanceof AddArgumentMsg){
		result = this.parent().handleMessage(msg);
	}
	return result;
};
FormalParametersProcDecl.prototype.endParse = function(){
	var result = FormalParameters.prototype.endParse.call(this);
	if (result){
		var void$ = this.handleMessage(new EndParametersMsg());
	}
	return result;
};
DefinedParameters.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "VAR"){
		this.isVar = true;
	}
};
DefinedParameters.prototype.handleIdent = function(id/*STRING*/){
	this.argNamesForType.push(id);
};
DefinedParameters.prototype.setType = function(type/*PStorageType*/){
	var $seq1 = this.argNamesForType;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var name = $seq1[$key2];
		var void$ = this.handleMessage(new AddArgumentMsg(name, new Types.ProcedureArgument(type, this.isVar)));
	}
	this.isVar = false;
	this.argNamesForType.splice(0, Number.MAX_VALUE);
};
Return.prototype.handleExpression = function(e/*PType*/){
	RTL$.typeGuard(this.parent(), Declaration).handleReturn(e);
};
Return.prototype.codeGenerator = function(){
	return CodeGenerator.nullGenerator();
};
function AddArgumentMsg(name/*STRING*/, arg/*PProcedureArgument*/){
	ContextHierarchy.Message.call(this);
	this.name = name;
	this.arg = arg;
}

function assertProcType(type/*PType*/, info/*PId*/){
	var unexpected = '';
	var result = null;
	if (type == null){
		unexpected = info.idType();
	}
	else if (info instanceof TypeId.Type || !(type instanceof Procedure.Type)){
		unexpected = type.description();
	}
	else {
		result = type;
	}
	if (result == null){
		Errors.raise("PROCEDURE expected, got '" + unexpected + "'");
	}
	return result;
}

function makeCall(cx/*PNode*/, type/*PType*/, info/*PId*/){
	return assertProcType(type, info).callGenerator(ContextHierarchy.makeLanguageContext(cx));
}
exports.Declaration = Declaration;
exports.FormalParameters = FormalParameters;
exports.FormalParametersProcDecl = FormalParametersProcDecl;
exports.DefinedParameters = DefinedParameters;
exports.Return = Return;
exports.AddArgumentMsg = AddArgumentMsg;
exports.EndParametersMsg = EndParametersMsg;
exports.handleIdentdef = handleIdentdef;
exports.makeCall = makeCall;

})(imports["js/ContextProcedure.js"]);
imports["js/ContextAssignment.js"] = {};
(function module$ContextAssignment(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Errors = require("js/Errors.js");
var $scope = "ContextAssignment";
function Check(){
	ContextHierarchy.Node.apply(this, arguments);
}
RTL$.extend(Check, ContextHierarchy.Node, $scope);
Check.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "="){
		Errors.raise("did you mean ':=' (statement expected, got expression)?");
	}
};

function emitEnd(cx/*Node*/){
	cx.codeGenerator().write(";" + Chars.ln);
}
exports.Check = Check;
exports.emitEnd = emitEnd;

})(imports["js/ContextAssignment.js"]);
imports["parser.js"] = {};
(function module$parser(exports){
"use strict";

var assert = require("rtl.js").assert;
var Errors = require("js/Errors.js");
var Lexer = require("js/Lexer.js");
var Stream = require("js/Stream.js");

function literal(s){
	var l = new Lexer.Literal(s);
	return function(stream, context){
		return Lexer.literal(l, stream, context);
	};
}

function implicitParser(p){
	return typeof p === "string" ? literal(p) : p;
}

function argumentsToParsers(args){
	var parsers = Array.prototype.slice.call(args);
	for(var i = 0; i < parsers.length; ++i)
		parsers[i] = implicitParser(parsers[i]);
	return parsers;
}

exports.and = function(/*...*/){
	assert(arguments.length >= 2);
	var parsers = argumentsToParsers(arguments);

	return function(stream, context){
		for(var i = 0; i < parsers.length; ++i){
			if (i)
				Lexer.skipSpaces(stream, context);
			
			var p = parsers[i];
			if (!p(stream, context))
				return false;
		}
		return true;
	};
};

exports.or = function(/*...*/){
	assert(arguments.length >= 2);
	var parsers = argumentsToParsers(arguments);

	return function(stream, context){
		for(var i = 0; i < parsers.length; ++i){
			var p = parsers[i];
			var savePos = Stream.pos(stream);
			if (p(stream, context))
				return true;
			Stream.setPos(stream, savePos);
		}
		return false;
	};
};

exports.repeat = function(p){
	return function(stream, context){
			var savePos = Stream.pos(stream);
			while (!Stream.eof(stream) && p(stream, context)){
				Lexer.skipSpaces(stream, context);
				savePos = Stream.pos(stream);
			}
			Stream.setPos(stream, savePos);
			return true;
		};
};

exports.optional = function(parser){
	assert(arguments.length == 1);
	var p = implicitParser(parser);

	return function(stream, context){
		var savePos = Stream.pos(stream);
		if ( !p(stream, context))
			Stream.setPos(stream, savePos);
		return true;
		};
};

exports.required = function(parserOrString, error){
	var parser = implicitParser(parserOrString);
	
	return function(stream, context){
		if (!parser(stream, context))
			throw new Errors.Error(error 
					? error 
					: ("'" + parserOrString + "' expected"));
		return true;
	};
};

exports.context = function(parser, ContextFactory){
	return function(stream, child){
		var context = new ContextFactory(child);
		if (!parser(stream, context))
			return false;
		if (context.endParse)
			return context.endParse() !== false;
		return true;
	};
};

exports.emit = function(parser, action){
	assert(action);
	var p = implicitParser(parser);

	return function(stream, context){
		if (!p(stream, context))
			return false;
		action(context);
		return true;
	};
};

exports.literal = literal;
})(imports["parser.js"]);
imports["grammar.js"] = {};
(function module$grammar(exports){
"use strict";

var ContextAssignment = require("js/ContextAssignment.js");
var ContextCase = require("js/ContextCase.js");
var ContextDesignator = require("js/ContextDesignator.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextIdentdef = require("js/ContextIdentdef.js");
var ContextLoop = require("js/ContextLoop.js");
var ContextModule = require("js/ContextModule.js");
var ContextProcedure = require("js/ContextProcedure.js");
var ContextType = require("js/ContextType.js");
var Lexer = require("js/Lexer.js");
var Parser = require("parser.js");

var literal = Parser.literal;
var point = Lexer.point;

var and = Parser.and;
var or = Parser.or;
var optional = Parser.optional;
var repeat = Parser.repeat;

var context = Parser.context;
var emit = Parser.emit;
var required = Parser.required;

var reservedWords = ["ARRAY", "IMPORT", "THEN", "BEGIN", "IN", "TO", "BY", "IS", "TRUE", "CASE", "MOD", "TYPE", "CONST", 
                     "MODULE", "UNTIL", "DIV", "NIL", "VAR", "DO", "OF", "WHILE", "ELSE", "OR", "ELSIF", "POINTER", "END", 
                     "PROCEDURE", "FALSE", "RECORD", "FOR", "REPEAT", "IF", "RETURN"];

function make(makeIdentdef,
              makeDesignator,
              makeExpression,
              makeStrucType,
              makeStatement,
              makeProcedureHeading, 
              makeProcedureDeclaration,
              makeFieldList,
              makeFieldListSequence,
              makeForInit,
              makeArrayDimensions,
              makeFormalArray,
              makeFormalResult,
              makeReturn,
              makeSet,
              contexts,
              reservedWords
              ){
var result = {};

var ident = function(stream, context){
    return Lexer.ident(stream, context, reservedWords);
};

var qualident = context(and(optional(context(and(ident, "."), ContextIdentdef.QualifiedModule)), ident),
                        ContextIdentdef.Qualified);
var identdef = makeIdentdef(ident);

var selector = or(and(point, ident)
                // break recursive declaration of expList
                , and("[", function(stream, context){return expList(stream, context);}, "]")
                , "^"
                , context(and("(", qualident, ")"), ContextDesignator.TypeCast)
                );
var designator = makeDesignator(
        ident,
        qualident, 
        selector,
        // break recursive declaration of actualParameters
        function(stream, context){return actualParameters(stream, context);}
        );
var type = or(qualident,
              function(stream, context){return strucType(stream, context);} // break recursive declaration of strucType
             );
var identList = and(identdef, repeat(and(",", identdef)));
var variableDeclaration = context(and(identList, ":", type), contexts.variableDeclaration);

var integer = context(Lexer.integer, ContextExpression.Integer);
var real = context(Lexer.real, ContextExpression.Real);
var number = or(real, integer);
var string = context(Lexer.string, ContextExpression.Str);

var factor = context(
    or(string, 
       number, 
       "NIL", 
       "TRUE", 
       "FALSE",
       function(stream, context){return set(stream, context);}, // break recursive declaration of set
       designator.factor,
       and("(", function(stream, context){return expression(stream, context);}
         , required(")", "no matched ')'")),
       and("~", function(stream, context){
                    return factor(stream, context);}) // break recursive declaration of factor
     )
    , ContextExpression.Factor);

var addOperator = context(or("+", "-", "OR"), ContextExpression.AddOperator);
var mulOperator = context(or("*", "/", "DIV", "MOD", "&"), ContextExpression.MulOperator);
var term = context(and(factor, repeat(and(mulOperator, required(factor, "invalid operand")))), ContextExpression.Term);
var simpleExpression = context(
        and(optional(or("+", "-"))
          , term
          , repeat(and(addOperator, required(term, "invalid operand"))))
      , ContextExpression.SimpleExpression);
var relation = or("=", "#", "<=", "<", ">=", ">", "IN", "IS");
var expression = makeExpression(and(simpleExpression, optional(and(relation, required(simpleExpression, "invalid operand")))));
var constExpression = expression;

var set = makeSet(expression);

var expList = and(expression, repeat(and(",", expression)));
var actualParameters = and("(", context(optional(expList), ContextDesignator.ActualParameters), ")");

var assignment = and(context(or(":=", "="), ContextAssignment.Check),
                     required(expression, "expression expected"));

// break recursive declaration of statement
var forwardStatement = function(stream, context){return statement(stream, context);};
var statementSequence = and(forwardStatement, repeat(and(";", forwardStatement)));

var ifStatement = and("IF", context(and(expression, required("THEN", "THEN expected"), statementSequence,
                                        repeat(and("ELSIF", expression, required("THEN", "THEN expected"), statementSequence)),
                                        optional(and("ELSE", statementSequence)),
                                        "END"), 
                                    contexts.If));

var label = or(integer, string, qualident);
var labelRange = context(and(label, optional(and("..", label))), ContextCase.Range);
var caseLabelList = context(and(labelRange, repeat(and(",", labelRange))), ContextCase.LabelList);
var caseParser = optional(context(and(caseLabelList, ":", statementSequence), contexts.CaseLabel));
var caseStatement = and("CASE", context(and(expression
                      , "OF", caseParser, repeat(and("|", caseParser)), "END")
                      , ContextCase.Type));

var whileStatement = and("WHILE", 
                         context(and(expression, "DO", statementSequence, 
                                     repeat(and("ELSIF", expression, "DO", statementSequence)),
                                     "END"),
                                 contexts.While));
var repeatStatement = and("REPEAT", 
                          context(and(statementSequence, 
                                      "UNTIL", 
                                      context(expression, ContextLoop.Until)), 
                                  contexts.Repeat));

var forStatement = and("FOR", 
                       context(and(makeForInit(ident, expression, assignment), "TO", expression
                                 , optional(and("BY", constExpression))
                                 , emit("DO", ContextLoop.emitForBegin)
                                 , statementSequence, required("END", "END expected (FOR)"))
                             , contexts.For));

var statement = optional(
    makeStatement(or( emit(designator.assignmentOrProcedureCall(assignment, expression), ContextAssignment.emitEnd),
                      ifStatement,
                      caseStatement,
                      whileStatement,
                      repeatStatement,
                      forStatement), 
                  statementSequence,
                  ident,
                  expression));

var fieldList = makeFieldList(
        identdef,
        identList,
        type,
        function(stream, context){return formalParameters(stream, context);}
        );
var fieldListSequence = makeFieldListSequence(and(fieldList, repeat(and(";", fieldList))));

var arrayType = and("ARRAY", 
                    context(and(makeArrayDimensions(constExpression), "OF", type), 
                            contexts.ArrayDecl));

var baseType = context(qualident, ContextType.RecordBase);
var recordType = and("RECORD", context(and(optional(and("(", baseType, ")")), optional(fieldListSequence)
                                     , "END"), contexts.recordDecl));

var pointerType = and("POINTER", "TO", context(type, ContextType.Pointer));

var formalType = context(and(repeat(makeFormalArray()), qualident), contexts.FormalType);
var fpSection = and(optional("VAR"), ident, repeat(and(",", ident)), ":", formalType);
var formalParameters = and(
          "("
        , optional(context(and(fpSection, repeat(and(";", fpSection))), ContextProcedure.DefinedParameters))
        , required( ")" )
        , optional(makeFormalResult(and(":", qualident), ident, actualParameters)));

var procedureType = and("PROCEDURE"
                      , context(optional(formalParameters), contexts.FormalParameters)
                        );
var strucType = makeStrucType(or(arrayType, recordType, pointerType, procedureType), type);
var typeDeclaration = context(and(identdef, "=", strucType), contexts.typeDeclaration);

var constantDeclaration = context(and(identdef, "=", constExpression), contexts.constDeclaration);

var imprt = and(ident, optional(and(":=", ident)));
var importList = and("IMPORT", imprt, repeat(and(",", imprt)));

result.expression = expression;
result.statement = statement;
result.typeDeclaration = typeDeclaration;
result.variableDeclaration = variableDeclaration;
var procedureHeading = makeProcedureHeading(ident, identdef, formalParameters);
result.ident = ident;
result.procedureDeclaration
    // break recursive declaration of procedureBody
    = makeProcedureDeclaration(
        ident,
        procedureHeading,
        function(stream, context){
            return result.procedureBody(stream, context);}
    );
result.declarationSequence
    = and(optional(and("CONST", repeat(and(constantDeclaration, required(";"))))),
          optional(and("TYPE", context(repeat(and(typeDeclaration, required(";"))), ContextType.Section))),
          optional(and("VAR", repeat(and(variableDeclaration, required(";"))))),
          repeat(and(result.procedureDeclaration, ";")));
result.procedureBody
    = and(result.declarationSequence,
          optional(and("BEGIN", statementSequence)),
          optional(context(makeReturn(and("RETURN", expression)), ContextProcedure.Return)),
          required("END", "END expected (PROCEDURE)"));
result.module
    = context(and("MODULE", ident, ";",
                  context(optional(and(importList, ";")), ContextModule.Import),
                  result.declarationSequence,
                  optional(and("BEGIN", statementSequence)),
                  required("END", "END expected (MODULE)"), ident, point),
              contexts.ModuleDeclaration);
return result;
}

function makeSet(expression){
    var element = context(and(expression, optional(and("..", expression))), ContextExpression.SetElement);
    return and("{", context(optional(and(element, repeat(and(",", element)))), ContextExpression.Set), "}");
}

exports.make = make;
exports.reservedWords = reservedWords;
exports.makeSet = makeSet;
})(imports["grammar.js"]);
imports["js/OberonContext.js"] = {};
(function module$OberonContext(exports){
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

})(imports["js/OberonContext.js"]);
imports["js/OberonContextType.js"] = {};
(function module$OberonContextType(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var ContextType = require("js/ContextType.js");
var R = require("js/Record.js");
var ScopeBase = require("js/ScopeBase.js");
var $scope = "OberonContextType";
RTL$.extend(Record, ContextType.Record, $scope);

function recordTypeFactory(name/*STRING*/, cons/*STRING*/, scope/*PType*/){
	return new R.Type(name, cons, scope);
}
function Record(parent/*PDeclaration*/){
	ContextType.Record.call(this, parent, recordTypeFactory);
}
exports.Record = Record;

})(imports["js/OberonContextType.js"]);
imports["js/ContextVar.js"] = {};
(function module$ContextVar(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var Context = require("js/Context.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextType = require("js/ContextType.js");
var Errors = require("js/Errors.js");
var Object$ = require("js/Object.js");
var Symbols = require("js/Symbols.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "ContextVar";
function Declaration(){
	ContextType.DeclarationAndIdentHandle.apply(this, arguments);
	this.idents = [];
	this.type = null;
}
RTL$.extend(Declaration, ContextType.DeclarationAndIdentHandle, $scope);
Declaration.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	this.idents.push(id);
};
Declaration.prototype.typeName = function(){
	return "";
};
Declaration.prototype.setType = function(type/*PStorageType*/){
	this.type = type;
};
Declaration.prototype.exportField = function(name/*STRING*/){
	ContextType.checkIfFieldCanBeExported(name, this.idents, "variable");
};
Declaration.prototype.isAnonymousDeclaration = function(){
	return true;
};
Declaration.prototype.handleMessage = function(msg/*VAR Message*/){
	if (msg instanceof ContextType.ForwardTypeMsg){
		Errors.raise("type '" + msg.id + "' was not declared");
	}
	return ContextType.DeclarationAndIdentHandle.prototype.handleMessage.call(this, msg);
};
Declaration.prototype.doInitCode = function(){
	return this.type.initializer(this);
};
Declaration.prototype.endParse = function(){
	var gen = this.codeGenerator();
	var $seq1 = this.idents;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var id = $seq1[$key2];
		var varName = id.id();
		var scope = this.root().currentScope();
		var v = new Variable.Declared(varName, this.type, scope);
		scope.addSymbol(new Symbols.Symbol(varName, v), id.exported());
		gen.write("var " + CodeGenerator.mangleId(varName) + " = " + this.doInitCode() + ";");
	}
	gen.write(Chars.ln);
	return true;
};
exports.Declaration = Declaration;

})(imports["js/ContextVar.js"]);
imports["js/OberonContextVar.js"] = {};
(function module$OberonContextVar(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var ContextVar = require("js/ContextVar.js");
var Errors = require("js/Errors.js");
var Types = require("js/Types.js");
var $scope = "OberonContextVar";
function Declaration(){
	ContextVar.Declaration.apply(this, arguments);
}
RTL$.extend(Declaration, ContextVar.Declaration, $scope);
exports.Declaration = Declaration;

})(imports["js/OberonContextVar.js"]);
imports["js/OberonSymbols.js"] = {};
(function module$OberonSymbols(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Procedure = require("js/Procedure.js");
var Scope = require("js/Scope.js");
var Symbols = require("js/Symbols.js");

function makeStd(){
	var result = Scope.makeStdSymbols();
	var proc = Procedure.makeLen(Procedure.lenArgumentCheck);
	result[proc.id()] = proc;
	return RTL$.clone(result, {map: null}, undefined);
}
exports.makeStd = makeStd;

})(imports["js/OberonSymbols.js"]);
imports["oberon/oberon_grammar.js"] = {};
(function module$oberon_grammar(exports){
"use strict";

var Cast = require("js/Cast.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ContextCase = require("js/ContextCase.js");
var ContextConst = require("js/ContextConst.js");
var ContextDesignator = require("js/ContextDesignator.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextIdentdef = require("js/ContextIdentdef.js");
var ContextIf = require("js/ContextIf.js");
var ContextLoop = require("js/ContextLoop.js");
var ContextModule = require("js/ContextModule.js");
var ContextProcedure = require("js/ContextProcedure.js");
var ContextType = require("js/ContextType.js");
var Grammar = require("grammar.js");
var LanguageContext = require("js/LanguageContext.js");
var OberonContext = require("js/OberonContext.js");
var OberonContextType = require("js/OberonContextType.js");
var OberonContextVar = require("js/OberonContextVar.js");
var ObRtl = require("js/OberonRtl.js");
var ObRtlCode = require("rtl.js");
var Operator = require("js/Operator.js");
var Parser = require("parser.js");
var Record = require("js/Record.js");
var Symbols = require("js/OberonSymbols.js");
var Types = require("js/Types.js");

var and = Parser.and;
var context = Parser.context;
var optional = Parser.optional;
var or = Parser.or;
var repeat = Parser.repeat;

function makeStrucType(base){
    return base;
}

function makeStatement(base){
    return base;
}

function makeProcedureHeading(ident, identdef, formalParameters){
    return and("PROCEDURE"
             , identdef
             , context(optional(formalParameters), ContextProcedure.FormalParametersProcDecl));
}

function makeAssignmentOrProcedureCall(designator, actualParameters, assignment){
    return or(context(and(designator, assignment), 
                      OberonContext.Assignment),
              context(and(designator, optional(actualParameters)), 
                      OberonContext.StatementProcedureCall)
              );
}

function makeIdentdef(ident){
    return context(and(ident, optional("*")), ContextIdentdef.Type);
}

function makeDesignator(ident, qualident, selector, actualParameters){
    var designator = context(and(qualident, repeat(selector)), ContextDesignator.Type);
    return { 
        factor: context(and(designator, optional(actualParameters)), OberonContext.ExpressionProcedureCall),
        assignmentOrProcedureCall: function(assignment){
            return makeAssignmentOrProcedureCall(designator, actualParameters, assignment);
        }
    };
}

function makeExpression(base){
    return context(base, ContextExpression.ExpressionNode);
}

function makeProcedureDeclaration(ident, procedureHeading, procedureBody){
    return context(and(procedureHeading, ";",
                       procedureBody,
                       ident),
                   ContextProcedure.Declaration);
}

function makeFieldList(identdef, identList, type){
    return context(and(identList, ":", type), ContextType.FieldList);
}

function makeFieldListSequence(base){
    return base;
}

function makeForInit(ident, expression, assignment){
    return and(ident, assignment);
}

function makeArrayDimensions(constExpression){
    return context(and(constExpression, repeat(and(",", constExpression))), 
                   ContextType.ArrayDimensions);
}

function makeFormalArray(){
    return and("ARRAY", "OF");
}

function makeFormalResult(base){
    return base;
}

function makeReturn(base){return base;}

exports.language = {
    grammar: Grammar.make(
        makeIdentdef,
        makeDesignator,
        makeExpression,
        makeStrucType,
        makeStatement,
        makeProcedureHeading,
        makeProcedureDeclaration,
        makeFieldList,
        makeFieldListSequence,
        makeForInit,
        makeArrayDimensions,
        makeFormalArray,
        makeFormalResult,
        makeReturn,
        Grammar.makeSet,
        {
            constDeclaration:   ContextConst.Type, 
            typeDeclaration:    ContextType.Declaration,
            recordDecl:         OberonContextType.Record,
            variableDeclaration: OberonContextVar.Declaration,
            ArrayDecl:          ContextType.Array,
            FormalParameters:   ContextProcedure.FormalParameters,
            FormalType:         ContextType.FormalType,
            For:                ContextLoop.For,
            While:              ContextLoop.While,
            If:                 ContextIf.Type,
            CaseLabel:          ContextCase.Label,
            Repeat:             ContextLoop.Repeat,
            ModuleDeclaration:  ContextModule.Declaration
        },
        Grammar.reservedWords
        ),
    stdSymbols: Symbols.makeStd(),
    types: {
        implicitCast: function(from, to, toVar, op){
            return Cast.implicit(from, to, toVar, Operator.castOperations(), op);
        },
        typeInfo: function(type){return Record.generateTypeInfo(type);},
        isRecursive: function(type, base){return ContextType.isTypeRecursive(type, base);},
        makeStaticArray: function(type, init, length){ return new Types.StaticArray(init, type, length); },
        makeOpenArray: function(type){return new Types.OpenArray(type); }
    },
    codeGenerator: {
        make: function(){ return new CodeGenerator.Generator(); },
        nil: CodeGenerator.nullGenerator()
    },
    makeCodeTraits: function(codeGenerator, rtl, options){
        return new LanguageContext.CodeTraits(codeGenerator, rtl, options && options.checkIndexes); 
    },
    rtl: {
        base: ObRtl.Type,
        methods: ObRtlCode.rtl.methods,
        dependencies: ObRtlCode.rtl.dependencies,
        nodejsModule: ObRtlCode.rtl.nodejsModule
    }
};



})(imports["oberon/oberon_grammar.js"]);
imports["js/EberonRtl.js"] = {};
(function module$EberonRtl(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var OberonRtl = require("js/OberonRtl.js");
var $scope = "EberonRtl";
function Type(){
	OberonRtl.Type.call(this);
}
RTL$.extend(Type, OberonRtl.Type, $scope);
exports.Type = Type;

})(imports["js/EberonRtl.js"]);
imports["js/EberonString.js"] = {};
(function module$EberonString(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Types = require("js/Types.js");
var $scope = "EberonString";
function ElementVariable(){
	Types.Variable.call(this);
}
RTL$.extend(ElementVariable, Types.Variable, $scope);
var string = null;
ElementVariable.prototype.idType = function(){
	return "string element";
};
ElementVariable.prototype.isReadOnly = function(){
	return true;
};
ElementVariable.prototype.type = function(){
	return Types.basic().ch;
};
ElementVariable.prototype.isReference = function(){
	return false;
};

function makeElementVariable(){
	return new ElementVariable();
}
string = new Types.BasicType("STRING", "''");
exports.string = function(){return string;};
exports.makeElementVariable = makeElementVariable;

})(imports["js/EberonString.js"]);
imports["js/EberonContext.js"] = {};
(function module$EberonContext(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Context = require("js/Context.js");
var ContextConst = require("js/ContextConst.js");
var Errors = require("js/Errors.js");
var $scope = "EberonContext";
RTL$.extend(IdentdefInfo, Context.IdentdefInfo, $scope);
function ConstDeclaration(){
	ContextConst.Type.apply(this, arguments);
}
RTL$.extend(ConstDeclaration, ContextConst.Type, $scope);
IdentdefInfo.prototype.isReadOnly = function(){
	return this.ro;
};
function IdentdefInfo(id/*STRING*/, exported/*BOOLEAN*/, ro/*BOOLEAN*/){
	Context.IdentdefInfo.call(this, id, exported);
	this.ro = ro;
}

function checkOrdinaryExport(id/*IdentdefInfo*/, hint/*STRING*/){
	if (id.isReadOnly()){
		Errors.raise(hint + " cannot be exported as read-only using '-' mark (did you mean '*'?)");
	}
}
ConstDeclaration.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	checkOrdinaryExport(RTL$.typeGuard(id, IdentdefInfo), "constant");
	ContextConst.Type.prototype.handleIdentdef.call(this, id);
};
exports.IdentdefInfo = IdentdefInfo;
exports.ConstDeclaration = ConstDeclaration;
exports.checkOrdinaryExport = checkOrdinaryExport;

})(imports["js/EberonContext.js"]);
imports["js/EberonTypes.js"] = {};
(function module$EberonTypes(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Context = require("js/Context.js");
var LanguageContext = require("js/LanguageContext.js");
var Procedure = require("js/Procedure.js");
var Record = require("js/Record.js");
var Types = require("js/Types.js");
var $scope = "EberonTypes";
RTL$.extend(MethodType, Procedure.Std, $scope);
function MethodVariable(){
	Types.ProcedureId.apply(this, arguments);
}
RTL$.extend(MethodVariable, Types.ProcedureId, $scope);
RTL$.extend(MethodField, Types.Field, $scope);
MethodType.prototype.designatorCode = function(id/*STRING*/){
	return id;
};
MethodType.prototype.procType = function(){
	return this.type;
};
MethodType.prototype.description = function(){
	return "method '" + this.name + "'";
};
MethodType.prototype.callGenerator = function(cx/*PType*/){
	return this.call(cx, this.type);
};
function MethodType(id/*STRING*/, t/*PType*/, call/*CallGenerator*/){
	Procedure.Std.call(this, id, null);
	this.type = null;
	this.call = null;
	this.type = t;
	this.call = call;
}
MethodVariable.prototype.idType = function(){
	return this.type.description();
};
MethodVariable.prototype.canBeReferenced = function(){
	return false;
};
function MethodField(method/*PMethod*/){
	Types.Field.call(this);
	this.method = method;
}
MethodField.prototype.id = function(){
	return this.method.name;
};
MethodField.prototype.exported = function(){
	return false;
};
MethodField.prototype.type = function(){
	return this.method;
};
MethodField.prototype.asVar = function(leadCode/*STRING*/, isReadOnly/*BOOLEAN*/, cx/*Type*/){
	return new MethodVariable(this.method);
};
MethodField.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	return new Types.FieldCode(leadCode + "." + Record.mangleField(this.method.name), "", "");
};
exports.MethodType = MethodType;
exports.MethodVariable = MethodVariable;
exports.MethodField = MethodField;

})(imports["js/EberonTypes.js"]);
imports["js/EberonRecord.js"] = {};
(function module$EberonRecord(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var Chars = require("js/Chars.js");
var Context = require("js/Context.js");
var EberonContext = require("js/EberonContext.js");
var EberonTypes = require("js/EberonTypes.js");
var Errors = require("js/Errors.js");
var JS = GLOBAL;
var Object$ = require("js/Object.js");
var Procedure = require("js/Procedure.js");
var Base = require("js/Record.js");
var Scope = require("js/Scope.js");
var ScopeBase = require("js/ScopeBase.js");
var String = require("js/String.js");
var Types = require("js/Types.js");
var $scope = "EberonRecord";
var instantiateForVar = 0;
var instantiateForNew = 1;
var instantiateForCopy = 2;
function MethodIds(){
	this.ids = [];
}
MethodIds.prototype.$scope = $scope;
RTL$.extend(Record, Base.Type, $scope);
RTL$.extend(Field, Base.Field, $scope);
RTL$.extend(FieldAsMethod, Base.Field, $scope);

function assertNotReadOnly(isReadObly/*BOOLEAN*/, method/*STRING*/, class$/*STRING*/){
	if (isReadObly){
		Errors.raise("method '" + method + "' cannot be applied to non-VAR " + class$);
	}
}

function cannotInstantiateErrMsg(r/*Record*/){
	return "cannot instantiate '" + r.name + "' because it has abstract method(s)";
}

function hasMethodDefinition(r/*PRecord*/, id/*STRING*/){
	var type = r;
	while (true){
		if (type != null && type.definedMethods.indexOf(id) == -1){
			type = RTL$.typeGuard(type.base, Record);
		} else break;
	}
	return type != null;
}

function findMethodDeclaration(r/*PRecord*/, id/*STRING*/){
	var result = null;
	var type = r;
	while (true){
		if (type != null && result == null){
			if (Object.prototype.hasOwnProperty.call(type.declaredMethods, id)){
				result = RTL$.getMappedValue(type.declaredMethods, id);
			}
			else {
				type = RTL$.typeGuard(type.base, Record);
			}
		} else break;
	}
	return result;
}

function doesBaseHasNotExportedMethod(r/*Record*/, id/*STRING*/){
	var type = RTL$.typeGuard(r.base, Record);
	while (true){
		if (type != null && type.nonExportedMethods.indexOf(id) == -1){
			type = RTL$.typeGuard(type.base, Record);
		} else break;
	}
	return type != null;
}

function ensureMethodDefinitionsForEach(key/*STRING*/, ids/*ARRAY OF STRING*/, r/*PRecord*/, result/*VAR ARRAY * OF STRING*/){
	var report = [];
	var $seq1 = ids;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var m = $seq1[$key2];
		if (!hasMethodDefinition(r, m)){
			report.push(m);
		}
	}
	if (report.length != 0){
		result.push(key + ": " + String.join(report, ", "));
	}
}

function ensureMethodDefinitions(r/*PRecord*/, reasons/*MAP OF PMethodIds*/){
	var result = [];
	var $seq1 = reasons;
	for(var k in $seq1){
		var v = $seq1[k];
		ensureMethodDefinitionsForEach(k, v.ids, r, result);
	}
	if (result.length != 0){
		Errors.raise(String.join(result, "; "));
	}
}

function requireMethodDefinition(r/*PRecord*/, id/*STRING*/, reason/*STRING*/){
	var existingIds = null;
	var reasons = {};
	
	function makeIds(){
		var result = new MethodIds();
		result.ids.push(id);
		return result;
	}
	
	function addIfNotThere(ids/*VAR ARRAY * OF STRING*/){
		if (ids.indexOf(id) == -1){
			ids.push(id);
		}
	}
	if (findMethodDeclaration(r, id) == null){
		Errors.raise("there is no method '" + id + "' in base type(s)");
	}
	if (r.finalized){
		reasons[reason] = makeIds();
		ensureMethodDefinitions(r, reasons);
	}
	else {
		if (!Object.prototype.hasOwnProperty.call(r.lazyDefinitions, reason)){
			r.lazyDefinitions[reason] = makeIds();
		}
		else {
			addIfNotThere(RTL$.getMappedValue(r.lazyDefinitions, reason).ids);
		}
	}
}

function ensureNonAbstract(r/*PRecord*/){
	
	function require(declaredMethods/*MAP OF PField*/, base/*PRecord*/){
		var $seq1 = declaredMethods;
		for(var k in $seq1){
			var v = $seq1[k];
			if (!hasMethodDefinition(r, k)){
				requireMethodDefinition(base, k, cannotInstantiateErrMsg(r));
			}
		}
	}
	if (r.abstractMethods.length != 0){
		Errors.raise(cannotInstantiateErrMsg(r) + ": " + String.join(r.abstractMethods, ", "));
	}
	var baseType = RTL$.typeGuard(r.base, Record);
	while (true){
		if (baseType != null){
			if (!baseType.finalized){
				require(baseType.declaredMethods, baseType);
			}
			baseType = RTL$.typeGuard(baseType.base, Record);
		} else break;
	}
}

function ensureVariableCanBeDeclared(r/*PRecord*/){
	var type = r;
	while (true){
		if (type != null){
			if (type.createByNewOnly){
				Errors.raise("cannot declare a variable of type '" + type.name + "' (and derived types) " + "because SELF(POINTER) was used in its method(s)");
			}
			type = RTL$.typeGuard(type.base, Record);
		} else break;
	}
}
function FieldAsMethod(identdef/*PIdentdefInfo*/, type/*PProcedure*/){
	Base.Field.call(this, identdef, type);
}
FieldAsMethod.prototype.asVar = function(leadCode/*STRING*/, isReadOnly/*BOOLEAN*/, cx/*Type*/){
	return new EberonTypes.MethodVariable(RTL$.typeGuard(this.type(), Types.Procedure));
};

function constructor(r/*Record*/){
	var result = r.customConstructor;
	if (result == null && r.base != null){
		result = constructor(RTL$.typeGuard(r.base, Record));
	}
	return result;
}

function hasParameterizedConstructor(r/*Record*/){
	var c = constructor(r);
	return c != null && c.args().length != 0;
}

function canBeCreatedInAnotherModule(r/*Record*/){
	return r.customConstructor == null || r.customConstructorExported;
}

function canBeCreatedInContext(cx/*Type*/, r/*Record*/){
	return cx.qualifyScope(r.scope).length == 0 || canBeCreatedInAnotherModule(r);
}
Record.prototype.setBase = function(type/*PType*/){
	if (type.scope != this.scope && this.scope instanceof Scope.Module && !canBeCreatedInAnotherModule(RTL$.typeGuard(type, Record))){
		Errors.raise("cannot extend '" + type.name + "' - its constructor was not exported");
	}
	Base.Type.prototype.setBase.call(this, type);
};

function ensureCanBeInstantiated(cx/*Type*/, r/*PRecord*/, type/*INTEGER*/){
	if (r.finalized){
		ensureNonAbstract(r);
		if (type != instantiateForCopy && !canBeCreatedInContext(cx, r)){
			Errors.raise("cannot instantiate '" + r.name + "' - its constructor was not exported");
		}
		if (type != instantiateForNew){
			ensureVariableCanBeDeclared(r);
		}
	}
	else {
		r.instantiated = true;
		if (type != instantiateForNew){
			r.declaredAsVariable = true;
		}
	}
}
Record.prototype.codeForNew = function(cx/*Type*/){
	if (hasParameterizedConstructor(this)){
		Errors.raise("cannot use procedure NEW for '" + this.name + "' because it has constructor with parameters, use operator NEW instead");
	}
	return Base.Type.prototype.codeForNew.call(this, cx);
};
Record.prototype.initializer = function(cx/*Type*/){
	ensureCanBeInstantiated(cx, this, instantiateForNew);
	return Base.Type.prototype.initializer.call(this, cx);
};
Record.prototype.findSymbol = function(id/*STRING*/){
	var result = findMethodDeclaration(this, id);
	if (result == null){
		result = Base.Type.prototype.findSymbol.call(this, id);
	}
	return result;
};
Record.prototype.addField = function(f/*PField*/){
	var id = f.id();
	if (findMethodDeclaration(this, id) != null){
		Errors.raise("cannot declare field, record already has method '" + id + "'");
	}
	else if (doesBaseHasNotExportedMethod(this, id)){
		Errors.raise("cannot declare field, record already has method '" + id + "' in the base record (was not exported)");
	}
	var type = f.type();
	if (type instanceof Record && type.customConstructor != null && type.customConstructor.args().length != 0){
		this.customInitedfields.push(id);
	}
	this.fieldsInitOrder.push(id);
	Base.Type.prototype.addField.call(this, f);
};
Record.prototype.addMethod = function(methodId/*PIdentdefInfo*/, type/*PProcedure*/){
	var msg = '';
	var id = methodId.id();
	var existingField = this.findSymbol(id);
	if (existingField != null){
		if (existingField.type() instanceof EberonTypes.MethodType){
			msg = "cannot declare a new method '" + id + "': method already was declared";
		}
		else {
			msg = "cannot declare method, record already has field '" + id + "'";
		}
		Errors.raise(msg);
	}
	else if (doesBaseHasNotExportedMethod(this, id)){
		Errors.raise("cannot declare a new method '" + id + "': " + "method already was declared in the base record (but was not exported)");
	}
	this.declaredMethods[id] = new FieldAsMethod(methodId, type);
	if (!methodId.exported()){
		this.nonExportedMethods.push(id);
	}
};
Record.prototype.defineMethod = function(methodId/*PIdentdefInfo*/, type/*PMethodType*/){
	var existingType = null;
	var id = methodId.id();
	if (this.definedMethods.indexOf(id) != -1){
		Errors.raise("method '" + this.name + "." + id + "' already defined");
	}
	var existingField = this.findSymbol(id);
	if (existingField != null){
		var t = existingField.type();
		if (t instanceof EberonTypes.MethodType){
			existingType = t.procType();
		}
	}
	if (existingType == null){
		Errors.raise("'" + this.name + "' has no declaration for method '" + id + "'");
	}
	var addType = type.procType();
	if (!Cast.areProceduresMatch(existingType, addType)){
		Errors.raise("overridden method '" + id + "' signature mismatch: should be '" + existingType.description() + "', got '" + addType.description() + "'");
	}
	this.definedMethods.push(id);
};
Record.prototype.requireNewOnly = function(){
	this.createByNewOnly = true;
};
Record.prototype.setBaseConstructorCallCode = function(code/*STRING*/){
	this.baseConstructorCallCode = code;
};
Record.prototype.setFieldInitializationCode = function(field/*STRING*/, code/*STRING*/){
	var index = this.fieldsInitOrder.indexOf(field);
	if (index < this.lastFieldInit){
		Errors.raise("field '" + field + "' must be initialized before '" + this.fieldsInitOrder[this.lastFieldInit] + "'");
	}
	else {
		this.lastFieldInit = index;
	}
	this.fieldsInit[field] = code;
};
Record.prototype.setRecordInitializationCode = function(baseConstructorCallCode/*STRING*/){
	this.baseConstructorCallCode = baseConstructorCallCode;
};
Record.prototype.declareConstructor = function(type/*PType*/, exported/*BOOLEAN*/){
	if (this.customConstructor != null){
		Errors.raise("constructor '" + this.name + "' already declared");
	}
	if (type.result() != null){
		Errors.raise("constructor '" + this.name + "' cannot have result type specified");
	}
	this.customConstructor = type;
	this.customConstructorExported = exported;
};
Record.prototype.defineConstructor = function(type/*PType*/){
	if (this.customConstructor == null){
		Errors.raise("constructor was not declared for '" + this.name + "'");
	}
	if (this.customConstructorDefined){
		Errors.raise("constructor already defined for '" + this.name + "'");
	}
	if (!Cast.areProceduresMatch(this.customConstructor, type)){
		Errors.raise("constructor '" + this.name + "' signature mismatch: declared as '" + this.customConstructor.description() + "' but defined as '" + type.description() + "'");
	}
	this.customConstructorDefined = true;
};

function collectAbstractMethods(r/*VAR Record*/){
	var methods = [];
	
	function keys(m/*MAP OF PField*/){
		var result = [];
		var $seq1 = m;
		for(var k in $seq1){
			var v = $seq1[k];
			result.push(k);
		}
		return result;
	}
	var selfMethods = keys(r.declaredMethods);
	var baseType = RTL$.typeGuard(r.base, Record);
	if (baseType != null){
		methods = baseType.abstractMethods.concat(selfMethods);;
	}
	else {
		Array.prototype.splice.apply(methods, [0, Number.MAX_VALUE].concat(selfMethods));
	}
	var $seq1 = methods;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var m = $seq1[$key2];
		if (r.definedMethods.indexOf(m) == -1){
			r.abstractMethods.push(m);
		}
	}
}

function checkIfFieldsInited(r/*Record*/){
	var fieldsWereNotInited = [];
	var $seq1 = r.customInitedfields;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var f = $seq1[$key2];
		if (!Object.prototype.hasOwnProperty.call(r.fieldsInit, f)){
			fieldsWereNotInited.push(f);
		}
	}
	if (fieldsWereNotInited.length != 0){
		Errors.raise("constructor '" + r.name + "' must initialize fields: " + String.join(fieldsWereNotInited, ", "));
	}
}
Record.prototype.finalize = function(){
	this.finalized = true;
	if (this.customConstructor != null && !this.customConstructorDefined){
		Errors.raise("constructor was declared for '" + this.name + "' but was not defined");
	}
	collectAbstractMethods(this);
	if (this.instantiated){
		ensureNonAbstract(this);
	}
	if (this.declaredAsVariable){
		ensureVariableCanBeDeclared(this);
	}
	ensureMethodDefinitions(this, this.lazyDefinitions);
	var $seq1 = this.nonExportedMethods;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var m = $seq1[$key2];
		delete this.declaredMethods[m];
	}
	checkIfFieldsInited(this);
	Base.Type.prototype.finalize.call(this);
};
Field.prototype.asVar = function(leadCode/*STRING*/, isReadOnly/*BOOLEAN*/, cx/*Type*/){
	var actualReadOnly = isReadOnly;
	if (!actualReadOnly && cx.qualifyScope(this.record.scope).length != 0){
		actualReadOnly = RTL$.typeGuard(this.identdef(), EberonContext.IdentdefInfo).isReadOnly();
	}
	return Base.Field.prototype.asVar.call(this, leadCode, actualReadOnly, cx);
};
function Record(name/*STRING*/, cons/*STRING*/, scope/*PType*/){
	Base.Type.call(this, name, cons, scope);
	this.customConstructor = null;
	this.customConstructorExported = false;
	this.customConstructorDefined = false;
	this.customInitedfields = [];
	this.finalized = false;
	this.declaredMethods = {};
	this.definedMethods = [];
	this.abstractMethods = [];
	this.instantiated = false;
	this.createByNewOnly = false;
	this.declaredAsVariable = false;
	this.lazyDefinitions = {};
	this.nonExportedMethods = [];
	this.baseConstructorCallCode = '';
	this.fieldsInit = {};
	this.fieldsInitOrder = [];
	this.lastFieldInit = -1;
}

function fieldsInitializationCode(r/*PRecord*/, cx/*PType*/){
	var code = '';
	var result = '';
	var $seq1 = r.fields;
	for(var key in $seq1){
		var f = $seq1[key];
		var type = f.type();
		if (Object.prototype.hasOwnProperty.call(r.fieldsInit, key)){
			code = RTL$.getMappedValue(r.fieldsInit, key);
		}
		else {
			code = "this." + Base.mangleField(key) + " = " + type.initializer(cx);
		}
		result = result + code + ";" + Chars.ln;
	}
	return result;
}
function Field(identdef/*PIdentdefInfo*/, type/*PStorageType*/, record/*PRecord*/){
	Base.Field.call(this, identdef, type);
	this.record = record;
}
exports.instantiateForVar = instantiateForVar;
exports.instantiateForNew = instantiateForNew;
exports.instantiateForCopy = instantiateForCopy;
exports.Record = Record;
exports.Field = Field;
exports.assertNotReadOnly = assertNotReadOnly;
exports.requireMethodDefinition = requireMethodDefinition;
exports.constructor$ = constructor;
exports.hasParameterizedConstructor = hasParameterizedConstructor;
exports.ensureCanBeInstantiated = ensureCanBeInstantiated;
exports.fieldsInitializationCode = fieldsInitializationCode;

})(imports["js/EberonRecord.js"]);
imports["js/EberonMap.js"] = {};
(function module$EberonMap(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Context = require("js/Context.js");
var EberonRtl = require("js/EberonRtl.js");
var Expression = require("js/Expression.js");
var EberonString = require("js/EberonString.js");
var EberonRecord = require("js/EberonRecord.js");
var EberonTypes = require("js/EberonTypes.js");
var Errors = require("js/Errors.js");
var LanguageContext = require("js/LanguageContext.js");
var Procedure = require("js/Procedure.js");
var Record = require("js/Record.js");
var Types = require("js/Types.js");
var $scope = "EberonMap";
var removeMethodName = "remove";
var clearMethodName = "clear";
function Type(){
	Types.Array.apply(this, arguments);
}
RTL$.extend(Type, Types.Array, $scope);
function Method(){
	Procedure.Std.apply(this, arguments);
}
RTL$.extend(Method, Procedure.Std, $scope);
RTL$.extend(MethodRemoveField, EberonTypes.MethodField, $scope);
RTL$.extend(MethodClearField, EberonTypes.MethodField, $scope);
function MapMethod(){
	Method.apply(this, arguments);
}
RTL$.extend(MapMethod, Method, $scope);
RTL$.extend(MethodRemove, MapMethod, $scope);
RTL$.extend(MethodClear, MapMethod, $scope);
function MethodCallRemove(){
	Procedure.StdCall.call(this);
}
RTL$.extend(MethodCallRemove, Procedure.StdCall, $scope);
function MethodCallClear(){
	Procedure.StdCall.call(this);
}
RTL$.extend(MethodCallClear, Procedure.StdCall, $scope);
RTL$.extend(ElementVariable, Types.Variable, $scope);
Type.prototype.initializer = function(cx/*Type*/){
	return "{}";
};
Type.prototype.description = function(){
	return "MAP OF " + this.elementsType.description();
};
Type.prototype.denote = function(id/*STRING*/, isReadObly/*BOOLEAN*/){
	var result = null;
	
	function assertReadOnly(){
		EberonRecord.assertNotReadOnly(isReadObly, id, "MAP");
	}
	if (id == removeMethodName){
		assertReadOnly();
		result = new MethodRemoveField();
	}
	else if (id == clearMethodName){
		assertReadOnly();
		result = new MethodClearField();
	}
	else {
		result = Types.Array.prototype.denote.call(this, id, isReadObly);
	}
	return result;
};
Type.prototype.isScalar = function(){
	return false;
};
MethodCallRemove.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	var argCode = Procedure.makeArgumentsCode(cx);
	var arg = Procedure.checkSingleArgument(args, this, cx.language.types, argCode);
	return Expression.makeSimple("[" + argCode.result() + "]", null);
};
MethodCallClear.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	Procedure.checkArgumentsCount(args.length, 0);
	return Expression.makeSimple("", null);
};
MapMethod.prototype.description = function(){
	return "MAP's method '" + this.name + "'";
};
function MethodRemove(){
	MapMethod.call(this, removeMethodName, null);
}
function MethodClear(){
	MapMethod.call(this, clearMethodName, null);
}
MethodRemove.prototype.callGenerator = function(cx/*PType*/){
	var call = new MethodCallRemove();
	var a = new Types.ProcedureArgument(new Types.OpenArray(Types.basic().ch), false);
	call.args.push(a);
	return Procedure.makeCallGenerator(call, cx);
};
MethodClear.prototype.callGenerator = function(cx/*PType*/){
	var call = new MethodCallClear();
	return Procedure.makeCallGenerator(call, cx);
};
function MethodRemoveField(){
	EberonTypes.MethodField.call(this, new MethodRemove());
}
function MethodClearField(){
	EberonTypes.MethodField.call(this, new MethodClear());
}
MethodRemoveField.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	return new Types.FieldCode("delete " + leadCode, "", "");
};
MethodClearField.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	return new Types.FieldCode(RTL$.typeGuard(cx.rtl(), EberonRtl.Type).clearMap(leadCode), "", "");
};
function ElementVariable(type/*PStorageType*/, readOnly/*BOOLEAN*/, lval/*STRING*/, rval/*STRING*/){
	Types.Variable.call(this);
	this.elementType = type;
	this.readOnly = readOnly;
	this.lval = lval;
	this.rval = rval;
}
ElementVariable.prototype.type = function(){
	return this.elementType;
};
ElementVariable.prototype.isReference = function(){
	return false;
};
ElementVariable.prototype.isReadOnly = function(){
	return this.readOnly;
};
ElementVariable.prototype.idType = function(){
	var result = '';
	result = "MAP's element of type '" + this.elementType.description() + "'";
	if (this.readOnly){
		result = "read-only " + result;
	}
	return result;
};
exports.Type = Type;
exports.ElementVariable = ElementVariable;

})(imports["js/EberonMap.js"]);
imports["js/EberonOperator.js"] = {};
(function module$EberonOperator(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var CodePrecedence = require("js/CodePrecedence.js");
var ConstValue = require("js/ConstValue.js");
var Designator = require("js/Designator.js");
var EberonMap = require("js/EberonMap.js");
var EberonString = require("js/EberonString.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var OberonRtl = require("js/OberonRtl.js");
var Operator = require("js/Operator.js");
var Record = require("js/Record.js");
var Types = require("js/Types.js");
var $scope = "EberonOperator";
function CastOpRecord(){
	Cast.CastOpRecord.call(this);
}
RTL$.extend(CastOpRecord, Cast.CastOpRecord, $scope);
var castOperations = new Cast.Operations();

function opAddStr(left/*PType*/, right/*PType*/){
	return new ConstValue.String(RTL$.typeGuard(left, ConstValue.String).value + RTL$.typeGuard(right, ConstValue.String).value);
}

function opEqualStr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.String).value == RTL$.typeGuard(right, ConstValue.String).value ? 1 : 0);
}

function opNotEqualStr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.String).value != RTL$.typeGuard(right, ConstValue.String).value ? 1 : 0);
}

function opLessStr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.String).value < RTL$.typeGuard(right, ConstValue.String).value ? 1 : 0);
}

function opGreaterStr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.String).value > RTL$.typeGuard(right, ConstValue.String).value ? 1 : 0);
}

function opLessEqualStr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.String).value <= RTL$.typeGuard(right, ConstValue.String).value ? 1 : 0);
}

function opGraterEqualStr(left/*PType*/, right/*PType*/){
	return new ConstValue.Int(RTL$.typeGuard(left, ConstValue.String).value >= RTL$.typeGuard(right, ConstValue.String).value ? 1 : 0);
}

function addStr(left/*PType*/, right/*PType*/){
	var result = Operator.binaryWithCode(left, right, opAddStr, " + ", CodePrecedence.addSub);
	var l = left.type();
	var r = right.type();
	if (l != r && (l == EberonString.string() || r == EberonString.string())){
		result = new Expression.Type(result.code(), EberonString.string(), result.info(), result.constValue(), result.maxPrecedence());
	}
	return result;
}

function equalStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return Operator.equal(left, right, opEqualStr, Operator.equalCode);
}

function notEqualStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return Operator.equal(left, right, opNotEqualStr, Operator.notEqualCode);
}

function lessStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return Operator.relational(left, right, opLessStr, " < ");
}

function greaterStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return Operator.relational(left, right, opGreaterStr, " > ");
}

function lessEqualStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return Operator.relational(left, right, opLessEqualStr, " <= ");
}

function greaterEqualStr(left/*PType*/, right/*PType*/, cx/*PType*/){
	return Operator.relational(left, right, opGraterEqualStr, " >= ");
}

function inMap(left/*PType*/, right/*PType*/, cx/*PType*/){
	return Expression.makeSimple("Object.prototype.hasOwnProperty.call(" + right.code() + ", " + left.code() + ")", Types.basic().bool);
}

function generateTypeInfo(type/*PType*/){
	var result = '';
	if (type instanceof EberonMap.Type){
		result = "{map: " + generateTypeInfo(type.elementsType) + "}";
	}
	else {
		result = Record.generateTypeInfo(type);
	}
	return result;
}
CastOpRecord.prototype.assign = function(cx/*PType*/, info/*PVariable*/, right/*PType*/){
	var result = '';
	if (info instanceof EberonMap.ElementVariable){
		if (right.info() == null && info.type() == right.type()){
			result = info.lval + " = " + right.code();
		}
		else {
			var leftType = RTL$.typeGuard(info.type(), Record.Type);
			result = info.lval + " = " + cx.language.rtl.clone(right.code(), generateTypeInfo(leftType), Record.constructor$(cx.cx, leftType));
		}
	}
	else {
		result = Cast.CastOpRecord.prototype.assign.call(this, cx, info, right);
	}
	return result;
};
castOperations.castToUint8 = new Operator.CastToUint8();
castOperations.castToRecord = new CastOpRecord();
exports.castOperations = function(){return castOperations;};
exports.addStr = addStr;
exports.equalStr = equalStr;
exports.notEqualStr = notEqualStr;
exports.lessStr = lessStr;
exports.greaterStr = greaterStr;
exports.lessEqualStr = lessEqualStr;
exports.greaterEqualStr = greaterEqualStr;
exports.inMap = inMap;
exports.generateTypeInfo = generateTypeInfo;

})(imports["js/EberonOperator.js"]);
imports["js/EberonArray.js"] = {};
(function module$EberonArray(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var EberonTypes = require("js/EberonTypes.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var Procedure = require("js/Procedure.js");
var Types = require("js/Types.js");
var $scope = "EberonArray";
var methodNameIndexOf = "indexOf";
function Method(){
	Procedure.Std.apply(this, arguments);
}
RTL$.extend(Method, Procedure.Std, $scope);
RTL$.extend(MethodIndexOf, Method, $scope);
function MethodCallIndexOf(){
	Procedure.StdCall.call(this);
}
RTL$.extend(MethodCallIndexOf, Procedure.StdCall, $scope);
function StaticArray(){
	Types.StaticArray.apply(this, arguments);
}
RTL$.extend(StaticArray, Types.StaticArray, $scope);
function OpenArray(){
	Types.OpenArray.apply(this, arguments);
}
RTL$.extend(OpenArray, Types.OpenArray, $scope);
Method.prototype.description = function(){
	return "array's method '" + this.name + "'";
};
function MethodIndexOf(elementsType/*PStorageType*/){
	Method.call(this, methodNameIndexOf, null);
	this.elementsType = elementsType;
}
MethodIndexOf.prototype.callGenerator = function(cx/*PType*/){
	var call = new MethodCallIndexOf();
	var a = new Types.ProcedureArgument(this.elementsType, false);
	call.args.push(a);
	return Procedure.makeCallGenerator(call, cx);
};
MethodCallIndexOf.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	var argCode = Procedure.makeArgumentsCode(cx);
	var argType = Procedure.checkSingleArgument(args, this, cx.language.types, argCode).type();
	return Expression.makeSimple("(" + argCode.result() + ")", Types.basic().integer);
};

function denoteMethod(id/*STRING*/, elementsType/*PStorageType*/){
	var result = null;
	if (id == methodNameIndexOf){
		result = new EberonTypes.MethodField(new MethodIndexOf(elementsType));
	}
	return result;
}

function denote(id/*STRING*/, a/*Array*/){
	var result = null;
	if (id == methodNameIndexOf){
		if (a.elementsType instanceof Types.Record || a.elementsType instanceof Types.Array){
			Errors.raise("'" + methodNameIndexOf + "' is not defined for array of '" + a.elementsType.description() + "'");
		}
		result = new EberonTypes.MethodField(new MethodIndexOf(a.elementsType));
	}
	return result;
}
StaticArray.prototype.denote = function(id/*STRING*/, isReadObly/*BOOLEAN*/){
	var result = denote(id, this);
	if (result == null){
		result = Types.StaticArray.prototype.denote.call(this, id, isReadObly);
	}
	return result;
};
OpenArray.prototype.denote = function(id/*STRING*/, isReadObly/*BOOLEAN*/){
	var result = denote(id, this);
	if (result == null){
		result = Types.OpenArray.prototype.denote.call(this, id, isReadObly);
	}
	return result;
};
exports.Method = Method;
exports.StaticArray = StaticArray;
exports.OpenArray = OpenArray;
exports.denoteMethod = denoteMethod;

})(imports["js/EberonArray.js"]);
imports["js/EberonDynamicArray.js"] = {};
(function module$EberonDynamicArray(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var Code = require("js/Code.js");
var ConstValue = require("js/ConstValue.js");
var Context = require("js/Context.js");
var EberonArray = require("js/EberonArray.js");
var EberonOperator = require("js/EberonOperator.js");
var EberonRecord = require("js/EberonRecord.js");
var EberonTypes = require("js/EberonTypes.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var Procedure = require("js/Procedure.js");
var Record = require("js/Record.js");
var Types = require("js/Types.js");
var $scope = "EberonDynamicArray";
var methodNameAdd = "add";
var methodNameClear = "clear";
var methodNameRemove = "remove";
function DynamicArray(){
	Types.Array.apply(this, arguments);
}
RTL$.extend(DynamicArray, Types.Array, $scope);
function AddCallGenerator(){
	Procedure.CallGenerator.call(this);
	this.cx = null;
	this.elementsType = null;
	this.code = '';
}
RTL$.extend(AddCallGenerator, Procedure.CallGenerator, $scope);
function Method(){
	EberonArray.Method.apply(this, arguments);
}
RTL$.extend(Method, EberonArray.Method, $scope);
RTL$.extend(MethodAdd, Method, $scope);
function MethodClear(){
	Method.apply(this, arguments);
}
RTL$.extend(MethodClear, Method, $scope);
function MethodRemove(){
	Method.apply(this, arguments);
}
RTL$.extend(MethodRemove, Method, $scope);
function MethodCallClear(){
	Procedure.StdCall.call(this);
}
RTL$.extend(MethodCallClear, Procedure.StdCall, $scope);
function MethodCallRemove(){
	Procedure.StdCall.call(this);
}
RTL$.extend(MethodCallRemove, Procedure.StdCall, $scope);
RTL$.extend(MethodAddField, EberonTypes.MethodField, $scope);
RTL$.extend(MethodClearField, EberonTypes.MethodField, $scope);
RTL$.extend(MethodRemoveField, EberonTypes.MethodField, $scope);
var methodClear = null;
var methodRemove = null;

function arrayDimensionDescription(a/*VAR Array*/){
	var result = '';
	if (a instanceof DynamicArray){
		result = "*";
	}
	else {
		result = Types.arrayDimensionDescription(a);
	}
	return result;
}
DynamicArray.prototype.initializer = function(cx/*Type*/){
	return "[]";
};
DynamicArray.prototype.description = function(){
	return Types.arrayDescription(this, arrayDimensionDescription);
};
function MethodAdd(elementsType/*PStorageType*/){
	Method.call(this, methodNameAdd, null);
	this.elementsType = elementsType;
}
DynamicArray.prototype.denote = function(id/*STRING*/, isReadObly/*BOOLEAN*/){
	var result = null;
	
	function assertReadOnly(){
		EberonRecord.assertNotReadOnly(isReadObly, id, "dynamic array");
	}
	if (id == methodNameAdd){
		assertReadOnly();
		result = new MethodAddField(this.elementsType);
	}
	else if (id == methodNameClear){
		assertReadOnly();
		result = methodClear;
	}
	else if (id == methodNameRemove){
		assertReadOnly();
		result = methodRemove;
	}
	else {
		result = EberonArray.denoteMethod(id, this.elementsType);
		if (result == null){
			result = Types.Array.prototype.denote.call(this, id, isReadObly);
		}
	}
	return result;
};
AddCallGenerator.prototype.handleArgument = function(e/*PType*/){
	if (this.code != ""){
		Errors.raise("method 'add' expects one argument, got many");
	}
	var argCode = Procedure.makeArgumentsCode(this.cx);
	Procedure.checkArgument(e, new Types.ProcedureArgument(this.elementsType, false), 0, argCode, this.cx.language.types);
	this.code = argCode.result();
	var t = e.type();
	if (t instanceof Types.Array){
		if (Expression.isTemporary(e)){
			this.code = e.code();
		}
		else {
			this.code = Cast.cloneArray(t, this.code, this.cx);
		}
	}
	else if (t instanceof Record.Type){
		if (Expression.isTemporary(e)){
			this.code = e.code();
		}
		else {
			this.code = this.cx.language.rtl.clone(this.code, EberonOperator.generateTypeInfo(t), Record.constructor$(this.cx.cx, t));
		}
	}
};
AddCallGenerator.prototype.end = function(){
	if (this.code == ""){
		Errors.raise("method 'add' expects one argument, got nothing");
	}
	return Expression.makeSimple("(" + this.code + ")", null);
};
Method.prototype.description = function(){
	return "dynamic array's method '" + this.name + "'";
};
MethodAddField.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	return new Types.FieldCode(leadCode + "." + "push", "", "");
};
MethodClearField.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	return new Types.FieldCode(leadCode + "." + "splice", "", "");
};
MethodRemoveField.prototype.designatorCode = function(leadCode/*STRING*/, cx/*Type*/){
	return new Types.FieldCode(leadCode + "." + "splice", "", "");
};
MethodAdd.prototype.callGenerator = function(cx/*PType*/){
	var result = new AddCallGenerator();
	result.cx = cx;
	result.elementsType = this.elementsType;
	return result;
};
function MethodAddField(elementsType/*PStorageType*/){
	EberonTypes.MethodField.call(this, new MethodAdd(elementsType));
}
function MethodClearField(){
	EberonTypes.MethodField.call(this, new MethodClear(methodNameClear, null));
}
function MethodRemoveField(){
	EberonTypes.MethodField.call(this, new MethodRemove(methodNameRemove, null));
}
MethodCallClear.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	Procedure.processArguments(args, this.args, null, cx.language.types);
	return Expression.makeSimple("(0, Number.MAX_VALUE)", null);
};
MethodCallRemove.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	var argCode = Procedure.makeArgumentsCode(cx);
	var arg = Procedure.checkSingleArgument(args, this, cx.language.types, argCode);
	var value = arg.constValue();
	if (value != null && value instanceof ConstValue.Int){
		Code.checkIndex(value.value);
	}
	return Expression.makeSimple("(" + argCode.result() + ", 1)", null);
};
MethodClear.prototype.callGenerator = function(cx/*PType*/){
	return Procedure.makeCallGenerator(new MethodCallClear(), cx);
};
MethodRemove.prototype.callGenerator = function(cx/*PType*/){
	var call = new MethodCallRemove();
	var a = new Types.ProcedureArgument(Types.basic().integer, false);
	call.args.push(a);
	return Procedure.makeCallGenerator(call, cx);
};
methodClear = new MethodClearField();
methodRemove = new MethodRemoveField();
exports.DynamicArray = DynamicArray;

})(imports["js/EberonDynamicArray.js"]);
imports["js/EberonCast.js"] = {};
(function module$EberonCast(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var Code = require("js/Code.js");
var Context = require("js/Context.js");
var EberonMap = require("js/EberonMap.js");
var EberonString = require("js/EberonString.js");
var EberonOperator = require("js/EberonOperator.js");
var EberonDynamicArray = require("js/EberonDynamicArray.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var OberonRtl = require("js/OberonRtl.js");
var Types = require("js/Types.js");
var $scope = "EberonCast";
function CastOpToDynamicArray(){
	Cast.CastOpArray.call(this);
}
RTL$.extend(CastOpToDynamicArray, Cast.CastOpArray, $scope);
function CastOpToMap(){
	LanguageContext.CastOp.call(this);
}
RTL$.extend(CastOpToMap, LanguageContext.CastOp, $scope);
var castOpToDynamicArray = null;
var castOpToMap = null;
CastOpToDynamicArray.prototype.make = function(cx/*PType*/, e/*PType*/){
	return Expression.makeSimple(Cast.cloneArray(RTL$.typeGuard(e.type(), Types.Array), e.code(), cx), null);
};

function copyArray(t/*PArray*/, leftCode/*STRING*/, rightCode/*STRING*/, rtl/*Type*/){
	var result = '';
	if (t.elementsType.isScalar()){
		result = "Array.prototype.splice.apply(" + leftCode + ", [0, Number.MAX_VALUE].concat(" + rightCode + "))";
	}
	else {
		result = rtl.copy(rightCode, leftCode, EberonOperator.generateTypeInfo(t));
	}
	return result;
}
CastOpToDynamicArray.prototype.assign = function(cx/*PType*/, info/*PVariable*/, right/*PType*/){
	return copyArray(RTL$.typeGuard(info.type(), Types.Array), cx.language.codeTraits.referenceCode(info), right.code(), cx.language.rtl);
};
CastOpToMap.prototype.make = function(cx/*PType*/, e/*PType*/){
	return e;
};
CastOpToMap.prototype.assign = function(cx/*PType*/, info/*PVariable*/, right/*PType*/){
	return cx.language.rtl.copy(right.code(), cx.language.codeTraits.referenceCode(info), EberonOperator.generateTypeInfo(info.type()));
};
CastOpToMap.prototype.clone = function(cx/*PType*/, e/*PType*/){
	return cx.language.rtl.clone(e.code(), EberonOperator.generateTypeInfo(e.type()), "undefined");
};

function isOpenCharArray(type/*PType*/){
	return type instanceof Types.OpenArray && type.elementsType == Types.basic().ch;
}

function dynamicArrayElementsMatch(t1/*PType*/, t2/*PType*/){
	var result = false;
	if (t1 instanceof EberonDynamicArray.DynamicArray && t2 instanceof EberonDynamicArray.DynamicArray){
		result = dynamicArrayElementsMatch(t1.elementsType, t2.elementsType);
	}
	else {
		result = Cast.areTypesExactlyMatch()(t1, t2);
	}
	return result;
}

function implicit(from/*PType*/, to/*PType*/, toVar/*BOOLEAN*/, ops/*Operations*/, op/*VAR PCastOp*/){
	var result = 0;
	if (from == EberonString.string() && (to instanceof Types.String || isOpenCharArray(to)) || from instanceof Types.String && to == EberonString.string()){
		if (toVar){
			result = Cast.errVarParameter;
		}
		else {
			op.set(Cast.doNothing());
			result = Cast.errNo;
		}
	}
	else if (from instanceof Types.Array && to instanceof EberonDynamicArray.DynamicArray && dynamicArrayElementsMatch(from.elementsType, to.elementsType)){
		if (toVar){
			if (!(from instanceof EberonDynamicArray.DynamicArray)){
				result = Cast.errVarParameter;
			}
			else {
				op.set(Cast.doNothing());
				result = Cast.errNo;
			}
		}
		else {
			op.set(castOpToDynamicArray);
			result = Cast.errNo;
		}
	}
	else if (from instanceof EberonMap.Type && to instanceof EberonMap.Type){
		if (Cast.areTypesExactlyMatch()(from.elementsType, to.elementsType)){
			op.set(castOpToMap);
			result = Cast.errNo;
		}
		else {
			result = Cast.err;
		}
	}
	else {
		result = Cast.implicit(from, to, toVar, ops, op);
	}
	return result;
}
castOpToDynamicArray = new CastOpToDynamicArray();
castOpToMap = new CastOpToMap();
exports.implicit = implicit;

})(imports["js/EberonCast.js"]);
imports["js/EberonScope.js"] = {};
(function module$EberonScope(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Errors = require("js/Errors.js");
var Scope = require("js/Scope.js");
var Symbols = require("js/Symbols.js");
var $scope = "EberonScope";
function Operator(){
	Scope.Type.apply(this, arguments);
	this.parent = null;
}
RTL$.extend(Operator, Scope.Type, $scope);
Operator.prototype.name = function(){
	return "operator";
};
Operator.prototype.addSymbol = function(s/*PSymbol*/, exported/*BOOLEAN*/){
	var id = s.id();
	var parent = this.parent;
	while (true){
		if (parent != null){
			var found = parent.findSymbol(id);
			if (found != null){
				Errors.raise("'" + id + "' already declared in " + found.scope().name() + " scope");
			}
			var next = parent;
			if (next instanceof Operator){
				parent = next.parent;
			}
			else {
				parent = null;
			}
		} else break;
	}
	Scope.Type.prototype.addSymbol.call(this, s, exported);
};
Operator.prototype.generateTempVar = function(pattern/*STRING*/){
	return this.parent.generateTempVar(pattern);
};

function makeOperator(parent/*PType*/, stdSymbols/*MAP OF PSymbol*/){
	var result = new Operator(stdSymbols);
	result.parent = parent;
	return result;
}

function startOperatorScope(cx/*Node*/){
	var root = cx.root();
	var scope = makeOperator(root.currentScope(), root.language().stdSymbols);
	root.pushScope(scope);
}

function endOperatorScope(cx/*Node*/){
	cx.root().popScope();
}
exports.makeOperator = makeOperator;
exports.startOperatorScope = startOperatorScope;
exports.endOperatorScope = endOperatorScope;

})(imports["js/EberonScope.js"]);
imports["js/EberonContextCase.js"] = {};
(function module$EberonContextCase(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var ContextCase = require("js/ContextCase.js");
var EberonScope = require("js/EberonScope.js");
var $scope = "EberonContextCase";
function Label(){
	ContextCase.Label.apply(this, arguments);
}
RTL$.extend(Label, ContextCase.Label, $scope);
Label.prototype.handleLiteral = function(s/*STRING*/){
	if (s == ":"){
		EberonScope.startOperatorScope(this);
	}
};
Label.prototype.endParse = function(){
	EberonScope.endOperatorScope(this);
	return ContextCase.Label.prototype.endParse.call(this);
};
exports.Label = Label;

})(imports["js/EberonContextCase.js"]);
imports["js/EberonConstructor.js"] = {};
(function module$EberonConstructor(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var CodeGenerator = require("js/CodeGenerator.js");
var EberonCast = require("js/EberonCast.js");
var EberonRecord = require("js/EberonRecord.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var Procedure = require("js/Procedure.js");
var Record = require("js/Record.js");
var Stream = require("js/Stream.js");
var TypeId = require("js/TypeId.js");
var Types = require("js/Types.js");
var $scope = "EberonConstructor";
function ConstructorCall(){
	Procedure.StdCall.call(this);
	this.recordType = null;
	this.resultType = null;
}
RTL$.extend(ConstructorCall, Procedure.StdCall, $scope);
function BaseConstructorCall(){
	ConstructorCall.call(this);
}
RTL$.extend(BaseConstructorCall, ConstructorCall, $scope);
function RecordInitCall(){
	ConstructorCall.call(this);
	this.field = '';
}
RTL$.extend(RecordInitCall, ConstructorCall, $scope);
function NonRecordInitCall(){
	Procedure.CallGenerator.call(this);
	this.cx = null;
	this.type = null;
	this.field = '';
	this.code = '';
}
RTL$.extend(NonRecordInitCall, Procedure.CallGenerator, $scope);

function checkArgs(call/*ConstructorCall*/, args/*ARRAY OF PType*/, cx/*PType*/){
	var argCode = Procedure.makeArgumentsCode(cx);
	Procedure.processArguments(args, call.args, argCode, cx.language.types);
	return argCode.result();
}
ConstructorCall.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	var argCode = checkArgs(this, args, cx);
	return Expression.makeSimple(Record.initializer(cx.cx, this.recordType, argCode), this.resultType);
};
BaseConstructorCall.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	var argCode = checkArgs(this, args, cx);
	var code = CodeGenerator.mangleId(Record.constructor$(cx.cx, this.recordType)) + ".call(this, " + argCode + ");" + Stream.kCR;
	return Expression.makeSimple(code, null);
};

function fieldInitLval(field/*STRING*/){
	return "this." + Record.mangleField(field);
}
RecordInitCall.prototype.make = function(args/*ARRAY OF PType*/, cx/*PType*/){
	var e = ConstructorCall.prototype.make.call(this, args, cx);
	var t = RTL$.typeGuard(e.type(), Types.StorageType);
	return Expression.makeSimple(fieldInitLval(this.field) + " = " + e.code(), t);
};

function makeCallGenerator(recordType/*PRecord*/, resultType/*PType*/, cx/*PType*/, call/*PConstructorCall*/){
	call.recordType = recordType;
	call.resultType = resultType;
	var cons = EberonRecord.constructor$(recordType);
	if (cons != null){
		Array.prototype.splice.apply(call.args, [0, Number.MAX_VALUE].concat(cons.args()));
	}
	return Procedure.makeCallGenerator(call, cx);
}

function raiseSingleArgumentException(c/*NonRecordInitCall*/){
	Errors.raise("single argument expected to initialize field '" + c.field + "'");
}
NonRecordInitCall.prototype.handleArgument = function(e/*PType*/){
	var op = null;
	if (this.code.length != 0){
		raiseSingleArgumentException(this);
	}
	if (this.cx.language.types.implicitCast(e.type(), this.type, false, {set: function($v){op = $v;}, get: function(){return op;}}) != Cast.errNo){
		Errors.raise("type mismatch: field '" + this.field + "' is '" + this.type.description() + "' and cannot be initialized using '" + e.type().description() + "' expression");
	}
	var lval = fieldInitLval(this.field);
	this.code = lval + " = " + op.clone(this.cx, e);
};
NonRecordInitCall.prototype.end = function(){
	if (this.code.length == 0){
		raiseSingleArgumentException(this);
	}
	return Expression.makeSimple(this.code, null);
};

function makeConstructorCall(typeId/*PType*/, cx/*PType*/, forNew/*BOOLEAN*/){
	var call = new ConstructorCall();
	var resultType = typeId.type();
	var recordType = RTL$.typeGuard(resultType, EberonRecord.Record);
	var instType = EberonRecord.instantiateForVar;
	if (forNew){
		instType = EberonRecord.instantiateForNew;
	}
	EberonRecord.ensureCanBeInstantiated(cx.cx, recordType, instType);
	if (forNew){
		resultType = new Record.Pointer("", typeId);
	}
	return makeCallGenerator(recordType, resultType, cx, call);
}

function makeFieldInitCall(type/*PStorageType*/, cx/*PType*/, field/*STRING*/){
	var result = null;
	
	function initRecord(type/*PRecord*/){
		var call = new RecordInitCall();
		call.field = field;
		return makeCallGenerator(type, type, cx, call);
	}
	
	function initNonRecord(){
		var result = new NonRecordInitCall();
		result.cx = cx;
		result.field = field;
		result.type = type;
		return result;
	}
	if (type instanceof EberonRecord.Record){
		result = initRecord(type);
	}
	else {
		result = initNonRecord();
	}
	return result;
}

function makeBaseConstructorCall(type/*PRecord*/, cx/*PType*/){
	return makeCallGenerator(type, type, cx, new BaseConstructorCall());
}
exports.makeConstructorCall = makeConstructorCall;
exports.makeFieldInitCall = makeFieldInitCall;
exports.makeBaseConstructorCall = makeBaseConstructorCall;

})(imports["js/EberonConstructor.js"]);
imports["js/EberonTypePromotion.js"] = {};
(function module$EberonTypePromotion(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Types = require("js/Types.js");
var $scope = "EberonTypePromotion";
function Variable(){
	Types.DeclaredVariable.call(this);
}
RTL$.extend(Variable, Types.DeclaredVariable, $scope);
function Type(){
}
Type.prototype.$scope = $scope;
RTL$.extend(ForVariable, Type, $scope);
RTL$.extend(Combined, Type, $scope);
RTL$.extend(And, Combined, $scope);
RTL$.extend(Or, Combined, $scope);
Maybe.prototype.$scope = $scope;
function ForVariable(v/*PVariable*/, type/*PStorageType*/, inverted/*BOOLEAN*/){
	Type.call(this);
	this.v = v;
	this.type = type;
	this.originalType = v.type();
	this.inverted = inverted;
}
ForVariable.prototype.and = function(){
	if (!this.inverted){
		this.v.setType(this.type);
	}
};
ForVariable.prototype.or = function(){
	if (this.inverted){
		this.v.setType(this.type);
	}
};
ForVariable.prototype.reset = function(){
	this.v.setType(this.originalType);
};
ForVariable.prototype.invert = function(){
	this.inverted = !this.inverted;
};
function Maybe(handler/*PCombined*/){
	this.inverted = false;
	this.handler = handler;
}

function handlePromotion(handler/*VAR Combined*/, p/*PType*/){
	RTL$.assert(handler.current == null);
	handler.promotions.push(p);
	handler.current = p;
}
Maybe.prototype.promote = function(v/*PVariable*/, type/*PStorageType*/){
	handlePromotion(this.handler, new ForVariable(v, type, this.inverted));
};
Maybe.prototype.invert = function(){
	this.inverted = !this.inverted;
};
Maybe.prototype.makeOr = function(){
	var result = new Or(this.inverted);
	handlePromotion(this.handler, result);
	return result;
};
Maybe.prototype.makeAnd = function(){
	var result = new And(this.inverted);
	handlePromotion(this.handler, result);
	return result;
};

function applyForAll(p/*Combined*/){
	var $seq1 = p.promotions;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var pr = $seq1[$key2];
		p.op(pr);
	}
}

function applyIfSingle(p/*Combined*/){
	if (p.count > 1){
		p.reset();
	}
	else if (p.current != null){
		p.invertedOp(p.current);
	}
}
function Combined(op/*Operation*/, invertedOp/*Operation*/, inverted/*BOOLEAN*/){
	Type.call(this);
	this.op = op;
	this.invertedOp = invertedOp;
	this.inverted = inverted;
	this.promotions = [];
	this.current = null;
	this.count = 0;
}
Combined.prototype.and = function(){
	if (this.inverted){
		applyForAll(this);
	}
	else {
		applyIfSingle(this);
	}
};
Combined.prototype.or = function(){
	if (this.inverted){
		applyIfSingle(this);
	}
	else {
		applyForAll(this);
	}
};
Combined.prototype.reset = function(){
	for (var i = this.promotions.length - 1 | 0; i >= 0; --i){
		var p = this.promotions[i];
		p.reset();
	}
};
Combined.prototype.clear = function(){
	this.reset();
	this.promotions.splice(0, Number.MAX_VALUE);
	this.current = null;
	this.count = 0;
};
Combined.prototype.next = function(){
	if (this.current != null){
		this.op(this.current);
		this.current = null;
	}
	++this.count;
	return new Maybe(this);
};

function and(p/*Type*/){
	p.and();
}

function or(p/*Type*/){
	p.or();
}
function And(inverted/*BOOLEAN*/){
	Combined.call(this, and, or, !inverted);
}
function Or(inverted/*BOOLEAN*/){
	Combined.call(this, or, and, inverted);
}
exports.Variable = Variable;
exports.Type = Type;
exports.ForVariable = ForVariable;
exports.Combined = Combined;
exports.And = And;
exports.Or = Or;
exports.Maybe = Maybe;

})(imports["js/EberonTypePromotion.js"]);
imports["js/EberonContextDesignator.js"] = {};
(function module$EberonContextDesignator(exports){
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

})(imports["js/EberonContextDesignator.js"]);
imports["js/EberonContextExpression.js"] = {};
(function module$EberonContextExpression(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Cast = require("js/Cast.js");
var CodePrecedence = require("js/CodePrecedence.js");
var ConstValue = require("js/ConstValue.js");
var Context = require("js/Context.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var EberonArray = require("js/EberonArray.js");
var EberonContextDesignator = require("js/EberonContextDesignator.js");
var EberonMap = require("js/EberonMap.js");
var EberonOperator = require("js/EberonOperator.js");
var EberonRecord = require("js/EberonRecord.js");
var EberonString = require("js/EberonString.js");
var EberonTypePromotion = require("js/EberonTypePromotion.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var ExpressionTree = require("js/ExpressionTree.js");
var LanguageContext = require("js/LanguageContext.js");
var JS = GLOBAL;
var Object$ = require("js/Object.js");
var Record = require("js/Record.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "EberonContextExpression";
RTL$.extend(ExpressionNode, ContextExpression.ExpressionHandler, $scope);
RTL$.extend(RelationExpression, ContextExpression.ExpressionNode, $scope);
function Array(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
	this.size = 0;
	this.type = null;
	this.code = '';
}
RTL$.extend(Array, ContextExpression.ExpressionHandler, $scope);
function ArrayConst(){
	ConstValue.Type.call(this);
}
RTL$.extend(ArrayConst, ConstValue.Type, $scope);
function Ops(){
	ExpressionTree.Ops.call(this);
}
RTL$.extend(Ops, ExpressionTree.Ops, $scope);
RTL$.extend(TermList, ExpressionTree.TermList, $scope);
RTL$.extend(SimpleList, ExpressionTree.SimpleList, $scope);
RTL$.extend(Node, ExpressionTree.Node, $scope);
RTL$.extend(ETFactor, ExpressionTree.Factor, $scope);
RTL$.extend(TernaryOperatorResult, Variable.TypedVariable, $scope);
var setTermTypePromotion = null;
var globalOps = null;

function hierarchyDepth(t/*Type*/){
	var result = 0;
	var base = t.base;
	while (true){
		if (base != null){
			++result;
			base = base.base;
		} else break;
	}
	return result;
}

function getNthBase(t/*PType*/, n/*INTEGER*/){
	var result = t;
	var i = n;
	while (true){
		if (i != 0){
			result = result.base;
			--i;
		} else break;
	}
	return result;
}

function findCommonBaseRecord(t1/*PType*/, t2/*PType*/){
	var depth1 = hierarchyDepth(t1);
	var depth2 = hierarchyDepth(t2);
	var commonBase1 = t1;
	var commonBase2 = t2;
	if (depth1 > depth2){
		commonBase1 = getNthBase(commonBase1, depth1 - depth2 | 0);
	}
	else {
		commonBase2 = getNthBase(commonBase2, depth2 - depth1 | 0);
	}
	while (true){
		if (commonBase1 != commonBase2){
			commonBase1 = commonBase1.base;
			commonBase2 = commonBase2.base;
		} else break;
	}
	return commonBase1;
}

function findCommonBase(t1/*PType*/, t2/*PType*/){
	return t1 instanceof Types.String || t2 instanceof Types.String ? EberonString.string() : t1;
}

function ternaryCodeImpl(condition/*PType*/, left/*STRING*/, right/*STRING*/){
	return condition.code() + " ? " + left + " : " + right;
}

function ternaryCode(t/*TernaryOperatorResult*/){
	return ternaryCodeImpl(t.condition, Expression.deref(t.left).code(), Expression.deref(t.right).code());
}

function parentTerm(maybeFactor/*VAR Node*/){
	return maybeFactor instanceof ContextExpression.Factor ? RTL$.typeGuard(maybeFactor.factor, ETFactor).termList : null;
}
function ExpressionNode(parent/*PNode*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	this.currentNode = new Node(parentTerm(parent));
	this.typePromotion = null;
	this.condition = null;
	this.first = null;
	this.second = null;
}

function processTypePromotion(node/*Node*/){
	var typePromotion = node.combinedTypePromotion;
	return typePromotion != null ? typePromotion : node.varTypePromotion;
}
ExpressionNode.prototype.handleExpression = function(e/*PType*/){
	if (this.condition == null){
		this.condition = e;
		this.typePromotion = processTypePromotion(this.currentNode);
	}
	else if (this.first == null){
		this.first = e;
	}
	else {
		this.second = e;
	}
	this.currentNode = new Node(this.currentNode.parentTerm);
};
ExpressionNode.prototype.handleLiteral = function(s/*STRING*/){
	var parentTerm = this.currentNode.parentTerm;
	if (parentTerm != null){
		parentTerm.typePromotion = null;
	}
	if (this.typePromotion != null){
		if (s == "?"){
			this.typePromotion.and();
		}
		else {
			this.typePromotion.reset();
			this.typePromotion.or();
		}
	}
};
ExpressionNode.prototype.endParse = function(){
	var resultType = null;
	var op = null;
	var result = this.first;
	if (result == null){
		result = this.condition;
		if (this.typePromotion != null && this.currentNode.parentTerm == null){
			var msg = new EberonContextDesignator.TransferPromotedTypesMsg(this.typePromotion);
			var void$ = this.parent().handleMessage(msg);
		}
	}
	else {
		var firstType = this.first.type();
		var secondType = this.second.type();
		if (firstType instanceof Record.Type && secondType instanceof Record.Type){
			resultType = findCommonBaseRecord(firstType, secondType);
		}
		else if (firstType instanceof Record.Pointer && secondType instanceof Record.Pointer){
			resultType = EberonContextDesignator.makePointer(findCommonBaseRecord(Record.pointerBase(firstType), Record.pointerBase(secondType)));
		}
		else if (firstType == Types.nil() && secondType instanceof Record.Pointer){
			resultType = secondType;
		}
		else if (secondType == Types.nil() && firstType instanceof Record.Pointer){
			resultType = firstType;
		}
		if (resultType == null){
			if (this.root().language().types.implicitCast(firstType, secondType, false, {set: function($v){op = $v;}, get: function(){return op;}}) != Cast.errNo){
				Errors.raise("incompatible types in ternary operator: '" + firstType.description() + "' and '" + secondType.description() + "'");
			}
			resultType = findCommonBase(firstType, secondType);
		}
		var checkResultType = resultType;
		if (!(checkResultType instanceof Types.StorageType)){
			Errors.raise("cannot use '" + checkResultType.description() + "' as a result of ternary operator");
		}
		else {
			var v = new TernaryOperatorResult(checkResultType, this.condition, this.first, this.second);
			result = new Expression.Type(ternaryCode(v), resultType, v, null, CodePrecedence.conditional);
		}
	}
	RTL$.typeGuard(this.parent(), ContextExpression.ExpressionHandler).handleExpression(result);
	return true;
};
function RelationExpression(parent/*PExpressionNode*/){
	ContextExpression.ExpressionNode.call(this, parent, parent.currentNode);
}

function optimizeRecordRValue(info/*VAR Id*/, l/*Language*/){
	var result = '';
	if (info instanceof TernaryOperatorResult){
		var lTemp = Expression.isTemporary(info.left);
		var rTemp = Expression.isTemporary(info.right);
		if (lTemp && rTemp){
			result = ternaryCode(info);
		}
		else if (lTemp){
			result = ternaryCodeImpl(info.condition, info.left.code(), l.rtl.clone(info.right.code(), l.types.typeInfo(info.type()), "undefined"));
		}
		else if (rTemp){
			result = ternaryCodeImpl(info.condition, l.rtl.clone(info.left.code(), l.types.typeInfo(info.type()), "undefined"), info.right.code());
		}
	}
	return result;
}

function initFromRValue(cx/*PNode*/, e/*PType*/, lval/*STRING*/, resultType/*VAR PStorageType*/){
	var result = '';
	var cloneOp = null;
	var type = e.type();
	if (type instanceof Types.String){
		resultType.set(EberonString.string());
	}
	else if (type instanceof Types.StorageType){
		resultType.set(type);
	}
	else {
		Errors.raise("cannot use " + type.description() + " to initialize " + lval);
	}
	if (type instanceof Types.OpenArray){
		Errors.raise("cannot initialize " + lval + " with open array");
	}
	else if (type instanceof EberonRecord.Record){
		EberonRecord.ensureCanBeInstantiated(cx, type, EberonRecord.instantiateForCopy);
		if (Expression.isTemporary(e)){
			result = e.code();
		}
		else {
			var info = e.info();
			var l = cx.root().language();
			var code = optimizeRecordRValue(info, l);
			result = code.length == 0 ? l.rtl.clone(e.code(), l.types.typeInfo(type), "undefined") : code;
		}
	}
	else {
		if (Expression.isTemporary(e) && type instanceof Types.Array){
			result = e.code();
		}
		else {
			var l = cx.root().language();
			var void$ = l.types.implicitCast(type, type, false, {set: function($v){cloneOp = $v;}, get: function(){return cloneOp;}});
			result = cloneOp.clone(ContextHierarchy.makeLanguageContext(cx), e);
		}
	}
	return result;
}
Array.prototype.handleExpression = function(e/*PType*/){
	var checkType = null;
	if (this.type == null){
		this.code = "[" + initFromRValue(this, e, "array's element", RTL$.makeRef(this, "type"));
	}
	else {
		this.code = this.code + ", " + initFromRValue(this, e, "array's element", {set: function($v){checkType = $v;}, get: function(){return checkType;}});
		if (this.type != checkType){
			Errors.raise("array's elements should have the same type: expected '" + this.type.description() + "', got '" + checkType.description() + "'");
		}
	}
	++this.size;
};
Array.prototype.endParse = function(){
	this.code = this.code + "]";
	RTL$.typeGuard(this.parent(), ContextExpression.ExpressionHandler).handleExpression(Expression.make(this.code, new EberonArray.StaticArray("", this.type, this.size), null, new ArrayConst()));
	return true;
};
Ops.prototype.in = function(left/*PType*/, right/*PType*/, cx/*Node*/){
	var result = null;
	if (right instanceof EberonMap.Type){
		EberonContextDesignator.checkMapKeyType(left);
		result = EberonOperator.inMap;
	}
	else {
		result = ExpressionTree.Ops.prototype.in.call(this, left, right, cx);
	}
	return result;
};

function setSimpleExpressionTypePromotion(e/*VAR SimpleList*/){
	if (e.currentPromotion == null){
		if (e.parentTerm != null){
			var p = setTermTypePromotion(e.parentTerm);
			if (p != null){
				e.typePromotion = p.makeOr();
			}
		}
		else {
			e.typePromotion = new EberonTypePromotion.Or(false);
		}
		if (e.typePromotion != null){
			if (e.orHandled){
				var unused = e.typePromotion.next();
			}
			e.currentPromotion = e.typePromotion.next();
		}
	}
	return e.currentPromotion;
}

function setTermTypePromotionProc(term/*VAR TermList*/){
	if (term.currentPromotion == null){
		var p = setSimpleExpressionTypePromotion(term.parentSimple);
		if (p != null){
			term.typePromotion = p.makeAnd();
		}
		if (term.typePromotion != null){
			if (term.andHandled){
				var unused = term.typePromotion.next();
			}
			term.currentPromotion = term.typePromotion.next();
		}
	}
	return term.currentPromotion;
}
TermList.prototype.addOp = function(op/*STRING*/){
	ExpressionTree.TermList.prototype.addOp.call(this, op);
	if (this.typePromotion != null){
		this.currentPromotion = this.typePromotion.next();
	}
	else {
		this.andHandled = true;
	}
};
Ops.prototype.plus = function(type/*PType*/){
	return type == EberonString.string() || type instanceof Types.String ? EberonOperator.addStr : ExpressionTree.Ops.prototype.plus.call(this, type);
};
Ops.prototype.plusExpect = function(){
	return "numeric type or SET or STRING";
};
Ops.prototype.eq = function(type/*PType*/){
	return type == EberonString.string() ? EberonOperator.equalStr : ExpressionTree.Ops.prototype.eq.call(this, type);
};
Ops.prototype.notEq = function(type/*PType*/){
	return type == EberonString.string() ? EberonOperator.notEqualStr : ExpressionTree.Ops.prototype.notEq.call(this, type);
};
Ops.prototype.less = function(type/*PType*/){
	return type == EberonString.string() ? EberonOperator.lessStr : ExpressionTree.Ops.prototype.less.call(this, type);
};
Ops.prototype.greater = function(type/*PType*/){
	return type == EberonString.string() ? EberonOperator.greaterStr : ExpressionTree.Ops.prototype.greater.call(this, type);
};
Ops.prototype.lessEq = function(type/*PType*/){
	return type == EberonString.string() ? EberonOperator.lessEqualStr : ExpressionTree.Ops.prototype.lessEq.call(this, type);
};
Ops.prototype.greaterEq = function(type/*PType*/){
	return type == EberonString.string() ? EberonOperator.greaterEqualStr : ExpressionTree.Ops.prototype.greaterEq.call(this, type);
};
Ops.prototype.coalesceType = function(leftType/*PType*/, rightType/*PType*/){
	return leftType == EberonString.string() && rightType instanceof Types.String || rightType == EberonString.string() && leftType instanceof Types.String ? EberonString.string() : ExpressionTree.Ops.prototype.coalesceType.call(this, leftType, rightType);
};
function Node(parentTerm/*PTermList*/){
	ExpressionTree.Node.call(this, globalOps);
	this.parentTerm = parentTerm;
	this.combinedTypePromotion = null;
	this.varTypePromotion = null;
}
Node.prototype.makeSimple = function(){
	return new SimpleList(this.parentTerm);
};
Node.prototype.addSimple = function(s/*PSimpleList*/){
	this.combinedTypePromotion = RTL$.typeGuard(s, SimpleList).typePromotion;
	if (this.left != null && this.right.op == "IS"){
		var v = this.left.term.factor.expression.info();
		if (v instanceof EberonTypePromotion.Variable){
			var type = ExpressionTree.unwrapType(s.term.factor.expression.info());
			if (this.parentTerm == null){
				this.varTypePromotion = new EberonTypePromotion.ForVariable(v, type, false);
			}
			else {
				var p = setTermTypePromotion(this.parentTerm);
				p.promote(v, type);
			}
		}
	}
	ExpressionTree.Node.prototype.addSimple.call(this, s);
};
Node.prototype.addOp = function(op/*STRING*/){
	if (this.combinedTypePromotion != null){
		this.combinedTypePromotion.clear();
	}
	ExpressionTree.Node.prototype.addOp.call(this, op);
};
function SimpleList(parentTerm/*PTermList*/){
	ExpressionTree.SimpleList.call(this);
	this.parentTerm = parentTerm;
	this.typePromotion = null;
	this.currentPromotion = null;
	this.orHandled = false;
}
SimpleList.prototype.makeTerm = function(){
	return new TermList(this);
};
SimpleList.prototype.addOp = function(op/*STRING*/){
	ExpressionTree.SimpleList.prototype.addOp.call(this, op);
	if (this.typePromotion != null){
		this.currentPromotion = this.typePromotion.next();
	}
	else {
		this.orHandled = true;
	}
};
function TermList(parentSimple/*PSimpleList*/){
	ExpressionTree.TermList.call(this);
	this.parentSimple = parentSimple;
	this.typePromotion = null;
	this.currentPromotion = null;
	this.andHandled = false;
}
TermList.prototype.makeFactor = function(){
	return new ETFactor(this);
};
function ETFactor(termList/*PTermList*/){
	ExpressionTree.Factor.call(this);
	this.termList = termList;
}
ETFactor.prototype.logicalNot = function(){
	ExpressionTree.Factor.prototype.logicalNot.call(this);
	var p = setTermTypePromotion(this.termList);
	if (p != null){
		p.invert();
	}
};
function TernaryOperatorResult(type/*PStorageType*/, condition/*PType*/, l/*PType*/, r/*PType*/){
	Variable.TypedVariable.call(this, type);
	this.condition = condition;
	this.left = l;
	this.right = r;
}
TernaryOperatorResult.prototype.isReference = function(){
	return false;
};
TernaryOperatorResult.prototype.isReadOnly = function(){
	return true;
};
TernaryOperatorResult.prototype.idType = function(){
	return "ternary operator result";
};
setTermTypePromotion = setTermTypePromotionProc;
globalOps = new Ops();
exports.ExpressionNode = ExpressionNode;
exports.RelationExpression = RelationExpression;
exports.Array = Array;
exports.initFromRValue = initFromRValue;

})(imports["js/EberonContextExpression.js"]);
imports["js/EberonContextIdentdef.js"] = {};
(function module$EberonContextIdentdef(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Context = require("js/Context.js");
var ContextIdentdef = require("js/ContextIdentdef.js");
var EberonContext = require("js/EberonContext.js");
var $scope = "EberonContextIdentdef";
function Type(){
	ContextIdentdef.Type.apply(this, arguments);
	this.ro = false;
}
RTL$.extend(Type, ContextIdentdef.Type, $scope);
Type.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "-"){
		this.ro = true;
	}
	ContextIdentdef.Type.prototype.handleLiteral.call(this, s);
};
Type.prototype.doMakeIdendef = function(){
	return new EberonContext.IdentdefInfo(this.id, this.export, this.ro);
};
exports.Type = Type;

})(imports["js/EberonContextIdentdef.js"]);
imports["js/EberonContextTypePromotion.js"] = {};
(function module$EberonContextTypePromotion(exports){
var ContextHierarchy = require("js/ContextHierarchy.js");
var EberonContextDesignator = require("js/EberonContextDesignator.js");
var EberonTypePromotion = require("js/EberonTypePromotion.js");
var $scope = "EberonContextTypePromotion";
function Type(){
	this.ignorePromotions = false;
	this.typePromotion = null;
	this.typePromotions = [];
}
Type.prototype.$scope = $scope;
Type.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = false;
	if (this.ignorePromotions){
	}
	else if (msg instanceof EberonContextDesignator.TransferPromotedTypesMsg){
		this.typePromotion = msg.promotion;
		this.typePromotions.push(this.typePromotion);
		result = true;
	}
	return result;
};
Type.prototype.doThen = function(){
	if (this.typePromotion != null){
		this.typePromotion.and();
	}
	this.ignorePromotions = true;
};
Type.prototype.alternate = function(){
	if (this.typePromotion != null){
		this.typePromotion.reset();
		this.typePromotion.or();
		this.typePromotion = null;
	}
	this.ignorePromotions = false;
};
Type.prototype.reset = function(){
	var $seq1 = this.typePromotions;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var p = $seq1[$key2];
		p.reset();
	}
};
exports.Type = Type;

})(imports["js/EberonContextTypePromotion.js"]);
imports["js/EberonOperatorScopes.js"] = {};
(function module$EberonOperatorScopes(exports){
var ContextHierarchy = require("js/ContextHierarchy.js");
var EberonContextTypePromotion = require("js/EberonContextTypePromotion.js");
var EberonScope = require("js/EberonScope.js");
var Scope = require("js/Scope.js");
var $scope = "EberonOperatorScopes";
Type.prototype.$scope = $scope;

function newScope(root/*PRoot*/){
	var scope = EberonScope.makeOperator(root.currentScope(), root.language().stdSymbols);
	root.pushScope(scope);
	return scope;
}
function Type(root/*PRoot*/){
	this.root = root;
	this.typePromotion = new EberonContextTypePromotion.Type();
	this.scope = newScope(root);
}
Type.prototype.handleMessage = function(msg/*VAR Message*/){
	return this.typePromotion.handleMessage(msg);
};
Type.prototype.doThen = function(){
	this.typePromotion.doThen();
};
Type.prototype.alternate = function(){
	var root = this.root;
	if (this.scope != null){
		root.popScope();
	}
	this.scope = newScope(root);
	this.typePromotion.alternate();
};
Type.prototype.reset = function(){
	this.root.popScope();
	this.typePromotion.reset();
};
exports.Type = Type;

})(imports["js/EberonOperatorScopes.js"]);
imports["js/EberonContextIf.js"] = {};
(function module$EberonContextIf(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var ContextIf = require("js/ContextIf.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var EberonOperatorScopes = require("js/EberonOperatorScopes.js");
var Object$ = require("js/Object.js");
var $scope = "EberonContextIf";
RTL$.extend(Type, ContextIf.Type, $scope);
function Type(parent/*PNode*/){
	ContextIf.Type.call(this, parent);
	this.scopes = new EberonOperatorScopes.Type(parent.root());
}
Type.prototype.handleLiteral = function(s/*STRING*/){
	ContextIf.Type.prototype.handleLiteral.call(this, s);
	if (s == "THEN"){
		this.scopes.doThen();
	}
	else if (s == "ELSIF" || s == "ELSE"){
		this.scopes.alternate();
	}
};
Type.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (!this.scopes.handleMessage(msg)){
		result = ContextIf.Type.prototype.handleMessage.call(this, msg);
	}
	return result;
};
Type.prototype.endParse = function(){
	this.scopes.reset();
	return ContextIf.Type.prototype.endParse.call(this);
};
exports.Type = Type;

})(imports["js/EberonContextIf.js"]);
imports["js/EberonContextLoop.js"] = {};
(function module$EberonContextLoop(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ContextLoop = require("js/ContextLoop.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var EberonContextDesignator = require("js/EberonContextDesignator.js");
var EberonMap = require("js/EberonMap.js");
var EberonOperatorScopes = require("js/EberonOperatorScopes.js");
var EberonScope = require("js/EberonScope.js");
var EberonString = require("js/EberonString.js");
var Object$ = require("js/Object.js");
var Scope = require("js/Scope.js");
var Symbols = require("js/Symbols.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "EberonContextLoop";
RTL$.extend(While, ContextLoop.While, $scope);
RTL$.extend(Repeat, ContextLoop.Repeat, $scope);
RTL$.extend(For, ContextLoop.For, $scope);
function ForEachVariable(){
	Variable.TypedVariable.apply(this, arguments);
}
RTL$.extend(ForEachVariable, Variable.TypedVariable, $scope);
RTL$.extend(ForEach, ContextExpression.ExpressionHandler, $scope);
function While(parent/*PNode*/){
	ContextLoop.While.call(this, parent);
	this.scopes = new EberonOperatorScopes.Type(parent.root());
}
While.prototype.handleLiteral = function(s/*STRING*/){
	ContextLoop.While.prototype.handleLiteral.call(this, s);
	if (s == "DO"){
		this.scopes.doThen();
	}
	else if (s == "ELSIF"){
		this.scopes.alternate();
	}
};
While.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (!this.scopes.handleMessage(msg)){
		result = ContextLoop.While.prototype.handleMessage.call(this, msg);
	}
	return result;
};
While.prototype.endParse = function(){
	this.scopes.reset();
	return ContextLoop.While.prototype.endParse.call(this);
};
function Repeat(parent/*PNode*/){
	ContextLoop.Repeat.call(this, parent);
	EberonScope.startOperatorScope(this);
}
Repeat.prototype.endParse = function(){
	EberonScope.endOperatorScope(this);
	return true;
};
function For(parent/*PNode*/){
	ContextLoop.For.call(this, parent);
	EberonScope.startOperatorScope(this);
}
For.prototype.handleInPlaceInit = function(symbol/*PSymbol*/, code/*STRING*/){
	this.doHandleInitCode(symbol.id(), "for (" + code);
	this.doHandleInitExpression(RTL$.typeGuard(symbol.info(), Types.Variable).type());
};
For.prototype.endParse = function(){
	EberonScope.endOperatorScope(this);
	return ContextLoop.For.prototype.endParse.call(this);
};
ForEachVariable.prototype.idType = function(){
	return "FOR variable";
};
ForEachVariable.prototype.isReference = function(){
	return false;
};
ForEachVariable.prototype.isReadOnly = function(){
	return true;
};
function ForEach(parent/*PNode*/){
	ContextExpression.ExpressionHandler.call(this, parent);
	this.keyId = '';
	this.valueId = '';
	this.code = CodeGenerator.nullGenerator();
	this.scopeWasCreated = false;
}
ForEach.prototype.handleIdent = function(id/*STRING*/){
	if (this.keyId.length == 0){
		this.keyId = id;
	}
	else {
		this.valueId = id;
	}
};
ForEach.prototype.codeGenerator = function(){
	return this.code;
};

function makeVariable(id/*STRING*/, type/*PStorageType*/, scope/*PType*/){
	var v = new ForEachVariable(type);
	var s = new Symbols.Symbol(id, v);
	scope.addSymbol(s, false);
}
ForEach.prototype.handleExpression = function(e/*PType*/){
	var elementsType = null;
	var isString = false;
	var type = e.type();
	if (type instanceof Types.Array){
		elementsType = type.elementsType;
	}
	else if (type == EberonString.string() || Types.isString(type)){
		elementsType = Types.basic().ch;
		isString = true;
	}
	else {
		Errors.raise("expression of type ARRAY, STRING or MAP is expected in FOR, got '" + type.description() + "'");
	}
	var root = this.root();
	var currentScope = root.currentScope();
	var scope = EberonScope.makeOperator(currentScope, root.language().stdSymbols);
	root.pushScope(scope);
	this.scopeWasCreated = true;
	var code = this.parent().codeGenerator();
	var mapVar = currentScope.generateTempVar("seq");
	code.write("var " + mapVar + " = " + e.code() + ";" + Chars.ln);
	var keyId = this.keyId;
	var valueId = this.valueId;
	if (valueId.length == 0){
		valueId = keyId;
		keyId = currentScope.generateTempVar("key");
	}
	var isMap = type instanceof EberonMap.Type;
	if (isMap){
		code.write("for(var " + keyId + " in " + mapVar + ")");
	}
	else {
		code.write("for(var " + keyId + " = 0; " + keyId + " < " + mapVar + ".length; ++" + keyId + ")");
	}
	code.openScope();
	code.write("var " + valueId + " = " + mapVar);
	if (isString){
		code.write(".charCodeAt(" + keyId + ")");
	}
	else {
		code.write("[" + keyId + "];");
	}
	code.write(Chars.ln);
	this.code = code;
	var keyType = Types.basic().integer;
	if (isMap){
		keyType = EberonString.string();
	}
	if (valueId.length != 0){
		makeVariable(keyId, keyType, scope);
	}
	makeVariable(valueId, elementsType, scope);
};
ForEach.prototype.endParse = function(){
	this.code.closeScope("");
	if (this.scopeWasCreated){
		this.root().popScope();
	}
	return true;
};
exports.While = While;
exports.Repeat = Repeat;
exports.For = For;
exports.ForEach = ForEach;

})(imports["js/EberonContextLoop.js"]);
imports["js/EberonContextInPlace.js"] = {};
(function module$EberonContextInPlace(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var EberonContextDesignator = require("js/EberonContextDesignator.js");
var EberonContextExpression = require("js/EberonContextExpression.js");
var EberonContextLoop = require("js/EberonContextLoop.js");
var EberonRecord = require("js/EberonRecord.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var Symbols = require("js/Symbols.js");
var Types = require("js/Types.js");
var $scope = "EberonContextInPlace";
function VariableInit(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
	this.id = '';
	this.code = '';
	this.symbol = null;
}
RTL$.extend(VariableInit, ContextExpression.ExpressionHandler, $scope);
function VariableInitFor(){
	VariableInit.apply(this, arguments);
}
RTL$.extend(VariableInitFor, VariableInit, $scope);
VariableInit.prototype.codeGenerator = function(){
	return CodeGenerator.nullGenerator();
};
VariableInit.prototype.handleIdent = function(id/*STRING*/){
	this.id = id;
};
VariableInit.prototype.handleLiteral = function(s/*STRING*/){
	this.code = "var " + CodeGenerator.mangleId(this.id) + " = ";
};
VariableInit.prototype.handleExpression = function(e/*PType*/){
	var resultType = null;
	this.code = this.code + EberonContextExpression.initFromRValue(this, e, "variable '" + this.id + "'", {set: function($v){resultType = $v;}, get: function(){return resultType;}});
	var v = new EberonContextDesignator.TypeNarrowVariable(resultType, false, false, this.id);
	this.symbol = new Symbols.Symbol(this.id, v);
};
VariableInit.prototype.onParsed = function(){
	this.parent().codeGenerator().write(this.code);
};
VariableInit.prototype.endParse = function(){
	var result = false;
	if (this.symbol != null){
		this.root().currentScope().addSymbol(this.symbol, false);
		this.onParsed();
		result = true;
	}
	return result;
};
VariableInitFor.prototype.onParsed = function(){
	RTL$.typeGuard(this.parent(), EberonContextLoop.For).handleInPlaceInit(this.symbol, this.code);
};
exports.VariableInit = VariableInit;
exports.VariableInitFor = VariableInitFor;

})(imports["js/EberonContextInPlace.js"]);
imports["js/EberonContextProcedure.js"] = {};
(function module$EberonContextProcedure(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var CodeGenerator = require("js/CodeGenerator.js");
var Context = require("js/Context.js");
var ContextDesignator = require("js/ContextDesignator.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextModule = require("js/ContextModule.js");
var ContextProcedure = require("js/ContextProcedure.js");
var ContextType = require("js/ContextType.js");
var EberonConstructor = require("js/EberonConstructor.js");
var EberonContext = require("js/EberonContext.js");
var EberonContextDesignator = require("js/EberonContextDesignator.js");
var EberonDynamicArray = require("js/EberonDynamicArray.js");
var EberonMap = require("js/EberonMap.js");
var EberonRecord = require("js/EberonRecord.js");
var EberonTypes = require("js/EberonTypes.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var ExpressionTree = require("js/ExpressionTree.js");
var LanguageContext = require("js/LanguageContext.js");
var Object$ = require("js/Object.js");
var Procedure = require("js/Procedure.js");
var Record = require("js/Record.js");
var Types = require("js/Types.js");
var Variable = require("js/Variable.js");
var $scope = "EberonContextProcedure";
function ProcOrMethodDeclaration(){
	ContextProcedure.Declaration.apply(this, arguments);
	this.boundType = null;
	this.baseConstructorWasCalled = false;
	this.methodId = null;
	this.methodType = null;
	this.isConstructor = false;
	this.initedFields = [];
	this.type = null;
	this.endingId = '';
}
RTL$.extend(ProcOrMethodDeclaration, ContextProcedure.Declaration, $scope);
function ArgumentVariable(){
	Variable.ArgumentVariable.apply(this, arguments);
}
RTL$.extend(ArgumentVariable, Variable.ArgumentVariable, $scope);
function ProcOrMethodId(){
	ContextHierarchy.Node.apply(this, arguments);
	this.maybeTypeId = '';
	this.type = null;
}
RTL$.extend(ProcOrMethodId, ContextHierarchy.Node, $scope);
function BaseInit(){
	ContextExpression.ExpressionHandler.apply(this, arguments);
	this.initCall = null;
	this.initField = '';
	this.typeOnDemand = null;
}
RTL$.extend(BaseInit, ContextExpression.ExpressionHandler, $scope);
function FormalParameters(){
	ContextProcedure.FormalParameters.apply(this, arguments);
}
RTL$.extend(FormalParameters, ContextProcedure.FormalParameters, $scope);
function FormalParametersProcDecl(){
	ContextProcedure.FormalParametersProcDecl.apply(this, arguments);
}
RTL$.extend(FormalParametersProcDecl, ContextProcedure.FormalParametersProcDecl, $scope);
function ModuleDeclaration(){
	ContextModule.Declaration.apply(this, arguments);
}
RTL$.extend(ModuleDeclaration, ContextModule.Declaration, $scope);
function GetConstructorBoundTypeMsg(){
	ContextHierarchy.Message.call(this);
}
RTL$.extend(GetConstructorBoundTypeMsg, ContextHierarchy.Message, $scope);
function GetConstructorSuperMsg(){
	ContextHierarchy.Message.call(this);
}
RTL$.extend(GetConstructorSuperMsg, ContextHierarchy.Message, $scope);
RTL$.extend(InitFieldMsg, ContextHierarchy.Message, $scope);
RTL$.extend(MethodOrProcMsg, ContextHierarchy.Message, $scope);

function superMethodCallGenerator(cx/*PType*/, type/*Type*/){
	var args = Procedure.makeArgumentsCode(cx);
	args.write(Expression.makeSimple("this", null), null, null);
	return Procedure.makeProcCallGeneratorWithCustomArgs(cx, type, args);
}

function handleSuperCall(d/*ProcOrMethodDeclaration*/){
	var procId = null;
	if (d.methodId == null){
		Errors.raise("SUPER can be used only in methods");
	}
	var baseType = RTL$.typeGuard(d.boundType.base, EberonRecord.Record);
	if (baseType == null){
		Errors.raise("'" + d.boundType.description() + "' has no base type - SUPER cannot be used");
	}
	var id = d.methodId.id();
	if (!d.isConstructor){
		EberonRecord.requireMethodDefinition(baseType, id, "cannot use abstract method(s) in SUPER calls");
		procId = new Procedure.Id(new EberonTypes.MethodType(id, d.methodType.procType(), superMethodCallGenerator), id, false);
	}
	return new EberonContextDesignator.SuperMethodInfo(procId, CodeGenerator.mangleId(d.qualifyScope(baseType.scope) + baseType.description()) + ".prototype." + id + ".call");
}

function handleFieldInit(d/*PProcOrMethodDeclaration*/, id/*STRING*/){
	if (!Object.prototype.hasOwnProperty.call(d.boundType.fields, id)){
		Errors.raise("'" + id + "' is not record '" + d.boundType.description() + "' own field");
	}
	if (d.initedFields.indexOf(id) != -1){
		Errors.raise("field '" + id + "' is already initialized");
	}
	d.initedFields.push(id);
	var type = RTL$.getMappedValue(d.boundType.fields, id).type();
	return EberonConstructor.makeFieldInitCall(type, ContextHierarchy.makeLanguageContext(d), id);
}

function handleTypePromotionMadeInSeparateStatement(msg/*VAR Message*/){
	return EberonContextDesignator.breakTypePromotion(msg);
}
ProcOrMethodDeclaration.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (msg instanceof EberonContextDesignator.GetMethodSelfMsg){
		if (this.boundType == null){
			Errors.raise("SELF can be used only in methods");
		}
		result = this.boundType;
	}
	else if (msg instanceof EberonContextDesignator.GetSelfAsPointerMsg){
		this.boundType.requireNewOnly();
		result = this.boundType;
	}
	else if (msg instanceof GetConstructorBoundTypeMsg){
		result = this.boundType;
	}
	else if (msg instanceof GetConstructorSuperMsg){
		this.baseConstructorWasCalled = true;
		result = handleSuperCall(this);
	}
	else if (msg instanceof EberonContextDesignator.GetMethodSuperMsg){
		if (this.isConstructor){
			Errors.raise("cannot call base constructor from procedure body (use '| SUPER' to pass parameters to base constructor)");
		}
		result = handleSuperCall(this);
	}
	else if (msg instanceof InitFieldMsg){
		result = handleFieldInit(this, msg.id);
	}
	else if (msg instanceof MethodOrProcMsg){
		var id = msg.id;
		var type = msg.type;
		if (type != null){
			this.methodId = id;
			this.boundType = type;
			this.isConstructor = type.name == id.id();
		}
		ContextProcedure.handleIdentdef(this, id);
	}
	else if (handleTypePromotionMadeInSeparateStatement(msg)){
	}
	else {
		result = ContextProcedure.Declaration.prototype.handleMessage.call(this, msg);
	}
	return result;
};
ProcOrMethodDeclaration.prototype.doProlog = function(){
	var result = '';
	if (this.boundType != null){
		var boundTypeCode = CodeGenerator.mangleId(this.boundType.name);
		if (this.isConstructor){
			result = "function " + boundTypeCode + "(";
		}
		else {
			result = boundTypeCode + ".prototype." + this.methodId.id() + " = function(";
		}
	}
	else {
		result = ContextProcedure.Declaration.prototype.doProlog.call(this);
	}
	return result;
};
ProcOrMethodDeclaration.prototype.doEpilog = function(){
	var result = '';
	if (this.boundType != null && !this.isConstructor){
		result = ";" + Chars.ln;
	}
	else {
		result = ContextProcedure.Declaration.prototype.doEpilog.call(this);
	}
	return result;
};
ProcOrMethodDeclaration.prototype.doBeginBody = function(){
	ContextProcedure.Declaration.prototype.doBeginBody.call(this);
	if (this.isConstructor){
		this.codeGenerator().write(this.boundType.baseConstructorCallCode + EberonRecord.fieldsInitializationCode(this.boundType, this));
	}
};
ProcOrMethodDeclaration.prototype.doMakeArgumentVariable = function(arg/*ProcedureArgument*/, name/*STRING*/){
	var result = null;
	if (arg.type instanceof Types.Record || !arg.isVar && arg.type instanceof Record.Pointer){
		result = new EberonContextDesignator.TypeNarrowVariable(arg.type, arg.isVar, !arg.isVar, name);
	}
	else {
		result = new ArgumentVariable(name, arg.type, arg.isVar);
	}
	return result;
};
ProcOrMethodDeclaration.prototype.doMakeReturnCode = function(e/*PType*/, op/*CastOp*/){
	var result = '';
	var optimize = false;
	if (e.type() instanceof Types.Array){
		if (Expression.isTemporary(e)){
			optimize = true;
		}
		else {
			var info = e.info();
			optimize = info instanceof Variable.Declared && info.scope == this.root().currentScope();
		}
	}
	if (optimize){
		result = e.code();
	}
	else {
		result = ContextProcedure.Declaration.prototype.doMakeReturnCode.call(this, e, op);
	}
	return result;
};
ProcOrMethodDeclaration.prototype.setType = function(type/*PStorageType*/){
	if (this.methodId != null){
		var t = RTL$.typeGuard(type, Procedure.Type);
		this.methodType = new EberonTypes.MethodType(this.methodId.id(), t, Procedure.makeProcCallGenerator);
		this.type = t;
	}
	else {
		ContextProcedure.Declaration.prototype.setType.call(this, type);
	}
};
ProcOrMethodDeclaration.prototype.handleIdent = function(id/*STRING*/){
	if (this.boundType == null){
		ContextProcedure.Declaration.prototype.handleIdent.call(this, id);
	}
	else if (this.endingId.length != 0){
		this.endingId = this.endingId + "." + id;
	}
	else {
		this.endingId = id;
	}
};
ProcOrMethodDeclaration.prototype.endParse = function(){
	var baseConstructor = null;
	var result = ContextProcedure.Declaration.prototype.endParse.call(this);
	if (result){
		if (this.boundType != null){
			if (this.endingId.length != 0){
				var expected = this.boundType.name + "." + this.id.id();
				if (this.endingId != expected){
					Errors.raise("mismatched method names: expected '" + expected + "' at the end (or nothing), got '" + this.endingId + "'");
				}
			}
			if (this.isConstructor){
				this.boundType.defineConstructor(this.methodType.procType());
				var base = this.boundType.base;
				if (base != null){
					baseConstructor = EberonRecord.constructor$(RTL$.typeGuard(base, EberonRecord.Record));
				}
				if (!this.baseConstructorWasCalled && baseConstructor != null && baseConstructor.args().length != 0){
					Errors.raise("base record constructor has parameters but was not called (use '| SUPER' to pass parameters to base constructor)");
				}
				if (this.baseConstructorWasCalled && (baseConstructor == null || baseConstructor.args().length == 0)){
					Errors.raise("base record constructor has no parameters and will be called automatically (do not use '| SUPER' to call base constructor)");
				}
			}
			else {
				this.boundType.defineMethod(this.methodId, this.methodType);
			}
		}
	}
	return result;
};
ArgumentVariable.prototype.isReadOnly = function(){
	return !this.var;
};
ProcOrMethodId.prototype.handleIdent = function(id/*STRING*/){
	this.maybeTypeId = id;
};
ProcOrMethodId.prototype.handleLiteral = function(s/*STRING*/){
	var ss = ContextHierarchy.getSymbolAndScope(this.root(), this.maybeTypeId);
	var type = ExpressionTree.unwrapType(ss.symbol().info());
	if (!(type instanceof EberonRecord.Record)){
		Errors.raise("RECORD type expected in method declaration, got '" + type.description() + "'");
	}
	else if (ss.scope() != this.root().currentScope()){
		Errors.raise("method should be defined in the same scope as its bound type '" + this.maybeTypeId + "'");
	}
	else {
		this.type = type;
	}
};
ProcOrMethodId.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	if (this.type != null && id.exported()){
		Errors.raise("method implementation cannot be exported: " + id.id());
	}
	EberonContext.checkOrdinaryExport(id, "procedure");
	var void$ = this.handleMessage(new MethodOrProcMsg(id, this.type));
};

function baseInitType(b/*VAR BaseInit*/){
	if (b.typeOnDemand == null){
		b.typeOnDemand = RTL$.typeGuard(b.handleMessage(new GetConstructorBoundTypeMsg()), EberonRecord.Record);
	}
	return b.typeOnDemand;
}
BaseInit.prototype.codeGenerator = function(){
	return CodeGenerator.nullGenerator();
};
BaseInit.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (msg instanceof ContextDesignator.BeginCallMsg){
	}
	else if (msg instanceof ContextDesignator.EndCallMsg){
		var e = this.initCall.end();
		if (this.initField.length != 0){
			baseInitType(this).setFieldInitializationCode(this.initField, e.code());
		}
		else {
			baseInitType(this).setBaseConstructorCallCode(e.code());
		}
	}
	else {
		result = ContextExpression.ExpressionHandler.prototype.handleMessage.call(this, msg);
	}
	return result;
};
BaseInit.prototype.handleIdent = function(id/*STRING*/){
	this.initField = id;
	this.initCall = RTL$.typeGuard(this.handleMessage(new InitFieldMsg(id)), Procedure.CallGenerator);
};
BaseInit.prototype.handleExpression = function(e/*PType*/){
	this.initCall.handleArgument(e);
};
BaseInit.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "SUPER"){
		var ms = this.handleMessage(new GetConstructorSuperMsg());
		this.initCall = EberonConstructor.makeBaseConstructorCall(RTL$.typeGuard(baseInitType(this).base, EberonRecord.Record), ContextHierarchy.makeLanguageContext(this));
	}
};

function assertArgumentIsNotNonVarDynamicArray(msg/*VAR Message*/){
	var type = null;
	if (msg instanceof ContextProcedure.AddArgumentMsg){
		var arg = msg.arg;
		if (!arg.isVar){
			type = arg.type;
			while (true){
				if (type instanceof Types.Array){
					if (type instanceof EberonDynamicArray.DynamicArray){
						Errors.raise("dynamic array has no use as non-VAR argument '" + msg.name + "'");
					}
					type = RTL$.typeGuard(type, Types.Array).elementsType;
				} else break;
			}
		}
	}
}
FormalParameters.prototype.handleMessage = function(msg/*VAR Message*/){
	assertArgumentIsNotNonVarDynamicArray(msg);
	return ContextProcedure.FormalParameters.prototype.handleMessage.call(this, msg);
};

function isEberonArrayOrMap(type/*PStorageType*/){
	return type instanceof EberonDynamicArray.DynamicArray || type instanceof EberonMap.Type;
}
FormalParameters.prototype.doCheckResultType = function(type/*PStorageType*/){
	if (!isEberonArrayOrMap(type)){
		ContextProcedure.FormalParameters.prototype.doCheckResultType.call(this, type);
	}
};
FormalParametersProcDecl.prototype.handleMessage = function(msg/*VAR Message*/){
	assertArgumentIsNotNonVarDynamicArray(msg);
	return ContextProcedure.FormalParametersProcDecl.prototype.handleMessage.call(this, msg);
};
FormalParametersProcDecl.prototype.doCheckResultType = function(type/*PStorageType*/){
	if (!isEberonArrayOrMap(type)){
		ContextProcedure.FormalParametersProcDecl.prototype.doCheckResultType.call(this, type);
	}
};
ModuleDeclaration.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (!handleTypePromotionMadeInSeparateStatement(msg)){
		result = ContextModule.Declaration.prototype.handleMessage.call(this, msg);
	}
	return result;
};
function InitFieldMsg(id/*STRING*/){
	ContextHierarchy.Message.call(this);
	this.id = id;
}
function MethodOrProcMsg(id/*PIdentdefInfo*/, type/*PRecord*/){
	ContextHierarchy.Message.call(this);
	this.id = id;
	this.type = type;
}
exports.ProcOrMethodDeclaration = ProcOrMethodDeclaration;
exports.ProcOrMethodId = ProcOrMethodId;
exports.BaseInit = BaseInit;
exports.FormalParameters = FormalParameters;
exports.FormalParametersProcDecl = FormalParametersProcDecl;
exports.ModuleDeclaration = ModuleDeclaration;
exports.MethodOrProcMsg = MethodOrProcMsg;

})(imports["js/EberonContextProcedure.js"]);
imports["js/EberonContextType.js"] = {};
(function module$EberonContextType(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Chars = require("js/Chars.js");
var Context = require("js/Context.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextProcedure = require("js/ContextProcedure.js");
var ContextType = require("js/ContextType.js");
var EberonContext = require("js/EberonContext.js");
var EberonDynamicArray = require("js/EberonDynamicArray.js");
var EberonMap = require("js/EberonMap.js");
var EberonRecord = require("js/EberonRecord.js");
var EberonTypes = require("js/EberonTypes.js");
var Errors = require("js/Errors.js");
var ExpressionTree = require("js/ExpressionTree.js");
var Object$ = require("js/Object.js");
var Procedure = require("js/Procedure.js");
var R = require("js/Record.js");
var ScopeBase = require("js/ScopeBase.js");
var Types = require("js/Types.js");
var $scope = "EberonContextType";
var dynamicArrayLength = -1;
function Declaration(){
	ContextType.Declaration.apply(this, arguments);
}
RTL$.extend(Declaration, ContextType.Declaration, $scope);
function FormalType(){
	ContextType.HandleSymbolAsType.apply(this, arguments);
	this.arrayDimensions = [];
	this.dynamicDimension = false;
}
RTL$.extend(FormalType, ContextType.HandleSymbolAsType, $scope);
RTL$.extend(Record, ContextType.Record, $scope);
function Array(){
	ContextType.Array.apply(this, arguments);
}
RTL$.extend(Array, ContextType.Array, $scope);
function ArrayDimensions(){
	ContextType.ArrayDimensions.apply(this, arguments);
}
RTL$.extend(ArrayDimensions, ContextType.ArrayDimensions, $scope);
function MethodHeading(){
	ContextType.DeclarationAndIdentHandle.apply(this, arguments);
	this.id = null;
	this.type = null;
}
RTL$.extend(MethodHeading, ContextType.DeclarationAndIdentHandle, $scope);
function Map(){
	ContextType.DeclarationHandle.apply(this, arguments);
}
RTL$.extend(Map, ContextType.DeclarationHandle, $scope);
RTL$.extend(MethodDeclMsg, ContextHierarchy.Message, $scope);
Declaration.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	EberonContext.checkOrdinaryExport(RTL$.typeGuard(id, EberonContext.IdentdefInfo), "type");
	ContextType.Declaration.prototype.handleIdentdef.call(this, id);
};
FormalType.prototype.setType = function(type/*PStorageType*/){
	var result = type;
	for (var i = this.arrayDimensions.length - 1 | 0; i >= 0; --i){
		if (this.arrayDimensions[i]){
			result = new EberonDynamicArray.DynamicArray(result);
		}
		else {
			result = this.root().language().types.makeOpenArray(result);
		}
	}
	RTL$.typeGuard(this.parent(), ContextType.HandleSymbolAsType).setType(result);
};
FormalType.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "*"){
		this.dynamicDimension = true;
	}
	else if (s == "OF"){
		this.arrayDimensions.push(this.dynamicDimension);
		this.dynamicDimension = false;
	}
};

function recordTypeFactory(name/*STRING*/, cons/*STRING*/, scope/*PType*/){
	return new EberonRecord.Record(name, cons, scope);
}
function Record(parent/*PDeclaration*/){
	ContextType.Record.call(this, parent, recordTypeFactory);
}

function checkMethodExport(record/*Record*/, method/*PIdentdefInfo*/, hint/*STRING*/){
	if (!record.declaration.id.exported() && method.exported()){
		Errors.raise(hint + " '" + method.id() + "' cannot be exported because record itslef is not exported");
	}
}
Record.prototype.handleMessage = function(msg/*VAR Message*/){
	var result = null;
	if (msg instanceof MethodDeclMsg){
		var methodType = msg.type;
		var boundType = RTL$.typeGuard(this.type, EberonRecord.Record);
		var id = msg.id.id();
		if (boundType.name == id){
			checkMethodExport(this, msg.id, "constructor");
			boundType.declareConstructor(methodType, msg.id.exported());
		}
		else {
			boundType.addMethod(msg.id, new EberonTypes.MethodType(id, methodType, Procedure.makeProcCallGenerator));
			checkMethodExport(this, msg.id, "method");
		}
	}
	else if (msg instanceof ContextProcedure.EndParametersMsg){
	}
	else if (msg instanceof ContextProcedure.AddArgumentMsg){
	}
	else {
		result = ContextType.Record.prototype.handleMessage.call(this, msg);
	}
	return result;
};
Record.prototype.doMakeField = function(field/*PIdentdefInfo*/, type/*PStorageType*/){
	return new EberonRecord.Field(field, type, RTL$.typeGuard(this.type, EberonRecord.Record));
};
Record.prototype.doGenerateBaseConstructorCallCode = function(){
	var result = '';
	var base = this.type.base;
	if (base != null){
		var baseConstructor = EberonRecord.constructor$(RTL$.typeGuard(base, EberonRecord.Record));
		if (baseConstructor == null || baseConstructor.args().length == 0){
			result = ContextType.Record.prototype.doGenerateBaseConstructorCallCode.call(this);
		}
		else {
			result = this.qualifiedBaseConstructor() + ".apply(this, arguments);" + Chars.ln;
		}
	}
	return result;
};
Record.prototype.endParse = function(){
	var result = true;
	var type = RTL$.typeGuard(this.type, EberonRecord.Record);
	if (type.customConstructor == null){
		result = ContextType.Record.prototype.endParse.call(this);
	}
	else {
		this.codeGenerator().write(this.generateInheritance());
		type.setRecordInitializationCode(this.doGenerateBaseConstructorCallCode());
	}
	return result;
};
Array.prototype.doMakeInit = function(type/*PStorageType*/, dimensions/*STRING*/, length/*INTEGER*/){
	var result = '';
	if (length == dynamicArrayLength){
		result = "[]";
	}
	else if (type instanceof EberonRecord.Record && EberonRecord.hasParameterizedConstructor(type)){
		Errors.raise("cannot use '" + type.description() + "' as an element of static array because it has constructor with parameters");
	}
	else {
		result = ContextType.Array.prototype.doMakeInit.call(this, type, dimensions, length);
	}
	return result;
};
Array.prototype.doMakeType = function(elementsType/*PStorageType*/, init/*STRING*/, length/*INTEGER*/){
	var result = null;
	if (length == dynamicArrayLength){
		result = new EberonDynamicArray.DynamicArray(elementsType);
	}
	else {
		result = ContextType.Array.prototype.doMakeType.call(this, elementsType, init, length);
	}
	return result;
};
ArrayDimensions.prototype.handleLiteral = function(s/*STRING*/){
	if (s == "*"){
		this.doAddDimension(dynamicArrayLength);
	}
	else {
		ContextType.ArrayDimensions.prototype.handleLiteral.call(this, s);
	}
};
MethodHeading.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	this.id = RTL$.typeGuard(id, EberonContext.IdentdefInfo);
	EberonContext.checkOrdinaryExport(this.id, "method");
};
MethodHeading.prototype.typeName = function(){
	return "";
};
MethodHeading.prototype.setType = function(type/*PStorageType*/){
	this.type = RTL$.typeGuard(type, Procedure.Type);
};
MethodHeading.prototype.endParse = function(){
	var void$ = this.handleMessage(new MethodDeclMsg(this.id, this.type));
	return true;
};
Map.prototype.handleQIdent = function(q/*QIdent*/){
	var s = ContextHierarchy.getQIdSymbolAndScope(this.root(), q);
	var type = ExpressionTree.unwrapType(s.symbol().info());
	this.setType(type);
};
Map.prototype.setType = function(type/*PStorageType*/){
	RTL$.typeGuard(this.parent(), ContextType.HandleSymbolAsType).setType(new EberonMap.Type(type));
};
Map.prototype.isAnonymousDeclaration = function(){
	return true;
};
Map.prototype.typeName = function(){
	return "";
};
function MethodDeclMsg(id/*PIdentdefInfo*/, type/*PType*/){
	ContextHierarchy.Message.call(this);
	this.id = id;
	this.type = type;
}

function isTypeRecursive(type/*PType*/, base/*PType*/){
	var result = !(type instanceof EberonDynamicArray.DynamicArray) && !(type instanceof EberonMap.Type);
	if (result){
		result = ContextType.isTypeRecursive(type, base);
	}
	return result;
}
exports.Declaration = Declaration;
exports.FormalType = FormalType;
exports.Record = Record;
exports.Array = Array;
exports.ArrayDimensions = ArrayDimensions;
exports.MethodHeading = MethodHeading;
exports.Map = Map;
exports.isTypeRecursive = isTypeRecursive;

})(imports["js/EberonContextType.js"]);
imports["js/EberonContextVar.js"] = {};
(function module$EberonContextVar(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var Context = require("js/Context.js");
var ContextVar = require("js/ContextVar.js");
var EberonContext = require("js/EberonContext.js");
var EberonRecord = require("js/EberonRecord.js");
var $scope = "EberonContextVar";
function Declaration(){
	ContextVar.Declaration.apply(this, arguments);
}
RTL$.extend(Declaration, ContextVar.Declaration, $scope);
Declaration.prototype.handleIdentdef = function(id/*PIdentdefInfo*/){
	EberonContext.checkOrdinaryExport(RTL$.typeGuard(id, EberonContext.IdentdefInfo), "variable");
	ContextVar.Declaration.prototype.handleIdentdef.call(this, id);
};
Declaration.prototype.doInitCode = function(){
	var type = this.type;
	if (type instanceof EberonRecord.Record){
		EberonRecord.ensureCanBeInstantiated(this, type, EberonRecord.instantiateForVar);
	}
	return ContextVar.Declaration.prototype.doInitCode.call(this);
};
exports.Declaration = Declaration;

})(imports["js/EberonContextVar.js"]);
imports["js/EberonLanguageContext.js"] = {};
(function module$EberonLanguageContext(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var EberonContextDesignator = require("js/EberonContextDesignator.js");
var EberonMap = require("js/EberonMap.js");
var EberonTypePromotion = require("js/EberonTypePromotion.js");
var Expression = require("js/Expression.js");
var LanguageContext = require("js/LanguageContext.js");
var Types = require("js/Types.js");
var $scope = "EberonLanguageContext";
function CodeTraits(){
	LanguageContext.CodeTraits.apply(this, arguments);
}
RTL$.extend(CodeTraits, LanguageContext.CodeTraits, $scope);
CodeTraits.prototype.referenceCode = function(info/*VAR Id*/){
	return info instanceof EberonContextDesignator.SelfVariable ? "this" : info instanceof EberonTypePromotion.Variable ? info.id() : info instanceof EberonMap.ElementVariable && !info.elementType.isScalar() ? info.rval : LanguageContext.CodeTraits.prototype.referenceCode.call(this, info);
};
CodeTraits.prototype.assign = function(info/*VAR Id*/, right/*PType*/){
	var result = '';
	if (info instanceof EberonMap.ElementVariable){
		result = info.lval + " = " + Expression.deref(right).code();
	}
	else {
		result = LanguageContext.CodeTraits.prototype.assign.call(this, info, right);
	}
	return result;
};
exports.CodeTraits = CodeTraits;

})(imports["js/EberonLanguageContext.js"]);
imports["js/EberonSymbols.js"] = {};
(function module$EberonSymbols(exports){
var RTL$ = require("eberon/eberon_rtl.js");
var EberonMap = require("js/EberonMap.js");
var EberonString = require("js/EberonString.js");
var Procedure = require("js/Procedure.js");
var Scope = require("js/Scope.js");
var Symbols = require("js/Symbols.js");
var Types = require("js/Types.js");

function lenArgumentCheck(argType/*PType*/){
	return Procedure.lenArgumentCheck(argType) || argType == EberonString.string();
}

function makeStd(){
	var result = Scope.makeStdSymbols();
	var proc = Procedure.makeLen(lenArgumentCheck);
	result[proc.id()] = proc;
	Scope.addSymbolForType(EberonString.string(), result);
	return RTL$.clone(result, {map: null}, undefined);
}
exports.makeStd = makeStd;

})(imports["js/EberonSymbols.js"]);
imports["eberon/eberon_grammar.js"] = {};
(function module$eberon_grammar(exports){
"use strict";

var Cast = require("js/EberonCast.js");
var EbArray = require("js/EberonArray.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ContextType = require("js/ContextType.js");
var EberonContext = require("js/EberonContext.js");
var EberonContextCase = require("js/EberonContextCase.js");
var EberonContextDesignator = require("js/EberonContextDesignator.js");
var EberonContextExpression = require("js/EberonContextExpression.js");
var EberonContextIdentdef = require("js/EberonContextIdentdef.js");
var EberonContextIf = require("js/EberonContextIf.js");
var EberonContextInPlace = require("js/EberonContextInPlace.js");
var EberonContextLoop = require("js/EberonContextLoop.js");
var EberonContextProcedure = require("js/EberonContextProcedure.js");
var EberonContextType = require("js/EberonContextType.js");
var EberonContextVar = require("js/EberonContextVar.js");
var EberonLanguageContext = require("js/EberonLanguageContext.js");
var Grammar = require("grammar.js");
var EbRtl = require("js/EberonRtl.js");
var EbRtlCode = require("eberon/eberon_rtl.js");
var EbOperator = require("js/EberonOperator.js");
var Parser = require("parser.js");
var Symbols = require("js/EberonSymbols.js");

var and = Parser.and;
var context = Parser.context;
var optional = Parser.optional;
var or = Parser.or;
var repeat = Parser.repeat;
var required = Parser.required;

function makeStrucType(base, type){
    var mapType = context(and("MAP", "OF", type), EberonContextType.Map);
    return or(base, mapType);
}

function makeStatement(base, statementSequence, ident, expression){
    return or(context(and("FOR", ident, optional(and(",", ident)), "IN", expression, "DO", 
                          statementSequence, required("END", "END expected (FOR)")), 
                      EberonContextLoop.ForEach),
              base
              );
}

function makeProcedureHeading(ident, identdef, formalParameters){
    return and("PROCEDURE",
               context(and(optional(and(ident, ".")), identdef), EberonContextProcedure.ProcOrMethodId),
               context(optional(formalParameters), EberonContextProcedure.FormalParametersProcDecl)
               );
}

function makeInPlaceInit(ident, expression, inPlaceContext){
    return context(and(ident, "<-", required(expression, "initialization expression expected")), inPlaceContext);
}

function makeAssignmentOrProcedureCall(ident, designator, assignment, expression){
    return or(
        makeInPlaceInit(ident, expression, EberonContextInPlace.VariableInit),
        context(and(designator, optional(assignment)), EberonContextDesignator.AssignmentOrProcedureCall)
        );
}

function makeIdentdef(ident){
    return context(and(ident, optional(or("*", "-"))), EberonContextIdentdef.Type);
}

function makeDesignator(ident, qualident, selector, actualParameters){
    var self = and("SELF", optional(and("(", "POINTER", ")")));
    var operatorNew = and("NEW", context(and(qualident, actualParameters), EberonContextDesignator.OperatorNew));
    var designator = context(
        and(or(self, "SUPER", operatorNew, qualident), 
            repeat(or(selector, actualParameters))), EberonContextDesignator.Type);
    return { 
        factor: context(designator, EberonContextDesignator.ExpressionProcedureCall),
        assignmentOrProcedureCall: function(assignment, expression){
            return makeAssignmentOrProcedureCall(ident, designator, assignment, expression);
        }
    };
}

function makeExpression(base){
    var relExp = context(base, EberonContextExpression.RelationExpression);
    var expression = context(
        and(relExp, optional(and("?", relExp, 
                                 required(":", "expected \":\" after \"?\" in ternary operator"), 
                                 required(function(){ return expression.apply(this, arguments);}, 
                                          "expression is expected after \":\" in ternary operator")))),
        EberonContextExpression.ExpressionNode);
    return expression;
}

function makeProcedureDeclaration(ident, procedureHeading, procedureBody){
    return context(and(procedureHeading, ";",
                       procedureBody,
                       optional(and(ident, optional(and(".", ident))))),
                   EberonContextProcedure.ProcOrMethodDeclaration);
}

function makeMethodHeading(identdef, formalParameters){
    return context(
        and("PROCEDURE",
            identdef,
            context(optional(formalParameters), EberonContextProcedure.FormalParametersProcDecl)),
        EberonContextType.MethodHeading);
}

function makeFieldList(identdef, identList, type, formalParameters){
    return context(
        or(makeMethodHeading(identdef, formalParameters),
               and(identList, ":", type)),
        ContextType.FieldList);
}

function makeFieldListSequence(base){
    return and(base, optional(";"));
}

function makeForInit(ident, expression, assignment){
    return or(makeInPlaceInit(ident, expression, EberonContextInPlace.VariableInitFor), 
              and(ident, assignment));
}

function makeArrayDimensions(constExpression){
    var oneDimension = or("*", constExpression);
    return context(and(oneDimension, repeat(and(",", oneDimension))), 
                   EberonContextType.ArrayDimensions);
}

function makeFormalArray(){
    return and("ARRAY", optional("*"), "OF");
}

function makeFormalResult(base, ident, actualParameters){
    var initField = and(ident, actualParameters);
    var followingFields = repeat(and(",", initField));
    return or(base, 
              context(and("|", or(and("SUPER", actualParameters, followingFields),
                                  and(initField, followingFields))), 
                      EberonContextProcedure.BaseInit));
}

function makeReturn(base){
    return and(base, optional(";"));
}

function makeSet(expression){
    var array = context(and("[", expression, repeat(and(",", expression)), "]"),
                        EberonContextExpression.Array);
    return or(Grammar.makeSet(expression), array);
}

exports.language = {
    grammar: Grammar.make(
        makeIdentdef,
        makeDesignator,
        makeExpression,
        makeStrucType,
        makeStatement,
        makeProcedureHeading,
        makeProcedureDeclaration,
        makeFieldList, 
        makeFieldListSequence,
        makeForInit,
        makeArrayDimensions,
        makeFormalArray,
        makeFormalResult,
        makeReturn,
        makeSet,
        { 
            constDeclaration:   EberonContext.ConstDeclaration, 
            typeDeclaration:    EberonContextType.Declaration,
            recordDecl:         EberonContextType.Record,
            variableDeclaration: EberonContextVar.Declaration,
            ArrayDecl:          EberonContextType.Array,
            FormalParameters:   EberonContextProcedure.FormalParameters,
            FormalType:         EberonContextType.FormalType,
            For:                EberonContextLoop.For,
            While:              EberonContextLoop.While,
            If:                 EberonContextIf.Type,
            CaseLabel:          EberonContextCase.Label,
            Repeat:             EberonContextLoop.Repeat,
            ModuleDeclaration:  EberonContextProcedure.ModuleDeclaration
        },
        Grammar.reservedWords.concat(["SELF", "SUPER", "MAP"])
        ),
    stdSymbols: Symbols.makeStd(),
    types: {
        implicitCast: function(from, to, toVar, op){
            return Cast.implicit(from, to, toVar, EbOperator.castOperations(), op);
        },
        typeInfo: function(type){return EbOperator.generateTypeInfo(type);},
        isRecursive: function(type, base){return EberonContextType.isTypeRecursive(type, base);},
        makeStaticArray: function(type, init, length){ return new EbArray.StaticArray(init, type, length); },
        makeOpenArray: function(type){return new EbArray.OpenArray(type); }
    },
    codeGenerator: {
        make: function(){ return new CodeGenerator.Generator(); },                                                                                                                                                                                          
        nil: CodeGenerator.nullGenerator()
    },                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
    makeCodeTraits: function(codeGenerator, rtl, options){
        return new EberonLanguageContext.CodeTraits(codeGenerator, rtl, options && options.checkIndexes); 
    },
    rtl: {
        base: EbRtl.Type,
        methods: EbRtlCode.rtl.methods,
        dependencies: EbRtlCode.rtl.dependencies,
        nodejsModule: EbRtlCode.rtl.nodejsModule
    }
};

})(imports["eberon/eberon_grammar.js"]);
imports["test.js"] = {};
(function module$test(exports){
"use strict";

function TestError(s) {this.__s = s;}
TestError.prototype.toString = function(){return this.__s;};

function runImpl(tests, stat, tab){
    for(var t in tests)
        runTest(t, tests, stat, tab);
}

function runTest(t, tests, stat, tab){
    var r = tests[t];
	if (typeof r != "function"){
        console.log(tab + t);
        runImpl(r, stat, tab + "\t");
        return;
    }

	var padding = "                           ";
	var log = t;
	if (log.length < padding.length)
		log = t + padding.substring(log.length);
	else
		log += " ";

	try {
        ++stat.count;
		r();
		//log += "OK";
	}
	catch (x){
        ++stat.failCount;
		if (x instanceof TestError)
			log += "Failed\n\t" + tab + x;
		else
			log += "Failed\n" + (x.stack ? x.stack : '\t' + tab + x);
        console.log(tab + log);
	}
}

function run(tests){
    var stat = {count: 0, failCount: 0};

    console.log("Running..." );
    var start = (new Date()).getTime();
    if (typeof process != "undefined" && process.argv.length > 2){
        var testName = process.argv[2];
        while (!tests[testName]){
            var dotPos = testName.indexOf(".");
            if (dotPos == -1){
                console.log("test '" + testName + "' not found");
                return;
            }

            var suite = testName.substr(0, dotPos);
            tests = tests[suite];
            if (!tests){
                console.log("suite '" + suite + "' not found");
                return;
            }
            
            testName = testName.substr(dotPos + 1);
        }
        runTest(testName, tests, stat, "");
    }
    else
        runImpl(tests, stat, "");
    var stop = (new Date()).getTime();

    console.log("elapsed: " + (stop - start) / 1000 + " s" );
    console.log(stat.count + " test(s) run");
    if (!stat.failCount)
        console.log("All OK!");
    else
        console.log(stat.failCount + " test(s) failed");
    return !stat.failCount;
}

exports.run = run;
exports.TestError = TestError;
})(imports["test.js"]);
imports["test_unit_common.js"] = {};
(function module$test_unit_common(exports){
"use strict";

var Class = require("rtl.js").Class;
var Code = require("js/Code.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextType = require("js/ContextType.js");
var Errors = require("js/Errors.js");
var LanguageContext = require("js/LanguageContext.js");
var oc = require("oc.js");
var makeRTL = require("rtl_code.js").makeRTL;
var Scope = require("js/Scope.js");
var Stream = require("js/Stream.js");
var Test = require("test.js");

var TestError = Test.TestError;

function context(grammar, source){
    return {grammar: grammar, source: source};
}

function pass(/*...*/){return Array.prototype.slice.call(arguments);}

function fail(/*...*/){return Array.prototype.slice.call(arguments);}

var TestModuleGenerator = Class.extend({
    init: function TestModuleGenerator(){},
    prolog: function(){return undefined;},
    epilog: function(){return undefined;}
});

var TestContextRoot = Class.extend.call(ContextHierarchy.Root, {
    init: function TestContextRoot(language, moduleResolver){
        var rtl = new makeRTL(language.rtl);
        ContextHierarchy.Root.call(
                this,
                { codeTraits: language.makeCodeTraits(language.codeGenerator.nil, rtl),
                  moduleGenerator: function(){return new TestModuleGenerator();},
                  rtl: rtl,
                  types: language.types,
                  stdSymbols: language.stdSymbols,
                  moduleResolver: moduleResolver
                });
        this.pushScope(new Scope.Module("test", language.stdSymbols));
    },
    qualifyScope: function(){return "";},
    handleMessage: function(msg){
        if (msg instanceof ContextType.DescribeScopeMsg)
            msg.result = new ContextType.ScopeInfo("test", 0);
    },
    handleLiteral: function(){}
});

var TestContext = Class.extend.call(ContextExpression.ExpressionHandler, {
    init: function TestContext(language, moduleResolver){
        ContextExpression.ExpressionHandler.call(this, new TestContextRoot(language, moduleResolver));
    },
    handleExpression: function(){}
});

function makeContext(language, moduleResolver){return new TestContext(language, moduleResolver);}

function testWithSetup(setup, pass, fail){
    return function(){
        var test = setup();
        var i;
        for(i = 0; i < pass.length; ++i)
            test.expectOK(pass[i]);
    
        if (fail)
            for(i = 0; i < fail.length; ++i){
                var f = fail[i];
                test.expectError(f[0], f[1]);
            }
    };
}

function parseInContext(grammar, s, context){
    var stream = new Stream.Type(s);
    if (!grammar(stream, context) || !Stream.eof(stream))
        throw new Errors.Error("not parsed");
}

function runAndHandleErrors(action, s, handlerError){
    try {
        action(s);
    }
    catch (x){
        if (!(x instanceof Errors.Error))
            throw new Error("'" + s + "': " + x + "\n" 
                            + (x.stack ? x.stack : "(no stack)"));
        
        if (handlerError)
            handlerError(x);
        //else
        //  throw x;
        //  console.log(s + ": " + x);
        return false;
    }
    return true;
}

function setup(run){
    return {
        expectOK: function(s){
            function handleError(e){throw new TestError(s + "\n\t" + e);}

            if (!runAndHandleErrors(run, s, handleError))
                throw new TestError(s + ": not parsed");
        },
        expectError: function(s, error){
            function handleError(actualError){
                var sErr = actualError.toString();
                if (sErr != error)
                    throw new TestError(s + "\n\texpected error: " + error + "\n\tgot: " + sErr );
            }

            if (runAndHandleErrors(run, s, handleError))
                throw new TestError(s + ": should not be parsed, expect error: " + error);
        }
    };
}

function parseUsingGrammar(parser, language, s, cxFactory){
    var baseContext = makeContext(language);
    var context = cxFactory ? cxFactory(baseContext) : baseContext;
    parseInContext(parser, s, context);
    if (context.root)
        context.root().currentScope().close();
}

function setupParser(parser, language, contextFactory){
    function parseImpl(s){
        return parseUsingGrammar(parser, language, s, contextFactory);
    }
    return setup(parseImpl);
}

function compileModule(src, language){
    var imported = oc.compileModule(language.grammar, new Stream.Type(src), makeContext(language));
    return imported.symbol().info();
}

function makeModuleResolver(moduleReader, language){
    return moduleReader ? function(name){ return compileModule(moduleReader(name), language); }
                        : undefined;
}

function setupWithContext(fixture, contextGrammar, language){
    function innerMakeContext(){
        var context = makeContext(language, makeModuleResolver(fixture.moduleReader, language));
        var source = fixture.source;
        try {
            parseInContext(contextGrammar, source, context);
        }
        catch (x) {
            if (x instanceof Errors.Error)
                throw new TestError("setup error: " + x + "\n" + source);
            throw x;
        }
        return context;
    }

    return setupParser(fixture.grammar, language, innerMakeContext);
}

function testWithContext(fixture, contextGrammar, language, pass, fail){
    return testWithSetup(
        setupWithContext.bind(undefined, fixture, contextGrammar, language),
        pass,
        fail);
}

function testWithGrammar(parser, language, pass, fail){
    return testWithSetup(
        function(){return setupParser(parser, language);},
        pass,
        fail);
}

function testWithModule(src, language, pass, fail){
    var grammar = language.grammar;
    return testWithSetup(
        function(){
            var module = compileModule(src, language);
            return setup(function(s){
                oc.compileModule(grammar,
                                 new Stream.Type(s),
                                 new TestContext(language, function(){return module;}));
            });},
        pass,
        fail);
}

function nthLine(s, n){
    var result = 0;
    while (n--)
        result = s.indexOf('\n', result) + 1;
    return result;
}

function assert(cond){
    if (!cond){
        var stack = new Error().stack;
        var from = nthLine(stack, 2);
        stack = stack.substring(from, stack.indexOf('\n', from));
        throw new TestError("assertion failed: " + stack);
    }
}

function expectEq(x1, x2){
    if (x1 == x2)
        return;

    throw new TestError("'" + x1 + "' != '" + x2 + "'");
    }

exports.assert = assert;
exports.expectEq = expectEq;

exports.context = context;
exports.pass = pass;
exports.fail = fail;
exports.setupParser = setupParser;
exports.testWithContext = testWithContext;
exports.testWithGrammar = testWithGrammar;
exports.testWithModule = testWithModule;
exports.testWithSetup = testWithSetup;

})(imports["test_unit_common.js"]);
imports["test_unit_eberon.js"] = {};
(function module$test_unit_eberon(exports){
"use strict";

var Class = require("rtl.js").Class;
//var EberonCodeGenerator = require("js/EberonCodeGenerator.js");
var language = require("eberon/eberon_grammar.js").language;
var TestUnitCommon = require("test_unit_common.js");
var TypePromotion = require("js/EberonTypePromotion.js");

var assert = TestUnitCommon.assert;
var pass = TestUnitCommon.pass;
var fail = TestUnitCommon.fail;
var context = TestUnitCommon.context;

var grammar = language.grammar;

function testWithContext(context, pass, fail){
    return TestUnitCommon.testWithContext(context, grammar.declarationSequence, language, pass, fail);
}

function testWithModule(src, pass, fail){
    return TestUnitCommon.testWithModule(src, language, pass, fail);
}

function testWithGrammar(parser, pass, fail){
    return TestUnitCommon.testWithGrammar(parser, language, pass, fail);
}

var temporaryValues = {
    context: context(
        grammar.declarationSequence,
        "TYPE Base = RECORD END;"
        + "Derived = RECORD (Base) flag: BOOLEAN END;"
        + "Derived2 = RECORD (Derived) flag2: BOOLEAN END;"
        + "PBase = POINTER TO Base;"
        + "PDerived = POINTER TO Derived;"
        + "PDerived2 = POINTER TO Derived2;"
        + "VAR pBase: POINTER TO Base; bVar: BOOLEAN;"
        + "PROCEDURE proc(b: BOOLEAN): BOOLEAN; RETURN b END proc;"
        + "PROCEDURE passPDerived(p: PDerived): BOOLEAN; RETURN TRUE END;"
        ),
    __expression: function(e){
        return "PROCEDURE p(); BEGIN b <- pBase; b2 <- pBase; ASSERT(" + e + "); END p;";
    },
    __statement: function(e){
        return "PROCEDURE p(); BEGIN b <- pBase; b2 <- pBase; " + e + " END p;";
    },
    passExpressions: function(){
        return this.__pass(this.__expression.bind(this), arguments);
    },
    passStatements: function(){
        return this.__pass(this.__statement.bind(this), arguments);
    },
    failExpressions: function(){
        return this.__fail(this.__expression.bind(this), arguments);
    },
    failStatements: function(){
        return this.__fail(this.__statement.bind(this), arguments);
    },
    __pass: function(make, cases){
        var result = [];
        for(var i = 0; i < cases.length; ++i)
            result.push(make(cases[i]));
        return pass.apply(this, result);
    },
    __fail: function(make, cases){
        var result = [];
        for(var i = 0; i < cases.length; ++i)
            result.push([make(cases[i]), "type 'Base' has no 'flag' field"]);
        return fail.apply(this, result);
    }
};

var TestVar = Class.extend({
    init: function(){
        this.__type = "type";
    },
    type: function(){return this.__type;},
    setType: function(type){this.__type = type;}
});

exports.suite = {
//"code": makeCodeSuite(),
"arithmetic operators": testWithContext(
    context(grammar.statement, "VAR b1: BOOLEAN;"),
    pass(),
    fail(["b1 := b1 + b1", "operator '+' type mismatch: numeric type or SET or STRING expected, got 'BOOLEAN'"])
    ),
"key words": testWithGrammar(
    grammar.variableDeclaration,
    pass(),
    fail(["SELF: INTEGER", "not parsed"],
         ["SUPER: INTEGER", "not parsed"],
         ["STRING: INTEGER", "'STRING' already declared"]
         )
    ),
"abstract method declaration": testWithContext(
    context(grammar.declarationSequence, 
            "TYPE T = RECORD PROCEDURE p() END;"
            + "D = RECORD(T) END;"
            + "T2 = RECORD PROCEDURE p1(); PROCEDURE p2(i: INTEGER): BOOLEAN END;"
            ),
    pass(),
    fail(["VAR r: T;",
          "cannot instantiate 'T' because it has abstract method(s): p"],
         ["VAR r: T2;",
          "cannot instantiate 'T2' because it has abstract method(s): p1, p2"],
         ["PROCEDURE p(); VAR p: POINTER TO T; BEGIN NEW(p); END p;",
          "cannot instantiate 'T' because it has abstract method(s): p"],
         ["PROCEDURE p(); TYPE LocalT = RECORD(T) END; VAR r: LocalT; END p;",
          "cannot instantiate 'LocalT' because it has abstract method(s): p"],
         ["PROCEDURE p(); TYPE LocalT = RECORD(T) END; VAR p: POINTER TO LocalT; BEGIN NEW(p) END p;",
          "cannot instantiate 'LocalT' because it has abstract method(s): p"],
         ["VAR r: D;",
          "cannot instantiate 'D' because it has abstract method(s): p"],
         ["PROCEDURE p(); VAR p: POINTER TO D; BEGIN NEW(p); END p;",
          "cannot instantiate 'D' because it has abstract method(s): p"],
         ["PROCEDURE p(); TYPE HasAbstractField = RECORD f: T; END; END;",
          "cannot instantiate 'T' because it has abstract method(s): p"]
        )
    ),
"new method declaration": testWithContext(
    context(grammar.declarationSequence, 
            "TYPE T = RECORD PROCEDURE p(); intField: INTEGER END; A = ARRAY 1 OF INTEGER;"),
    pass("PROCEDURE T.p(); END T.p;",
         "PROCEDURE T.p(); END;"
         ),
    fail(["PROCEDURE TUnk.p(); END TUnk.p;", "undeclared identifier: 'TUnk'"],
         ["PROCEDURE A.p(); END A.p;",
          "RECORD type expected in method declaration, got 'ARRAY 1 OF INTEGER'"],
         ["PROCEDURE T.p(); END p;",
          "mismatched method names: expected 'T.p' at the end (or nothing), got 'p'"],
         ["PROCEDURE T.p(); END T2.p;",
          "mismatched method names: expected 'T.p' at the end (or nothing), got 'T2.p'"],
         ["PROCEDURE T.p(); END T.p2;",
          "mismatched method names: expected 'T.p' at the end (or nothing), got 'T.p2'"],
         ["PROCEDURE T.intField(); END T.intField;",
          "'T' has no declaration for method 'intField'"],
         ["PROCEDURE T.p(); END T.p; PROCEDURE T.p(); END T.p;",
          "method 'T.p' already defined"],
         ["PROCEDURE p(); TYPE T = RECORD PROCEDURE m(); PROCEDURE m() END; END p;",
          "cannot declare a new method 'm': method already was declared"],
         ["PROCEDURE p(); TYPE T = RECORD m: INTEGER; PROCEDURE m() END; END p;",
          "cannot declare method, record already has field 'm'"],
         ["PROCEDURE p(); TYPE T = RECORD PROCEDURE m(); m: INTEGER END; END p;",
          "cannot declare field, record already has method 'm'"]
         )
    ),
"method is not exported in base record": testWithModule(
      "MODULE test;"    
    + "TYPE Base* = RECORD PROCEDURE method(); END;"
    + "END test.",
    pass(),
    fail(["MODULE m; IMPORT test; TYPE D = RECORD(test.Base) PROCEDURE method(); END; END m.", 
          "cannot declare a new method 'method': method already was declared in the base record (but was not exported)"],
         ["MODULE m; IMPORT test; TYPE D = RECORD(test.Base) method: INTEGER; END; END m.", 
          "cannot declare field, record already has method 'method' in the base record (was not exported)"],
         ["MODULE m; IMPORT test; TYPE D = RECORD(test.Base) END; PROCEDURE D.method(); END; END m.", 
          "'D' has no declaration for method 'method'"])
    ),
"overridden method declaration": testWithContext(
    context(grammar.declarationSequence,
              "TYPE Base = RECORD PROCEDURE p() END; T = RECORD (Base) END;"
            + "PROCEDURE Base.p(); END Base.p;"),
    pass("PROCEDURE T.p(); END T.p;"),
    fail(["PROCEDURE T.pUnk(); END T.pUnk;",
          "'T' has no declaration for method 'pUnk'"],
         ["PROCEDURE proc(); TYPE T = RECORD (Base) PROCEDURE p() END; END proc;",
          "cannot declare a new method 'p': method already was declared"],
         ["PROCEDURE T.p(); END T.p; PROCEDURE T.p(); END T.p;",
          "method 'T.p' already defined"],
         ["PROCEDURE T.p(a: INTEGER); END T.p;",
          "overridden method 'p' signature mismatch: should be 'PROCEDURE', got 'PROCEDURE(INTEGER)'"],
         ["PROCEDURE p(); PROCEDURE T.p(); END T.p; END p;",
          "method should be defined in the same scope as its bound type 'T'"]
        )
    ),
"SELF": testWithContext(
    context(grammar.declarationSequence,
              "TYPE T = RECORD PROCEDURE p(); i: INTEGER END;"
            + "PROCEDURE proc(i: INTEGER); END proc;"),
    pass("PROCEDURE T.p(); BEGIN SELF.i := 0; END T.p;",
         "PROCEDURE T.p(); BEGIN proc(SELF.i); END T.p;"
         ),
    fail(["PROCEDURE p(); BEGIN SELF.i := 0; END p;",
          "SELF can be used only in methods"])
    ),
"SELF as VAR parameter": testWithContext(
    context(grammar.declarationSequence, 
            "TYPE T = RECORD PROCEDURE method() END;"
            + "PROCEDURE refProc(VAR r: T); END;"
            ),
    pass("PROCEDURE T.method(); BEGIN refProc(SELF); END;")
    ),
"SELF as pointer": testWithContext(
    context(grammar.declarationSequence, 
            "TYPE T = RECORD PROCEDURE method() END;"
            + "PT = POINTER TO T;"
            + "VAR pVar: PT;"
            + "PROCEDURE refProc(VAR r: T); END;"
            + "PROCEDURE refPointerProc(VAR p: PT); END;"
            ),
    pass("PROCEDURE T.method(); BEGIN pVar := SELF(POINTER) END T.method;",
         "PROCEDURE p();"
          + "TYPE Derived = RECORD(T) END; VAR pd: POINTER TO Derived;"
          + "PROCEDURE Derived.method(); VAR pVar: PT; BEGIN NEW(pd); pVar := SELF(POINTER); END Derived.method;"
          + "END p;",
          "PROCEDURE T.method(); BEGIN refProc(SELF(POINTER)^) END;"
          ),
    fail(["PROCEDURE T.method(); BEGIN refPointerProc(SELF(POINTER)) END T.method;", 
          "SELF(POINTER) cannot be passed as VAR actual parameter"],
         ["PROCEDURE T.method(); BEGIN SELF(POINTER) := pVar; END T.method;", 
          "cannot assign to SELF(POINTER)"],
         ["PROCEDURE p();"
          + "TYPE Derived = RECORD(T) END; VAR d: Derived;"
          + "PROCEDURE Derived.method(); VAR pVar: PT; BEGIN pVar := SELF(POINTER); END Derived.method;"
          + "END p;",
          "cannot declare a variable of type 'Derived' (and derived types) because SELF(POINTER) was used in its method(s)"],
         ["PROCEDURE p();"
          + "TYPE Derived = RECORD(T) END; Derived2 = RECORD(Derived) END;"
          + "VAR d: Derived2;"
          + "PROCEDURE Derived.method(); VAR pVar: PT; BEGIN pVar := SELF(POINTER); END Derived.method;"
          + "END p;",
          "cannot declare a variable of type 'Derived' (and derived types) because SELF(POINTER) was used in its method(s)"]
         )
    ),
"method call": testWithContext(
    context(grammar.expression,
              "TYPE T = RECORD PROCEDURE p(); PROCEDURE f(): INTEGER END;"
            + "VAR o: T;"
            + "PROCEDURE T.p(); END T.p;"
            + "PROCEDURE T.f(): INTEGER; RETURN 0 END T.f;"
            ),
    pass("o.f()"),
    fail(["o.p()", "procedure returning no result cannot be used in an expression"])
    ),
"method call as statement": testWithContext(
    context(grammar.statement,
              "TYPE T = RECORD PROCEDURE p(); PROCEDURE f(): INTEGER END;"
            + "VAR o: T;"
            + "PROCEDURE T.p(); END T.p;"
            + "PROCEDURE T.f(): INTEGER; RETURN 0 END T.f;"
            ),
    pass("o.p"),
    fail(["o.f", "procedure returning a result cannot be used as a statement"])
    ),
"cannot assign to method": testWithContext(
    context(grammar.statement,
              "TYPE T = RECORD PROCEDURE p() END;"
            + "VAR o: T;"
            + "PROCEDURE T.p(); END T.p;"
            ),
    pass(),
    fail(["o.p := o.p", "method 'p' cannot be referenced"],
         ["o.p := NIL", "cannot assign to method 'p'"])
    ),
"method cannot be referenced": testWithContext(
    context(grammar.statement,
              "TYPE T = RECORD PROCEDURE p() END;"
            + "Proc = PROCEDURE();"
            + "VAR o: T;"
            + "PROCEDURE T.p(); END T.p;"
            + "PROCEDURE proc(p: Proc); END proc;"
            ),
    pass(),
    fail(["proc(o.p)", "method 'p' cannot be referenced"],
         ["v <- o.p", "method 'p' cannot be referenced"])
    ),
"method super call": testWithContext(
    context(grammar.declarationSequence,
              "TYPE T = RECORD PROCEDURE p(); PROCEDURE pAbstract(); PROCEDURE pAbstract2() END;"
            + "D = RECORD(T) PROCEDURE pNoSuper() END;"
            + "PROCEDURE T.p(); END T.p;"
           ),
    pass("PROCEDURE D.p(); BEGIN SUPER() END D.p;"),
    fail(["PROCEDURE D.pNoSuper(); BEGIN SUPER() END D.pNoSuper;",
          "there is no method 'pNoSuper' in base type(s)"],
         ["PROCEDURE p(); BEGIN SUPER() END p;",
          "SUPER can be used only in methods"],
         ["PROCEDURE T.pNoBase(); BEGIN SUPER() END T.pNoBase;",
          "'T' has no base type - SUPER cannot be used"],
         ["PROCEDURE D.pAbstract(); BEGIN SUPER() END D.pAbstract;",
          "cannot use abstract method(s) in SUPER calls: pAbstract"],
         ["PROCEDURE D.pAbstract(); BEGIN SUPER() END D.pAbstract; PROCEDURE D.pAbstract2(); BEGIN SUPER() END D.pAbstract2;",
          "cannot use abstract method(s) in SUPER calls: pAbstract, pAbstract2"]
          )
    ),
"export method": testWithContext(
    context(grammar.declarationSequence, 
            "TYPE T = RECORD PROCEDURE p() END;"
            ),
    pass(),
    fail(["PROCEDURE T.p*(); END T.p;",
          "method implementation cannot be exported: p"],
         ["TYPE R = RECORD PROCEDURE m*(); END;",
          "method 'm' cannot be exported because record itslef is not exported"] )
    ),
"import method": testWithModule(
      "MODULE test;"
    + "TYPE T* = RECORD PROCEDURE m*(); PROCEDURE mNotExported() END;"
    + "PROCEDURE T.m(); END T.m; PROCEDURE T.mNotExported(); END T.mNotExported;"
    + "END test.",
    pass("MODULE m; IMPORT test; VAR r: test.T; BEGIN r.m(); END m.",
         "MODULE m; IMPORT test; TYPE T = RECORD(test.T) END; PROCEDURE T.m(); END T.m; END m."
        ),
    fail(["MODULE m; IMPORT test; VAR r: test.T; BEGIN r.mNotExported(); END m.",
          "type 'T' has no 'mNotExported' field"],
         ["MODULE m; IMPORT test; TYPE T = RECORD(test.T) END; PROCEDURE T.mNotExported(); END T.mNotExported; END m.",
          "'T' has no declaration for method 'mNotExported'"])
    ),
"import abstract record": testWithModule(
      "MODULE test;"
    + "TYPE T* = RECORD PROCEDURE m*(); END;"
    +      "Derived* = RECORD(T) END;"
    + "END test.",
    pass("MODULE m; IMPORT test; TYPE T = RECORD f: POINTER TO test.T; END; END m."
        ),
    fail(["MODULE m; IMPORT test; TYPE T = RECORD f: test.T; END; END m.",
          "cannot instantiate 'T' because it has abstract method(s): m"],
         ["MODULE m; IMPORT test; TYPE T = RECORD(test.T) END; VAR r: T; END m.",
          "cannot instantiate 'T' because it has abstract method(s): m"],
         ["MODULE m; IMPORT test; TYPE T = RECORD(test.Derived) END; VAR r: T; END m.",
          "cannot instantiate 'T' because it has abstract method(s): m"]
        )
    ),
"non-scalar variables can be exported": testWithContext(
    context(grammar.declarationSequence, 
            "TYPE T = RECORD END; A = ARRAY 3 OF INTEGER;"
            ),
    pass("VAR r*: T;",
         "VAR a*: A;"),
    fail()
    ),
"export as read-only": testWithContext(
    context(grammar.declarationSequence, ""),
    pass("TYPE T* = RECORD i-: INTEGER END;"),
    fail(["TYPE T- = RECORD END;", 
          "type cannot be exported as read-only using '-' mark (did you mean '*'?)"],
         ["PROCEDURE p-(); END p;", 
          "procedure cannot be exported as read-only using '-' mark (did you mean '*'?)"],
         ["CONST c- = 123;", 
          "constant cannot be exported as read-only using '-' mark (did you mean '*'?)"],
         ["VAR i-: INTEGER;", 
          "variable cannot be exported as read-only using '-' mark (did you mean '*'?)"],
         ["TYPE T* = RECORD PROCEDURE p-() END;", 
          "method cannot be exported as read-only using '-' mark (did you mean '*'?)"]
         )
    ),
"field exported as read-only is writable in current module": testWithContext(
    context(grammar.statement,
              "TYPE T* = RECORD i-: INTEGER END;"
            + "VAR r: T;"
            ),
    pass("r.i := 123"),
    fail()
    ),
"import as read-only": testWithModule(
    "MODULE test; TYPE T* = RECORD f-: INTEGER END; END test.",
    pass(),
    fail(["MODULE m; IMPORT test; VAR r: test.T; BEGIN r.f := 123; END m.",
          "cannot assign to read-only record's field"],
         ["MODULE m; IMPORT test; TYPE D = RECORD(test.T) END; VAR r: D; BEGIN r.f := 123; END m.",
          "cannot assign to read-only record's field"]
        )),
"STRING variable": testWithGrammar(
    grammar.variableDeclaration,
    pass("s: STRING")
    ),
"STRING expression": testWithContext(
    context(grammar.expression,
            "VAR s1, s2: STRING; a: ARRAY 10 OF CHAR;"),
    pass("s1 + s2",
         "s1 + \"abc\"",
         "\"abc\" + s1",
         "s1 = s2",
         "s1 = \"abc\"",
         "s1 = 22X",
         "\"abc\" = s1",
         "22X = s1",
         "s1 # s2",
         "s1 # \"abc\"",
         "s1 # 22X",
         "\"abc\" # s1",
         "22X # s1",
         "s1 < s2",
         "s1 < \"abc\"",
         "s1 < 22X",
         "\"abc\" < s1",
         "22X < s1",
         "s1 > s2",
         "s1 > \"abc\"",
         "s1 > 22X",
         "\"abc\" > s1",
         "22X > s1",
         "s1 <= s2",
         "s1 <= \"abc\"",
         "\"abc\" <=s1",
         "22X <= s1",
         "s1 >= \"abc\"",
         "s1 >= 22X",
         "s1 >= s2",
         "\"abc\" >= s1",
         "22X >= s1"
         ),
    fail(["s1 = NIL", "type mismatch: expected 'STRING', got 'NIL'"],
         ["s1 = a", "type mismatch: expected 'STRING', got 'ARRAY 10 OF CHAR'"],
         ["a = s1", "type mismatch: expected 'ARRAY 10 OF CHAR', got 'STRING'"]
        )
    ),
"STRING literal expression": testWithContext(
    context(grammar.expression,
            "CONST cs = \"abc\";"
            + "PROCEDURE pString(s: STRING): STRING; RETURN s END pString;"
            + "PROCEDURE pStringByRef(VAR s: STRING): STRING; RETURN s END pStringByRef;"
            ),
    pass("\"abc\" + \"cde\"",
         "cs + cs",
         "cs + \"abc\"",
         "cs = \"abc\"",
         "cs # \"abc\"",
         "cs < \"abc\"",
         "cs > \"abc\"",
         "cs <= \"abc\"",
         "cs >= \"abc\"",
         "pString(cs)",
         "pString(\"abc\")"
         ),
    fail(["pStringByRef(cs)", "type mismatch for argument 1: cannot pass 'multi-character string' as VAR parameter of type 'STRING'"],
         ["pStringByRef(\"abc\")", "type mismatch for argument 1: cannot pass 'multi-character string' as VAR parameter of type 'STRING'"]
         )
    ),
"STRING assignment": testWithContext(
    context(grammar.statement,
            "VAR s1, s2: STRING; a: ARRAY 10 OF CHAR;"),
    pass("s1 := s2",
         "s1 := \"abc\"",
         "s1 := 22X"
         ),
    fail(["a := s1", "type mismatch: 'ARRAY 10 OF CHAR' cannot be assigned to 'STRING' expression"],
         ["s1 := a", "type mismatch: 'STRING' cannot be assigned to 'ARRAY 10 OF CHAR' expression"]
        )
    ),
"STRING and ARRAY OF CHAR": testWithContext(
    context(grammar.expression,
            "VAR s: STRING; a: ARRAY 10 OF CHAR;"
            + "PROCEDURE pArray(a: ARRAY OF CHAR): BOOLEAN; RETURN FALSE END pArray;"
            + "PROCEDURE pString(s: STRING): BOOLEAN; RETURN FALSE END pString;"
            + "PROCEDURE pVar(VAR a: ARRAY OF CHAR): BOOLEAN; RETURN FALSE END pVar;"
            + "PROCEDURE pIntArray(a: ARRAY OF INTEGER): BOOLEAN; RETURN FALSE END pIntArray;"
            ),
    pass("pArray(s)"),
    fail(["pVar(s)", "type mismatch for argument 1: cannot pass 'STRING' as VAR parameter of type 'ARRAY OF CHAR'"],
         ["pString(a)", "type mismatch for argument 1: 'ARRAY 10 OF CHAR' cannot be converted to 'STRING'"],
         ["pIntArray(s)", "type mismatch for argument 1: 'STRING' cannot be converted to 'ARRAY OF INTEGER'"]
        )
    ),
"STRING LEN": testWithContext(
    context(grammar.expression,
            "VAR s: STRING;"),
    pass("LEN(s)"),
    fail()
    ),
"STRING indexing": testWithContext(
    context(grammar.expression,
            "VAR s: STRING;"
            + "PROCEDURE pCharByVar(VAR c: CHAR): CHAR; RETURN c END pCharByVar;"),
    pass("s[0]"),
    fail(["s[-1]", "index is negative: -1"],
         ["pCharByVar(s[0])", "string element cannot be passed as VAR actual parameter"]
         )
    ),
"designate call result in expression": testWithContext(
    context(grammar.expression,
            "TYPE PT = POINTER TO RECORD field: INTEGER END;"
            + "VAR p: PT;"
            + "PROCEDURE proc(): PT; RETURN p END proc;"
            + "PROCEDURE int(): INTEGER; RETURN 0 END int;"
            + "PROCEDURE intVar(VAR i: INTEGER): INTEGER; RETURN i END intVar;"),
    pass("proc().field",
         "intVar(proc().field)"),
    fail(["intVar(int())", "expression cannot be used as VAR parameter"])
    ),
"designate call result in statement": testWithContext(
    context(grammar.statement,
            "TYPE PT = POINTER TO RECORD field: INTEGER; proc: PROCEDURE END;"
            + "ProcType = PROCEDURE;"
            + "VAR p: PT;"
            + "PROCEDURE procVoid(); END procVoid;"
            + "PROCEDURE proc(): PT; RETURN p END proc;"
            + "PROCEDURE int(): INTEGER; RETURN 0 END int;"
            + "PROCEDURE intVar(VAR i: INTEGER); END intVar;"
            + "PROCEDURE returnProc(): ProcType; RETURN procVoid END returnProc;"
           ),
    pass("proc().field := 0",
         "proc().proc()",
         "proc().proc"
        ),
    fail(["int() := 0", "cannot assign to procedure call result"],
         ["intVar(int())", "expression cannot be used as VAR parameter"],
         ["procVoid()()", "PROCEDURE expected, got 'procedure call statement'"],
         ["int()()", "PROCEDURE expected, got 'INTEGER'"],
         ["returnProc()", "procedure returning a result cannot be used as a statement"] // call is not applied implicitly to result
        )
    ),
"type promotion": {
    "or" : pass(
        function(){
            var or = new TypePromotion.Or();
            var a = new TestVar();
            var p = or.next();
            assert(a.type() == "type");
            p.invert();
            p.promote(a, "type1");
            assert(a.type() == "type");
            or.next();
            assert(a.type() == "type1");
            or.reset();
            assert(a.type() == "type");
        },
        function(){
            var or = new TypePromotion.Or();
            var a = new TestVar();
            var p = or.next(p);
            p.promote(a, "type1");
            or.next();
            assert(a.type() == "type");
        },
        function(){
            var or = new TypePromotion.Or();
            var a = new TestVar();
            var p1 = or.next();
            p1.promote(a, "type1");
            var p2 = or.next();
            p2.invert();
            p2.promote(a, "type2");
            assert(a.type() == "type");
            assert(a.type() == "type");
            or.next();
            assert(a.type() == "type2");
            or.reset();
            assert(a.type() == "type");
        }
    ),
    "and": pass(
        function(){
            var and = new TypePromotion.And();
            var a = new TestVar();
            var p = and.next();
            p.promote(a, "type1");
            and.next();
            assert(a.type() == "type1");
            and.reset();
            assert(a.type() == "type");
        },
        function(){ // (a IS type1) & (v OR (a IS type2)) & v
            var and = new TypePromotion.And();
            var a = new TestVar();
            var p = and.next();
            p.promote(a, "type1");
            var subOr = and.next().makeOr();
            subOr.next();
            subOr.next().promote(a, "type2");
            and.next();
            assert(a.type() == "type1");
            and.reset();
            assert(a.type() == "type");
        },
        function(){ // (a IS type1) & ~(v OR ~(a IS type2)) & v
            var and = new TypePromotion.And();
            var a = new TestVar();
            and.next().promote(a, "type1");
            var subOr = and.next();
            subOr.invert();
            subOr = subOr.makeOr();
            subOr.next();
            var p = subOr.next();
            p.invert();
            p.promote(a, "type2");
            and.next();
            assert(a.type() == "type2");
            and.reset();
            assert(a.type() == "type");
        },
        function(){ // (a IS type1) & (v & (a IS type2))
            var and = new TypePromotion.And();
            var a = new TestVar();
            and.next().promote(a, "type1");
            var sub = and.next().makeAnd();
            sub.next();
            assert(a.type() == "type1");
            sub.next().promote(a, "type2");
            assert(a.type() == "type1");
            and.and();
            assert(a.type() == "type2");
            and.or();
            assert(a.type() == "type");
        },
        function(){ // (~(~(a IS type1)) & v) OR v
            var a = new TestVar();
            var or = new TypePromotion.Or();
            var and = or.next().makeAnd();
            var p1 = and.next();
            p1.invert();
            var p2 = p1.makeOr().next().makeAnd().next();
            p2.invert();
            p2.promote(a, "type1");
            and.next();
            assert(a.type() == "type1");
            or.next();
            assert(a.type() == "type");
        },
        function(){ // (v OR (a IS type1)) & v)
            var a = new TestVar();
            var and = new TypePromotion.And();
            var or = and.next().makeOr();
            or.next();
            or.next().makeAnd().next().promote(a, "type1");
            and.next();
            assert(a.type() == "type");
        }
    )
},
"in place variables": {
    "initialization": testWithContext(
        context(grammar.statement,
                "VAR i: INTEGER; s: STRING;"
                + "PROCEDURE p(): BOOLEAN; RETURN FALSE END p;"
                + "PROCEDURE void(); END void;"
               ),
        pass("v <- 0",
             "v <- 1.23",
             "v <- TRUE",
             "v <- i",
             "v <- i + i",
             "v <- \"abc\" + s",
             "v <- s + \"abc\"",
             "v <- \"abc\"",
             "v <- \"abc\" + \"def\"",
             "v <- p()",
             "v <- void" // procedure type
            ),
        fail(["v <-", "initialization expression expected"],
             ["v <- void()", "procedure returning no result cannot be used in an expression"],
             ["v <- NIL", "cannot use NIL to initialize variable 'v'"]
             )
        ),
    "scope": testWithContext(
        temporaryValues.context,
        temporaryValues.passStatements(
             "v1 <- 0; v2 <-0;",
             "i <- 0; ASSERT(i = 0);",
             "WHILE FALSE DO v <- 0; ASSERT(v = 0); END; WHILE FALSE DO v <- 0; END;",
             "WHILE FALSE DO i1 <- 0; WHILE FALSE DO i2 <- 0; ASSERT(i1 = 0); ASSERT(i2 = 0); END; END;",
             "WHILE bVar DO v <- 0; ELSIF ~bVar DO v <- 0 END;",
             "IF FALSE THEN v <- 0; ASSERT(v = 0); END; IF FALSE THEN v <- 0; END;",
             "IF FALSE THEN v <- 0; END; IF FALSE THEN v <- 0; END;",
             "IF FALSE THEN v <- 0; ELSIF FALSE THEN v <- 0; ELSE v <- 0; END;",
             "i <- 0; CASE i OF 0: v <- 0 | 1: v <- 1; ; ASSERT(v = 1); END;",
             "REPEAT v <- 0; UNTIL FALSE; REPEAT v <- 0; UNTIL FALSE;",
             "REPEAT v <- 0; ASSERT(v = 0); UNTIL v # 0;",
             "i <- 0; FOR i := 0 TO 10 DO v <- 0; END; FOR i := 0 TO 10 DO v <- 0; END;"
             ),
        fail(["PROCEDURE p(); BEGIN v <- 0; v <-0; END p;", "'v' already declared"],
             ["PROCEDURE p(); VAR v: INTEGER; BEGIN v <- 0; END p;", "'v' already declared"],
             ["PROCEDURE p(); BEGIN v <- 0; WHILE FALSE DO v <- 0; END; END p;", 
              "'v' already declared in procedure scope"],
             ["PROCEDURE p(); BEGIN i <- 0; IF FALSE THEN i <- 0; END; END p;",
              "'i' already declared in procedure scope"],
             ["PROCEDURE p(); BEGIN i <- 0; IF TRUE THEN IF TRUE THEN i <- 0; END; END; END p;",
              "'i' already declared in procedure scope"],
             ["PROCEDURE p(); BEGIN WHILE FALSE DO i <- 0; WHILE FALSE DO i <- 0; END; END; END p;",
              "'i' already declared in operator scope"]
            )
        ),
    "type promotion in expression": testWithContext(
        temporaryValues.context,
        temporaryValues.passExpressions(
            "(b IS PDerived) & b.flag",
            "(b IS PDerived) & bVar & b.flag",
            "(b IS PDerived) & (bVar OR b.flag)",
            "(b IS PDerived) & (b2 IS PDerived) & b.flag & b2.flag",
            "(b IS PDerived) & proc(TRUE) & b.flag",
            "(b IS PDerived) & ~proc(TRUE) & b.flag",
            "~(~(b IS PDerived)) & b.flag",
            "~~(b IS PDerived) & b.flag",
            "(b IS PDerived) & ((b IS PDerived2) OR bVar) & b.flag",
            "(b IS PDerived) & (bVar OR (b IS PDerived2)) & b.flag",
            "(b IS PDerived) & ~(bVar OR ~(b IS PDerived2)) & b.flag2",
            "~(bVar & (b IS PDerived)) OR b.flag"
            //TODO: "((b IS PDerived) = TRUE) & b.flag); END p;",
            ),
        temporaryValues.failExpressions(
            "(b IS PDerived) OR b.flag",
            "(bVar OR (b IS PDerived)) & b.flag",
             "(b IS PDerived) OR bVar & b.flag",
             "~(b IS PDerived) & b.flag",
             "((b IS PDerived) & (b2 IS PDerived) OR bVar) & b.flag",
             "proc(b IS PDerived) & proc(b.flag)",
             "ORD(b IS PDerived) * ORD(b.flag) = 0",
             "((b IS PDerived) = FALSE) & b.flag",
             "((b IS PDerived) & bVar) = b.flag",
             "b IS PDerived); ASSERT(b.flag",
             "((b IS PDerived) OR (b IS PDerived)) & b.flag",
             "(b IS PDerived) OR (b IS PDerived) OR b.flag",
             "(bVar OR (b IS PDerived)) & b.flag",
             "~(bVar & ~(b IS PDerived)) & b.flag"
             )
        ),
    "invert type promotion in expression": testWithContext(
        temporaryValues.context,
        temporaryValues.passExpressions(
             "~(b IS PDerived) OR b.flag",
             "~(b IS PDerived) OR b.flag OR bVar",
             "~(b IS PDerived) OR b.flag & bVar",
             "~(b IS PDerived) OR bVar & b.flag",
             "~(b IS PDerived) OR (bVar & b.flag)",
             "~(b IS PDerived) OR bVar OR b.flag",
             "~(b IS PDerived) OR (bVar = b.flag)",
             "~(~(b IS PDerived) OR bVar) & b.flag",
             "~(~(b IS PDerived) OR b.flag) & b.flag",
             "~(b IS PDerived) OR ~(b2 IS PDerived) OR b2.flag",
             "~(b IS PDerived) OR b.flag OR ~(b2 IS PDerived) OR b2.flag",
             "~((b IS PDerived) & b.flag) OR b.flag OR ~(b2 IS PDerived) OR b2.flag",
             "~((b IS PDerived) & b.flag) OR b.flag OR ~((b2 IS PDerived) & b.flag & b2.flag) OR b2.flag"
             ),
        temporaryValues.failExpressions(
             "(~(b IS PDerived) OR bVar) & b.flag",
             "(ORD(~(b IS PDerived)) + ORD(b.flag)",
             "~(~(b IS PDerived) OR bVar) OR b.flag",
             "~(~(b IS PDerived) & bVar) & b.flag",
             "~(b IS PDerived) OR b.flag = b.flag"
            )
        ),
    "type promotion in separate statements": testWithContext(
        temporaryValues.context,
        pass(),
        temporaryValues.failStatements(
            "bVar := b IS PDerived; ASSERT(b.flag)",
            "bVar := (b IS PDerived) & bVar; ASSERT(b.flag)"
            )
        ),
    "type promotion in ternary operator": testWithContext(
        temporaryValues.context,
        temporaryValues.passExpressions(
            "b IS PDerived ? b.flag : FALSE",
            "~(b IS PDerived) ? FALSE : b.flag",
            "(b IS PDerived) & bVar ? b.flag : FALSE",
            "~~(b IS PDerived) ? b.flag : FALSE"
            ),
        temporaryValues.failExpressions(
            "b IS PDerived ? FALSE : b.flag",
            "(b IS PDerived ? FALSE : TRUE) & b.flag"
            )
        ),
    "type promotion in IF": testWithContext(
        temporaryValues.context,
        temporaryValues.passStatements(
            "IF b IS PDerived THEN b.flag := FALSE; END;",
            "IF (b IS PDerived) & bVar THEN b.flag := FALSE; END;",
            "IF bVar & (b IS PDerived) THEN b.flag := FALSE; END;",
            "IF FALSE THEN ELSIF b IS PDerived THEN b.flag := FALSE; END;",
            "IF b IS PDerived THEN bVar := (b IS PDerived2) & b.flag2; b.flag := FALSE; END;",
            "IF bVar THEN ELSIF b IS PDerived2 THEN ELSIF b IS PDerived THEN END;",
            "IF bVar THEN ELSIF b IS PDerived THEN ELSIF b IS PDerived THEN ELSIF b IS PDerived THEN END;",
            "IF b IS PDerived THEN IF bVar OR (b IS PDerived2) THEN b.flag := FALSE; END; END"
            ),
        temporaryValues.failStatements(
            "IF (b IS PDerived) OR bVar THEN b.flag := FALSE; END",
            "IF bVar OR (b IS PDerived) THEN b.flag := FALSE; END",
            "IF (b2 IS PDerived) OR (b IS PDerived) THEN b.flag := FALSE; END",
            "IF (b IS PDerived) OR (b IS PDerived) THEN b.flag := FALSE; END",
            "IF (b IS PDerived) OR (b IS PDerived) OR b.flag THEN END",
            "IF (b IS PDerived) OR (b IS PDerived) OR (b IS PDerived) THEN b.flag := FALSE; END",
            "IF ((b IS PDerived) OR (b IS PDerived)) THEN b.flag := FALSE; END",
            "IF (b IS PDerived) OR (b IS PDerived2) THEN b.flag := FALSE; END",
            "IF (b IS PDerived2) OR (b IS PDerived) THEN b.flag := FALSE; END",
            "IF b IS PDerived THEN END; b.flag := FALSE",
            "IF ~(b IS PDerived) THEN END; b.flag := FALSE",
            "IF ~(b IS PDerived) THEN ELSIF bVar THEN END; b.flag := FALSE",
            "IF ~(b IS PDerived) THEN ELSIF bVar THEN ELSE END; b.flag := FALSE",
            "IF bVar THEN ELSIF b IS PDerived THEN ELSE END; b.flag := FALSE",
            "IF b IS PDerived THEN ELSE b.flag := FALSE; END",
            "IF bVar OR (b IS PDerived) THEN b.flag := FALSE; END;",
            "IF bVar OR (b IS PDerived) THEN ELSE b.flag := FALSE; END;",
            "IF bVar OR ~(b IS PDerived) THEN b.flag := FALSE; END;",
            "IF b IS PDerived THEN ELSIF TRUE THEN b.flag := FALSE; END",
            "IF bVar THEN bVar := (b IS PDerived) & bVar; ASSERT(b.flag); END",
            "IF b IS PDerived ? FALSE : TRUE THEN ASSERT(b.flag); END"
             )
        ),
    "invert type promotion in IF": testWithContext(
        temporaryValues.context,
        temporaryValues.passStatements(
            "IF ~(b IS PDerived) THEN ELSE b.flag := FALSE; END;",
            "IF ~(b IS PDerived) THEN ELSIF bVar THEN b.flag := FALSE; ELSE b.flag := FALSE; END;",
            "IF ~(b IS PDerived) THEN ELSIF ~(b2 IS PDerived) THEN b.flag := FALSE; ELSE b.flag := FALSE; b2.flag := FALSE; END;",
            "IF ~(b IS PDerived) OR bVar THEN ELSE b.flag := FALSE; END;",
            "IF ~(b IS PDerived) OR b.flag THEN ELSE b.flag := FALSE; END;",
            "IF ~(b IS PDerived) OR (b2 IS PDerived) THEN ELSE b.flag := FALSE; END;",
            "IF ~(b IS PDerived) OR ~(b2 IS PDerived) THEN ELSE b2.flag := FALSE; END;",
            "IF ~(b IS PDerived) THEN bVar := b IS PDerived; ELSE b.flag := FALSE; END;",
            "IF ~(b IS PDerived) THEN ASSERT((b IS PDerived) & b.flag); ELSE b.flag := FALSE; END;",
            "IF bVar OR ~(b IS PDerived) THEN ELSE b.flag := FALSE; END;"
            ),
        temporaryValues.failStatements(
            "IF ~(b IS PDerived) & bVar THEN ELSE b.flag := FALSE; END; END p;",
            "IF ~(b IS PDerived) THEN ELSIF ~(b2 IS PDerived) THEN b2.flag := FALSE; END;",
            "IF bVar OR (b IS PDerived) THEN ELSE b.flag := FALSE; END;"
            )
        ),
    "type promotion in WHILE": testWithContext(
        temporaryValues.context,
        temporaryValues.passStatements(
            "WHILE (b IS PDerived) & b.flag DO END;",
            "WHILE ~(b IS PDerived) OR b.flag DO END;",
            "WHILE b IS PDerived DO b.flag := FALSE; END;",
            "WHILE ~(b IS PDerived) DO ELSIF b.flag DO END;",
            "WHILE ~(b IS PDerived) DO ELSIF bVar DO b.flag := FALSE; END;"
            ),
        temporaryValues.failStatements(
            "WHILE b IS PDerived DO END; b.flag := FALSE;"
            )
        ),
    "type promotion cannot be reset by assignment": testWithContext(
        temporaryValues.context,
        pass(),
        fail(["PROCEDURE p(); BEGIN b <- pBase; IF b IS PDerived THEN b := pBase; b.flag := FALSE; END; END p;",
              "type mismatch: 'PDerived' cannot be assigned to 'POINTER TO Base' expression"]
            )
        ),
    "type promotion cannot be reset by passing as VAR argument": testWithContext(
        temporaryValues.context,
        pass(),
        fail(["PROCEDURE p(); PROCEDURE procBaseAsVar(VAR p: PBase); END procBaseAsVar;  BEGIN b <- pBase; IF b IS PDerived THEN procBaseAsVar(b); b.flag := FALSE; END; END p;",
              "type mismatch for argument 1: cannot pass 'PDerived' as VAR parameter of type 'PBase'"]
            )
        ),
    "type promotion after dereferencing": testWithContext(
        temporaryValues.context,
        temporaryValues.passExpressions(
            "(b^ IS Derived) & b.flag",
            "(b^ IS Derived) & passPDerived(b)"
            )
        ),
    "IS expression after type promotion": testWithContext(
        temporaryValues.context,
        pass(),
        fail(["PROCEDURE p(); BEGIN b <- pBase; IF b IS PDerived THEN bVar := b IS PDerived; b.flag := FALSE; END; END p;",
              "invalid type test: 'Derived' is not an extension of 'Derived'"]
            )
        ),
    "record types as values": testWithContext(
          context(grammar.declarationSequence,
                "TYPE Base = RECORD pBase: POINTER TO Base END;"
                + "Derived = RECORD (Base) END;"
                + "VAR base: Base;"
                + "PROCEDURE procBaseVar(VAR b: Base); END procBaseVar;"
               ),
          pass("PROCEDURE p(b: Base); BEGIN base <- b; procBaseVar(base); base := b; END p;"),
          fail(["PROCEDURE p(); BEGIN baseVar <- base.pBase^; ASSERT(base IS Derived); END p;",
                "invalid type test: a value variable cannot be used"],
               ["PROCEDURE p(VAR b: Base); BEGIN base <- b; ASSERT(base IS Derived); END p;",
                "invalid type test: a value variable cannot be used"],
               ["PROCEDURE p(b: Base); BEGIN base <- b; ASSERT(base IS Derived); END p;",
                "invalid type test: a value variable cannot be used"],
               ["PROCEDURE p(); TYPE Abstract = RECORD PROCEDURE method() END; PROCEDURE test(a: Abstract); BEGIN v <- a; END test; END p;",
                "cannot instantiate 'Abstract' because it has abstract method(s): method"],
               ["PROCEDURE p(); TYPE T = RECORD PROCEDURE method() END; PROCEDURE T.method(); BEGIN ASSERT(SELF(POINTER) # NIL); END T.method; PROCEDURE test(r: T); BEGIN v <- r; END test; END p;",
                "cannot declare a variable of type 'T' (and derived types) because SELF(POINTER) was used in its method(s)"]
              )
      ),
    "arrays as values": testWithContext(
          context(grammar.declarationSequence,
                "TYPE A = ARRAY 3 OF INTEGER; T = RECORD a: A END;"
                + "VAR r: T;"
                + "PROCEDURE procArrayVar(VAR a: A); END procArrayVar;"
               ),
          pass("PROCEDURE p(r: T); BEGIN a <- r.a; a[0] := 123; procArrayVar(a); END p;",
               "PROCEDURE p(a: A); BEGIN tmp <- a; END p;",
               "PROCEDURE p(); VAR a: A; BEGIN tmp <- a; END p;",
               "PROCEDURE p(); VAR a: ARRAY 3 OF BOOLEAN; BEGIN tmp <- a; END p;"
               ),
          fail(["PROCEDURE p(a: ARRAY OF INTEGER); BEGIN v <- a; END p;",
                "cannot initialize variable 'v' with open array"]
              )
    ),
    "FOR variable": testWithContext(
          context(grammar.statement, ""),
          pass("FOR i <- 0 TO 10 DO END",
               "FOR i <- 0 TO 10 DO FOR j <- 0 TO 10 BY 1 DO END END",
               "IF TRUE THEN FOR i <- 0 TO 10 DO END; FOR i <- 0 TO 10 BY 1 DO END; END"
               ),
          fail(["FOR i <- 0.0 TO 10 DO END", "'INTEGER' expression expected to assign 'i', got 'REAL'"],
               ["IF TRUE THEN FOR i <- 0 TO 10 DO END; i := 1; END", "undeclared identifier: 'i'"]
               )
          )
    },
    "type promotion for VAR arguments": testWithContext(
        context(grammar.declarationSequence, 
                "TYPE Base = RECORD END; PBase = POINTER TO Base;"
                + "Derived = RECORD (Base) flag: BOOLEAN END; PDerived = POINTER TO Derived;"),
        pass("PROCEDURE p(VAR b: Base); BEGIN ASSERT((b IS Derived) & b.flag); END p;"),
        fail(["PROCEDURE p(VAR b: PBase); BEGIN ASSERT((b IS PDerived) & b.flag); END p;",
              "type 'Base' has no 'flag' field"])
    ),
    "type promotion for non-VAR arguments": testWithContext(
        context(grammar.declarationSequence, 
                "TYPE Base = RECORD END; PBase = POINTER TO Base;"
                + "Derived = RECORD (Base) flag: BOOLEAN END; PDerived = POINTER TO Derived;"),
        pass("PROCEDURE p(b: PBase); BEGIN ASSERT((b IS PDerived) & b.flag); END p;")
    ),
    "Non-VAR arguments cannot be modified": testWithContext(
        context(grammar.declarationSequence, 
                "TYPE PBase = POINTER TO RECORD END; T = RECORD i: INTEGER END;"
                + "PROCEDURE pArrayRef(VAR a: ARRAY OF INTEGER); END pArrayRef;"
                + "PROCEDURE recordVar(VAR r: T); END recordVar;"),
        pass("PROCEDURE p(VAR i: INTEGER); BEGIN i := 0; END p;",
             "PROCEDURE p(VAR b: PBase); BEGIN b := NIL; END p;"),
        fail(["PROCEDURE p(i: INTEGER); BEGIN i := 0; END p;", 
              "cannot assign to non-VAR formal parameter"],
             ["PROCEDURE p(b: PBase); BEGIN b := NIL; END p;", 
              "cannot assign to non-VAR formal parameter"],
             ["PROCEDURE p(a: ARRAY OF INTEGER); BEGIN pArrayRef(a) END;",
              "non-VAR formal parameter cannot be passed as VAR actual parameter"],
             ["PROCEDURE p(r: T); BEGIN recordVar(r); END p",
              "non-VAR formal parameter cannot be passed as VAR actual parameter"],
             ["PROCEDURE p(s1, s2: ARRAY OF CHAR); BEGIN s1 := s2 END p",
              "cannot assign to non-VAR formal parameter"],
             ["PROCEDURE p(s: ARRAY OF CHAR); BEGIN s := \"abc\" END p", 
              "cannot assign to non-VAR formal parameter"]
            )
    ),
    "array": {
            "static array indexOf": testWithContext(
                context(grammar.expression, 
                        "TYPE "
                        + "T = RECORD END;"
                        + "VAR "
                        + "r: T;"
                        + "intArray: ARRAY 3 OF INTEGER;"
                        + "boolDynArray: ARRAY * OF BOOLEAN;"
                        + "recordArray: ARRAY 3 OF T;"
                        + "arrayOfArray: ARRAY 3, 4 OF INTEGER;"
                        ),
                pass("intArray.indexOf(0)",
                     "boolDynArray.indexOf(FALSE) = -1"
                    ),
                fail(["intArray.indexOf(TRUE)", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"],
                     ["recordArray.indexOf(r)", "'indexOf' is not defined for array of 'T'"],
                     ["arrayOfArray.indexOf(intArray)", "'indexOf' is not defined for array of 'ARRAY 4 OF INTEGER'"],
                     ["intArray.indexOf", "array's method 'indexOf' cannot be referenced"]                
                    )
            ),
            "open array indexOf": testWithGrammar(
                grammar.declarationSequence,
                pass("PROCEDURE p(a: ARRAY OF INTEGER): INTEGER; RETURN a.indexOf(123) END p;"
                    )
            ),
        "dynamic": {
            "declaration": testWithContext(
                context(grammar.declarationSequence, 
                        "TYPE DA = ARRAY * OF INTEGER;"),
                pass("TYPE A = ARRAY * OF INTEGER;",
                     "TYPE A = ARRAY * OF ARRAY * OF INTEGER;",
                     "TYPE A = ARRAY *, * OF INTEGER;",
                     "TYPE A = ARRAY 3, * OF INTEGER;",
                     "TYPE A = ARRAY *, 3 OF INTEGER;",
                     "TYPE P = PROCEDURE(): DA;",
                     "TYPE P = PROCEDURE(VAR a: DA): DA;",
                     "TYPE P = PROCEDURE(VAR a: ARRAY * OF INTEGER): DA;",
                     "TYPE T = RECORD a: ARRAY * OF T END;",
                     "VAR a: ARRAY * OF INTEGER;",
                     "PROCEDURE p(VAR a: ARRAY * OF INTEGER);END p;",
                     "PROCEDURE p(VAR a: ARRAY * OF ARRAY * OF INTEGER);END p;",
                     "PROCEDURE p(VAR a: ARRAY OF ARRAY * OF INTEGER);END p;"
                     ),
                fail(["TYPE A = ARRAY OF INTEGER;", "not parsed"],
                     ["TYPE P = PROCEDURE(): ARRAY OF INTEGER;", "';' expected"],
                     ["TYPE P = PROCEDURE(a: DA);", "dynamic array has no use as non-VAR argument 'a'"],
                     ["TYPE P = PROCEDURE(a: ARRAY * OF INTEGER);", "dynamic array has no use as non-VAR argument 'a'"],
                     ["PROCEDURE p(a: DA);END p;", "dynamic array has no use as non-VAR argument 'a'"],
                     ["PROCEDURE p(a: ARRAY * OF INTEGER);END p;", "dynamic array has no use as non-VAR argument 'a'"],
                     ["PROCEDURE p(a: ARRAY OF ARRAY * OF INTEGER);END p;", "dynamic array has no use as non-VAR argument 'a'"],
                     ["PROCEDURE p(a: ARRAY * OF ARRAY OF INTEGER);END p;", "dynamic array has no use as non-VAR argument 'a'"]
                     )
            ),
            "return": testWithContext(
                context(grammar.declarationSequence, 
                        "TYPE A = ARRAY * OF INTEGER; B = ARRAY * OF BOOLEAN;"
                        + "VAR a: A; b: B;"),
                pass("PROCEDURE p(): A; RETURN a END p;",
                     "PROCEDURE p(): A; VAR static: ARRAY 3 OF INTEGER; RETURN static END p;"),
                fail(["PROCEDURE p(): ARRAY OF INTEGER; RETURN a; END p;", "not parsed"],
                     ["PROCEDURE p(): A; RETURN b; END p;", "RETURN 'ARRAY * OF INTEGER' expected, got 'ARRAY * OF BOOLEAN'"])
            ),
            "pass as non-VAR argument": testWithContext(
                context(grammar.statement, 
                        "TYPE Int3 = ARRAY 3 OF INTEGER;"
                        + "VAR dInt: ARRAY * OF INTEGER;"
                        + "dIntInt: ARRAY *,* OF INTEGER;"
                        + "PROCEDURE pOpenInt(a: ARRAY OF INTEGER); END pOpenInt;"
                        + "PROCEDURE pOpenIntOfInt(a: ARRAY OF ARRAY OF INTEGER); END pOpenIntOfInt;"
                        + "PROCEDURE pInt3(a: Int3); END pInt3;"),
                pass("pOpenInt(dInt)",
                     "pOpenIntOfInt(dIntInt)"),
                fail(["pInt3(dInt)", "type mismatch for argument 1: 'ARRAY * OF INTEGER' cannot be converted to 'ARRAY 3 OF INTEGER'"])
            ),
            "pass as VAR argument": testWithContext(
                context(grammar.statement, 
                        "TYPE A = ARRAY * OF INTEGER; B = ARRAY * OF BOOLEAN;"
                        + "VAR a: A; b: B; aStatic: ARRAY 3 OF INTEGER;"
                        + "aIntInt: ARRAY * OF ARRAY * OF INTEGER;"
                        + "aInt3Int: ARRAY * OF ARRAY 3 OF INTEGER;"
                        + "PROCEDURE paVar(VAR a: A); END paVar;"
                        + "PROCEDURE paVarOpen(VAR a: ARRAY OF INTEGER); END paVarOpen;"
                        + "PROCEDURE pDynamicIntOfInt(VAR a: ARRAY * OF ARRAY * OF INTEGER); END pDynamicIntOfInt;"
                        + "PROCEDURE pDynamicIntOfOpenInt(VAR a: ARRAY * OF ARRAY OF INTEGER); END pDynamicIntOfOpenInt;"
                        ),
                pass("paVar(a)",
                     "paVarOpen(a)",
                     "pDynamicIntOfInt(aIntInt)",
                     "pDynamicIntOfOpenInt(aIntInt)",
                     "pDynamicIntOfOpenInt(aInt3Int)"
                     ),
                fail(["paVar(aStatic)", "type mismatch for argument 1: cannot pass 'ARRAY 3 OF INTEGER' as VAR parameter of type 'ARRAY * OF INTEGER'"],
                     ["pDynamicIntOfInt(aInt3Int)", "type mismatch for argument 1: 'ARRAY *, 3 OF INTEGER' cannot be converted to 'ARRAY *, * OF INTEGER'"]
                     )
            ),
            "assign": testWithContext(
                context(grammar.statement, 
                        "VAR stat: ARRAY 3 OF INTEGER; dynamic: ARRAY * OF INTEGER;"),
                pass("dynamic := stat"),
                fail(["stat := dynamic", "type mismatch: 'ARRAY 3 OF INTEGER' cannot be assigned to 'ARRAY * OF INTEGER' expression"],
                     ["dynamic := NIL", "type mismatch: 'ARRAY * OF INTEGER' cannot be assigned to 'NIL' expression"])
            ),
            "indexing": testWithContext(
                context(grammar.expression, 
                        "VAR a: ARRAY * OF INTEGER;"),
                pass("a[0]", "a[1]"),
                fail(["a[-1]", "index is negative: -1"], 
                     ["a[-2]", "index is negative: -2"])
            ),
            "indexOf": testWithContext(
                context(grammar.expression, 
                        "VAR intArray: ARRAY * OF INTEGER;"
                        ),
                pass("intArray.indexOf(0)"),
                fail()
            ),
            "add": testWithContext(
                context(grammar.statement, 
                        "VAR a: ARRAY * OF INTEGER;"
                         + "a2: ARRAY * OF ARRAY * OF INTEGER;"
                         + "aStatic: ARRAY 3 OF INTEGER;"
                         + "byte: BYTE;"),
                pass("a.add(123)",
                     "a.add(byte)",
                     "a2.add(a)",
                     "a2.add(aStatic)"
                     ),
                fail(["a.add := NIL", "cannot assign to dynamic array's method 'add'"],
                     ["v <- a.add", "dynamic array's method 'add' cannot be referenced"],                
                     ["a.add()", "method 'add' expects one argument, got nothing"],
                     ["a.add(1, 2)", "method 'add' expects one argument, got many"],                
                     ["a.add(TRUE)", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"]                
                    )
            ),
            "add open array to dynamic array of static arrays": testWithContext(
                context(grammar.declarationSequence, 
                        "VAR a: ARRAY * OF ARRAY 3 OF INTEGER;"),
                pass(),
                fail(["PROCEDURE p(paramA: ARRAY OF INTEGER); BEGIN a.add(paramA); END p", 
                      "type mismatch for argument 1: 'ARRAY OF INTEGER' cannot be converted to 'ARRAY 3 OF INTEGER'"]                
                    )
            ),
            "remove": testWithContext(
                context(grammar.statement, 
                        "VAR a: ARRAY * OF INTEGER;"),
                pass("a.remove(0)"),
                fail(["a.remove(-1)", "index is negative: -1"],
                     ["a.remove()", "1 argument(s) expected, got 0"],
                     ["a.remove(0, 1)", "1 argument(s) expected, got 2"],
                     ["a.remove(TRUE)", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"],
                     ["a.Remove(0)", "selector '.Remove' cannot be applied to 'ARRAY * OF INTEGER'"]
                    )
            ),
            "clear": testWithContext(
                context(grammar.statement, 
                        "VAR a: ARRAY * OF INTEGER;"),
                pass("a.clear()"),
                fail(["a.clear(0)", "0 argument(s) expected, got 1"])
            ),
            "add, remove and clear cannot be called for read-only array": testWithContext(
                context(grammar.declarationSequence, 
                        "TYPE T = RECORD a: ARRAY * OF INTEGER; END;"),
                pass("PROCEDURE p(VAR r: T); BEGIN r.a.add(1); END;",
                     "PROCEDURE p(VAR r: T); BEGIN r.a.remove(1); END;",
                     "PROCEDURE p(VAR r: T); BEGIN r.a.clear(); END;"
                     ),
                fail(["PROCEDURE p(r: T); BEGIN r.a.add(1); END;", "method 'add' cannot be applied to non-VAR dynamic array"],
                     ["PROCEDURE p(r: T); BEGIN r.a.remove(1); END;", "method 'remove' cannot be applied to non-VAR dynamic array"],
                     ["PROCEDURE p(r: T); BEGIN r.a.clear(); END;", "method 'clear' cannot be applied to non-VAR dynamic array"]
                    )
            )
        }
    },
"syntax relaxation": testWithGrammar(
    grammar.declarationSequence, 
    pass("PROCEDURE p; END;",
         "TYPE T = RECORD field: INTEGER; END;",
         "TYPE T = RECORD PROCEDURE method(); END;",
         "TYPE T = RECORD PROCEDURE method(); END; PROCEDURE T.method(); END;",
         "PROCEDURE p(): INTEGER; RETURN 0; END;"
         )
    ),
"constructor": {
    "declaration": testWithGrammar(
        grammar.declarationSequence, 
        pass("TYPE T = RECORD PROCEDURE T(); END; PROCEDURE T.T(); END;",
             "TYPE T = RECORD PROCEDURE T(); i: INTEGER; END; PROCEDURE T.T(); BEGIN SELF.i := 0; END;",
             "TYPE T = RECORD PROCEDURE T(); END; PROCEDURE T.T(); END T.T;",
             "TYPE T = RECORD PROCEDURE T(a: INTEGER); END; PROCEDURE T.T(a: INTEGER); END;"
        ),
        fail(["TYPE T = RECORD END; PROCEDURE T(); END;", "'T' already declared"],
             ["TYPE T = RECORD END; PROCEDURE T.T(); END;", "constructor was not declared for 'T'"],
             ["TYPE T = RECORD PROCEDURE T(); END; PROCEDURE T.T(a: INTEGER); END;", "constructor 'T' signature mismatch: declared as 'PROCEDURE' but defined as 'PROCEDURE(INTEGER)'"],
             ["TYPE T = RECORD PROCEDURE T(); PROCEDURE T(); END;", "constructor 'T' already declared"],
             ["TYPE T = RECORD PROCEDURE T(); END; PROCEDURE T.T(); END T;", "mismatched method names: expected 'T.T' at the end (or nothing), got 'T'"],
             ["TYPE T = RECORD PROCEDURE T(); END; PROCEDURE p(); PROCEDURE T.T(); END; END;", "method should be defined in the same scope as its bound type 'T'"],
             ["PROCEDURE p(); TYPE T = RECORD PROCEDURE T(); END; END;", "constructor was declared for 'T' but was not defined"],
             ["TYPE T = RECORD PROCEDURE T(); END; PROCEDURE T.T(); END; PROCEDURE T.T(); END;", "constructor already defined for 'T'"],   
             ["TYPE T = RECORD PROCEDURE T(): INTEGER; END;", "constructor 'T' cannot have result type specified"],
             ["TYPE T = ARRAY 3 OF INTEGER; PROCEDURE T(); END;", "'T' already declared"]
             )
        ),
    "as expression": testWithContext(
        context(grammar.expression,
                "TYPE T = RECORD i: INTEGER; END; PT = POINTER TO T; ProcType = PROCEDURE(): INTEGER;"
                + "ConsWithArguments = RECORD PROCEDURE ConsWithArguments(a: INTEGER); END;"
                + "PROCEDURE ConsWithArguments.ConsWithArguments(a: INTEGER); END;"
                + "PROCEDURE byVar(VAR a: T): INTEGER; RETURN 0; END;"
                + "PROCEDURE byNonVar(a: T): INTEGER; RETURN 0; END;"
                ),
        pass("T()",
             "byNonVar(T())",
             "T().i",
             "ConsWithArguments(123)"
             ),
        fail(["ProcType()", "PROCEDURE expected, got 'ProcType'"],
             ["PT()", "PROCEDURE expected, got 'PT'"],
             ["byVar(T())", "expression cannot be used as VAR parameter"],
             ["T(0)", "0 argument(s) expected, got 1"],
             ["ConsWithArguments()", "1 argument(s) expected, got 0"],
             ["ConsWithArguments(FALSE)", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"]
            )
        ),
    "initialize in place variable": testWithContext(
        context(grammar.statement,
                "TYPE T = RECORD END;"),
        pass("r <- T()"),
        fail()
        ),
    "call base - correct": testWithContext(
        context(grammar.declarationSequence,
                "TYPE T = RECORD PROCEDURE T(a: INTEGER); END;"
                + "Derived = RECORD(T) PROCEDURE Derived(); END;"
                + "PROCEDURE T.T(a: INTEGER); END;"
               ),
        pass("PROCEDURE Derived.Derived() | SUPER(0); END;")
        ),
    "call base - incorrect": testWithContext(
        context(grammar.declarationSequence,
                "TYPE T = RECORD PROCEDURE T(a: INTEGER); END;"
                + "RecordWthoutBase = RECORD END;"
                + "Derived = RECORD(T) PROCEDURE Derived(); END;"
                + "DerivedWthoutConstructor = RECORD(RecordWthoutBase) PROCEDURE DerivedWthoutConstructor(); END;"
                + "RecordWthConstructorNoParameters = RECORD PROCEDURE RecordWthConstructorNoParameters(); END;"
                + "DerivedWthConstructorNoParameters = RECORD(RecordWthConstructorNoParameters) PROCEDURE DerivedWthConstructorNoParameters(); END;"
                + "PROCEDURE T.T(a: INTEGER); END;"
                + "PROCEDURE RecordWthConstructorNoParameters.RecordWthConstructorNoParameters(); END;"
               ),
        pass(),
        fail(["PROCEDURE Derived.Derived(); END;", "base record constructor has parameters but was not called (use '| SUPER' to pass parameters to base constructor)"],
             ["PROCEDURE Derived.Derived() | SUPER(1, 2); END;", "1 argument(s) expected, got 2"],
             ["PROCEDURE Derived.Derived() | SUPER(FALSE); END;", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"],
             ["PROCEDURE Derived.Derived() | SUPER(); END;", "1 argument(s) expected, got 0"],
             ["PROCEDURE Derived.Derived(); BEGIN SUPER(0); END;", "cannot call base constructor from procedure body (use '| SUPER' to pass parameters to base constructor)"],
             ["PROCEDURE RecordWthoutBase.RecordWthConstructorNoParametersthoutBase() | SUPER(0); END;", "'RecordWthoutBase' has no base type - SUPER cannot be used"],
             ["PROCEDURE DerivedWthoutConstructor.DerivedWthoutConstructor() | SUPER(); END;", "base record constructor has no parameters and will be called automatically (do not use '| SUPER' to call base constructor)"],
             ["PROCEDURE DerivedWthConstructorNoParameters.DerivedWthConstructorNoParameters() | SUPER(); END;", "base record constructor has no parameters and will be called automatically (do not use '| SUPER' to call base constructor)"]
            )
        ),
    "initialize fields (of non record type)": testWithContext(
        context(grammar.declarationSequence,
                "TYPE T = RECORD PROCEDURE T(); i: INTEGER; END;"),
        pass("PROCEDURE T.T() | i(123); END;"),
        fail(["PROCEDURE T.T() | i(); END;", "single argument expected to initialize field 'i'"],
             ["PROCEDURE T.T() | i(123, 456); END;", "single argument expected to initialize field 'i'"],
             ["PROCEDURE T.T() | i(TRUE); END;", 
              "type mismatch: field 'i' is 'INTEGER' and cannot be initialized using 'BOOLEAN' expression"]
            )
        ),
    "initialize array fields": testWithContext(
        context(grammar.declarationSequence,
                "TYPE RecordWithArray = RECORD PROCEDURE RecordWithArray(a: ARRAY OF INTEGER); aStatic: ARRAY 3 OF INTEGER; aDynamic: ARRAY * OF INTEGER; END;"
                ),
        pass("PROCEDURE RecordWithArray.RecordWithArray(a: ARRAY OF INTEGER) | aDynamic(a); END;"),
        fail(["PROCEDURE RecordWithArray.RecordWithArray(a: ARRAY OF INTEGER) | aStatic(a); END;", 
              "type mismatch: field 'aStatic' is 'ARRAY 3 OF INTEGER' and cannot be initialized using 'ARRAY OF INTEGER' expression"]
            )
        ),
    "initialize fields (of record type)": testWithContext(
        context(grammar.declarationSequence,
                "TYPE Field = RECORD PROCEDURE Field(a: INTEGER); END;"
              + "PROCEDURE Field.Field(a: INTEGER); END;"),
        pass("TYPE T = RECORD PROCEDURE T(); f: Field; END; PROCEDURE T.T() | f(123); END;"),
        fail(["TYPE T = RECORD PROCEDURE T(); f: Field; END; PROCEDURE T.T(); END;", 
              "constructor 'T' must initialize fields: f"],
             ["TYPE T = RECORD PROCEDURE T(); END; PROCEDURE T.T() | unknownField(123); END;", 
              "'unknownField' is not record 'T' own field"],
             ["TYPE T = RECORD f: Field; END; Derived = RECORD(T) PROCEDURE Derived(); END; PROCEDURE Derived.Derived() | f(123); END;", 
              "'f' is not record 'Derived' own field"],
             ["TYPE T = RECORD PROCEDURE T(); f: Field; END; PROCEDURE T.T() | f(123), f(123); END;", 
              "field 'f' is already initialized"]
             )
        ),
    "initialize fields using SELF": testWithContext(
        context(grammar.declarationSequence,
                "TYPE T = RECORD PROCEDURE T(); i1, i2: INTEGER; END;"
                ),
        pass("PROCEDURE T.T() | i2(SELF.i1); END;"),
        fail()
        ),
    "call base and initialize fields": testWithContext(
        context(grammar.declarationSequence,
                "TYPE Field = RECORD PROCEDURE Field(a: INTEGER); END;"
              + "T = RECORD PROCEDURE T(a: INTEGER); END;"
              + "Derived = RECORD(T) PROCEDURE Derived(); f: Field; END;"
              + "PROCEDURE Field.Field(a: INTEGER); END;"
              + "PROCEDURE T.T(a: INTEGER); END;"
              ),
        pass("PROCEDURE Derived.Derived() | SUPER(123), f(456); END;"),
        fail(["PROCEDURE Derived.Derived() | f(456), SUPER(123); END;", "not parsed"])
        ),
    "fields initialization order": testWithContext(
        context(grammar.declarationSequence,
                "TYPE Field = RECORD PROCEDURE Field(a: INTEGER); END;"
              + "T = RECORD PROCEDURE T(); f1: Field; f2, f3: Field; END;"
              + "PROCEDURE Field.Field(a: INTEGER); END;"
              ),
        pass("PROCEDURE T.T() | f1(1), f2(2), f3(3); END;"),
        fail(["PROCEDURE T.T() | f2(2), f1(1), f3(3); END;", "field 'f1' must be initialized before 'f2'"],
             ["PROCEDURE T.T() | f1(1), f3(3), f2(2); END;", "field 'f2' must be initialized before 'f3'"]
            )
        ),
    "fields with constructor but record without constructor": testWithContext(
        context(grammar.declarationSequence,
                "TYPE Field = RECORD PROCEDURE Field(a: INTEGER); END;"
              + "PROCEDURE Field.Field(a: INTEGER); END;"
              ),
        pass(),
        fail(["TYPE T = RECORD f: Field; END;", "constructor 'T' must initialize fields: f"])
        ),
    "inherit constructor parameters": testWithContext(
        context(grammar.expression,
                "TYPE Base = RECORD PROCEDURE Base(i: INTEGER); END;"
              + "Derived = RECORD(Base) END;"
              + "PROCEDURE Base.Base(a: INTEGER); END;"
              ),
        pass("Derived(123)"),
        fail(["Derived()", "1 argument(s) expected, got 0"])
        ),
    "ARRAY OF record with constructor": testWithContext(
        context(grammar.declarationSequence,
                "TYPE NoParams = RECORD PROCEDURE NoParams(); END;"
              + "WithParams = RECORD PROCEDURE WithParams(i: INTEGER); END;"
              + "PROCEDURE NoParams.NoParams(); END;"
              + "PROCEDURE WithParams.WithParams(i: INTEGER); END;"
              ),
        pass("TYPE T = ARRAY * OF NoParams;",
             "TYPE T = ARRAY 3 OF NoParams;",
             "TYPE T = ARRAY * OF WithParams;",
             "VAR a: ARRAY 3 OF NoParams;",
             "VAR a: ARRAY * OF WithParams;",
             "PROCEDURE p(); VAR a: ARRAY * OF WithParams; BEGIN a.add(WithParams(123)); END;"
            ),
        fail(["TYPE T = ARRAY 3 OF WithParams;", "cannot use 'WithParams' as an element of static array because it has constructor with parameters"],
             ["VAR a: ARRAY 3 OF WithParams;", "cannot use 'WithParams' as an element of static array because it has constructor with parameters"]
            )
        ),
    "NEW": testWithContext(
        context(grammar.statement,
                "TYPE WithParams = RECORD PROCEDURE WithParams(i: INTEGER); END;"
              + "DerivedWithParams = RECORD(WithParams) END;"
              + "VAR p: POINTER TO WithParams; pd: POINTER TO DerivedWithParams;"
              + "PROCEDURE WithParams.WithParams(i: INTEGER); END;"
              ),
        pass(),
        fail(["NEW(p)", "cannot use procedure NEW for 'WithParams' because it has constructor with parameters, use operator NEW instead"],
             ["NEW(pd)", "cannot use procedure NEW for 'DerivedWithParams' because it has constructor with parameters, use operator NEW instead"]
            )
        ),
    "export": testWithModule(
          "MODULE test;"
        + "TYPE Exported* = RECORD PROCEDURE Exported*(); END;"
        + "NotExported* = RECORD PROCEDURE NotExported(); END;"
        + "DerivedNotExportedWithoutConstructor* = RECORD (NotExported) END;"
        + "NoConstructor* = RECORD END;"
        + "PROCEDURE Exported.Exported(); END;"
        + "PROCEDURE NotExported.NotExported(); END;"
        + "END test.",
        pass("MODULE m; IMPORT test; VAR r: test.Exported; p: POINTER TO test.Exported; BEGIN p := NEW test.Exported(); NEW(p); END m.",
             "MODULE m; IMPORT test; TYPE T = RECORD(test.Exported) END; END m.",
             "MODULE m; IMPORT test; TYPE T = RECORD(test.NoConstructor) END; END m.",
             "MODULE m; IMPORT test; TYPE T = RECORD(test.DerivedNotExportedWithoutConstructor) END; END m.",
             "MODULE m; IMPORT test; PROCEDURE p(r: test.NotExported); BEGIN copy <- r; END; END m."
            ),
        fail(["MODULE m; TYPE T = RECORD PROCEDURE T*(); END; END m.",
              "constructor 'T' cannot be exported because record itslef is not exported"],
             ["MODULE m; IMPORT test; TYPE T = RECORD(test.NotExported) END; END m.",
              "cannot extend 'NotExported' - its constructor was not exported"],
             ["MODULE m; IMPORT test; VAR r: test.NotExported; END m.",
              "cannot instantiate 'NotExported' - its constructor was not exported"],
             ["MODULE m; IMPORT test; VAR p: POINTER TO test.NotExported; BEGIN NEW(p); END m.",
              "cannot instantiate 'NotExported' - its constructor was not exported"],
             ["MODULE m; IMPORT test; VAR p: POINTER TO test.NotExported; BEGIN p := NEW test.NotExported(); END m.",
              "cannot instantiate 'NotExported' - its constructor was not exported"],
             ["MODULE m; IMPORT test; VAR a: ARRAY 3 OF test.NotExported; END m.",
              "cannot instantiate 'NotExported' - its constructor was not exported"]
            )
        )
    },
"operator NEW": testWithContext(
    context(grammar.expression,
            "TYPE T = RECORD field: INTEGER; END; Proc = PROCEDURE();"
            + "ParamCons = RECORD PROCEDURE ParamCons(i: INTEGER); END;"
            + "Abstract = RECORD PROCEDURE abstract(); END;"
            + "PROCEDURE ParamCons.ParamCons(i: INTEGER); END;"
            + "PROCEDURE proc(); END;"
          ),
    pass("NEW T()",
         "NEW ParamCons(123)",
         "NEW T().field",
         "NEW T()^"
         ),
    fail(["NEW INTEGER()", "record type is expected in operator NEW, got 'INTEGER'"],
         ["NEW proc()", "record type is expected in operator NEW, got 'procedure 'proc''"],
         ["NEW Proc()", "record type is expected in operator NEW, got 'Proc'"],
         ["NEW T().unknownField", "type 'T' has no 'unknownField' field"],
         ["NEW T(123)", "0 argument(s) expected, got 1"],
         ["NEW Abstract()", "cannot instantiate 'Abstract' because it has abstract method(s): abstract"],
         ["NEW undeclared()", "undeclared identifier: 'undeclared'"]
         )
    ),
"FOR IN": {
    "array": testWithContext(
        context(grammar.statement, 
                "VAR a: ARRAY 3 OF BOOLEAN;"),
        pass("FOR i, v IN a DO END",
             "FOR i, v IN a DO ASSERT(a[i] = v); END",
             "FOR v IN a DO END",
             "FOR v IN a DO ASSERT(~v) END"),
        fail()
    ),
    "string": testWithContext(
        context(grammar.statement,
                "CONST cc = 22X; cs = \"abc\";"
              + "VAR s: STRING; as: ARRAY 3 OF CHAR;"),
        pass("FOR c IN s DO END",
             "FOR c IN cc DO END",
             "FOR c IN cs DO END",
             "FOR c IN as DO END",
             "FOR c IN \"abc\" DO END",
             "FOR c IN 22X DO END"
            ),
        fail(["FOR c IN as DO c := 22X; END", "cannot assign to FOR variable"])
    ),
    "map": testWithContext(
        context(grammar.statement,
                "TYPE T = RECORD END;"
              + "VAR m: MAP OF INTEGER; r: T;"),
        pass("FOR k, v IN m DO END",
             "FOR k, v IN m DO ASSERT(k # \"abc\"); END",
             "FOR k, v IN m DO ASSERT(v # 123); END"
            ),
        fail(["FOR k, k IN m DO END", "'k' already declared"],
             ["FOR m, v IN m DO END", "'m' already declared in module scope"],
             ["FOR k, m IN m DO END", "'m' already declared in module scope"],
             ["FOR k, v IN m DO k := \"\"; END", "cannot assign to FOR variable"],
             ["FOR k, v IN m DO v := 0; END", "cannot assign to FOR variable"],
             ["FOR k, v IN r DO END", "expression of type ARRAY, STRING or MAP is expected in FOR, got 'T'"],
             ["FOR k, v IN T DO END", "type name 'T' cannot be used as an expression"]
            )
        ),
    "scope": testWithContext(
        context(grammar.declarationSequence,
                "VAR m: MAP OF INTEGER;"),
        pass(),
        fail(["PROCEDURE p(); BEGIN FOR k, v IN m DO END; ASSERT(k # \"abc\"); END;", "undeclared identifier: 'k'"],
             ["PROCEDURE p(); BEGIN FOR k, v IN m DO END; ASSERT(v # 123); END;", "undeclared identifier: 'v'"]
             )
        )
},
"map": {
    "declaration": testWithGrammar(
        grammar.declarationSequence, 
        pass("TYPE M = MAP OF INTEGER;",
             "TYPE M = MAP OF PROCEDURE;",
             "TYPE M = MAP OF PROCEDURE();",
             "TYPE M = MAP OF PROCEDURE(): INTEGER;",
             "TYPE M = MAP OF PROCEDURE(): M;",
             "TYPE M = MAP OF RECORD END;",
             "TYPE M = MAP OF POINTER TO RECORD END;",
             "TYPE M = MAP OF MAP OF INTEGER;",
             "TYPE M = MAP OF ARRAY * OF INTEGER;",
             "TYPE M = MAP OF M;",
             "TYPE T = RECORD field: MAP OF T; END;",
             "VAR v: MAP OF SET;"
            ),
        fail(["TYPE P = POINTER TO MAP OF INTEGER;", "RECORD is expected as a POINTER base type, got 'MAP OF INTEGER'"],
             ["TYPE M = MAP OF Undeclared;", "undeclared identifier: 'Undeclared'"],
             ["VAR MAP: INTEGER;", "not parsed"]
            )
        ),
    "assign": testWithContext(
        context(grammar.statement, 
                "TYPE MapOfInteger = MAP OF INTEGER;"
                + "VAR mapOfInteger1: MapOfInteger; mapOfInteger2: MAP OF INTEGER;"
                + "mapOfString: MAP OF STRING;"),
        pass("mapOfInteger1 := mapOfInteger2"),
        fail(["mapOfInteger1 := mapOfString", "type mismatch: 'MAP OF INTEGER' cannot be assigned to 'MAP OF STRING' expression"])
    ),
    "put": testWithContext(
        context(grammar.statement,
                "VAR m: MAP OF INTEGER;"
                + "sIndex: STRING; aIndex: ARRAY 3 OF CHAR;"),
        pass("m[\"abc\"] := 123",
             "m[sIndex] := 123",
             "m[aIndex] := 123"
            ),
        fail(["m[123] := 123", "invalid MAP key type: STRING or string literal or ARRAY OF CHAR expected, got 'INTEGER'"])
        ),
    "get": testWithContext(
        context(grammar.expression,
                "VAR m: MAP OF INTEGER;"
                + "sIndex: STRING; aIndex: ARRAY 3 OF CHAR;"),
        pass("m[\"abc\"]",
             "m[sIndex]",
             "m[aIndex]"
            ),
        fail(["m[123]", "invalid MAP key type: STRING or string literal or ARRAY OF CHAR expected, got 'INTEGER'"])
        ),
    "get and pass as VAR": testWithContext(
        context(grammar.statement,
                "TYPE T = RECORD END;"
                + "VAR mInt: MAP OF INTEGER;"
                + "    mS: MAP OF STRING;"
                + "    mR: MAP OF T;"
                + "PROCEDURE intByRef(VAR i: INTEGER); END;"
                + "PROCEDURE stringByRef(VAR s: STRING); END;"
                + "PROCEDURE recordByRef(VAR r: T); END;"
                ),
        pass("recordByRef(mR[\"a\"])"),
        fail(["intByRef(mInt[\"a\"])", "cannot reference MAP's element of type 'INTEGER'"],
             ["stringByRef(mS[\"a\"])", "cannot reference MAP's element of type 'STRING'"]
            )
        ),
    "IN": testWithContext(
        context(grammar.expression,
                "VAR m: MAP OF INTEGER;"
                + "sIndex: STRING; aIndex: ARRAY 3 OF CHAR;"),
        pass("\"abc\" IN m",
             "(\"abc\" IN m) = FALSE",
             "sIndex IN m",
             "aIndex IN m"
            ),
        fail(["123 IN m", "invalid MAP key type: STRING or string literal or ARRAY OF CHAR expected, got 'INTEGER'"])
        ),
    "non-VAR parameter": testWithContext(
        context(grammar.declarationSequence,
                "TYPE M = MAP OF INTEGER;"),
        pass(),
        fail(["PROCEDURE p(m: M); BEGIN m[\"abc\"] := 123; END;", "cannot assign to read-only MAP's element of type 'INTEGER'"])
        ),
    "remove": testWithContext(
        context(grammar.statement,
                "VAR m: MAP OF INTEGER; a: ARRAY * OF CHAR;"),
        pass("m.remove(\"abc\")",
             "m.remove(a)"),
        fail(["m.remove(123)", "type mismatch for argument 1: 'INTEGER' cannot be converted to 'ARRAY OF CHAR'"],
             ["m.remove()", "1 argument(s) expected, got 0"],
             ["m.remove(\"abc\", \"abc\")", "1 argument(s) expected, got 2"],
             ["v <- m.remove", "MAP's method 'remove' cannot be referenced"]
            )
        ),
    "clear": testWithContext(
        context(grammar.statement,
                "VAR m: MAP OF INTEGER;"),
        pass("m.clear()", "m.clear"),
        fail(["m.clear(123)", "0 argument(s) expected, got 1"]
            )
        ),
    "clear and remove cannot be applied to read only map": testWithContext(
        context(grammar.declarationSequence,
                "TYPE M = MAP OF INTEGER;"),
        pass("PROCEDURE p(VAR m: M); BEGIN; m.remove(\"abc\"); END;",
             "PROCEDURE p(VAR m: M); BEGIN; m.clear(); END;"),
        fail(["PROCEDURE p(m: M); BEGIN; m.remove(\"abc\"); END;", "method 'remove' cannot be applied to non-VAR MAP"],
             ["PROCEDURE p(m: M); BEGIN; m.clear(); END;", "method 'clear' cannot be applied to non-VAR MAP"]
            )
        ),
    "return": testWithContext(
        context(grammar.declarationSequence,
                "TYPE M = MAP OF INTEGER;"),
        pass("PROCEDURE p(): M; VAR m: M; BEGIN; RETURN m; END;")
        )
    },
"ternary operator": testWithContext(
        context(grammar.expression,
                "TYPE Base = RECORD END; PBase = POINTER TO Base;"
                    + "Derived = RECORD(Base) END; PDerived = POINTER TO Derived;"
                    + "Derived2 = RECORD(Base) END; Derived3 = RECORD(Base) END;" 
                + "VAR b: BOOLEAN; i1, i2: INTEGER; s: STRING; byte: BYTE;"
                + "rb: Base; rd: Derived; rd2: Derived2; rd3: Derived3;"
                + "pb: PBase; pd: POINTER TO Derived; pd2: POINTER TO Derived2; pd3: POINTER TO Derived3;"
                + "PROCEDURE passBase(b: Base): BOOLEAN; RETURN TRUE END;"
                + "PROCEDURE passDerived(d: Derived): BOOLEAN; RETURN TRUE END;"
                + "PROCEDURE passPBase(p: PBase): BOOLEAN; RETURN TRUE END;"
                + "PROCEDURE passPDerived(p: PDerived): BOOLEAN; RETURN TRUE END;"
                + "PROCEDURE passRef(VAR i: INTEGER): BOOLEAN; RETURN TRUE END;"
                ),
        pass("b ? i1 : i2",
             "(b ? i1 : i2) # 0",
             "FLT(b ? i1 : i2)",
             "b ? i1 : byte",
             "b ? byte : i1",
             "b ? \"abc\" : \"de\"",
             "b ? s : \"de\"",
             "b ? \"abc\" : s",
             "b ? pb : pd",
             "b ? pd : pb",
             "b ? pb : NIL",
             "b ? NIL : pb",
             "passBase(b ? pb^ : pd^)",
             "passBase(b ? pd^ : pb^)",
             "passBase(b ? pd2^ : pd3^)",
             "passBase(b ? rb : rd)",
             "passBase(b ? rd : rb)",
             "passBase(b ? rd2 : rd3)",
             "b ? i1 : b ? i1 : i2",
             "passPBase(b ? pb : pd)",
             "passPBase(b ? pd : pb)",
             "passPBase(b ? pb : NIL)",
             "passPBase(b ? NIL : pb)"
             ),
        fail(["b ?", "not parsed"],
             ["b ? i1", "expected \":\" after \"?\" in ternary operator"],
             ["b ? i1 :", "expression is expected after \":\" in ternary operator"],
             ["b ? i1 : s", "incompatible types in ternary operator: 'INTEGER' and 'STRING'"],
             ["passBase(b ? pb^ : pd)", "incompatible types in ternary operator: 'Base' and 'POINTER TO Derived'"],
             ["passDerived(b ? pb : pd)", "type mismatch for argument 1: 'POINTER TO Base' cannot be converted to 'Derived'"],
             ["passDerived(b ? pd : pb)", "type mismatch for argument 1: 'POINTER TO Base' cannot be converted to 'Derived'"],
             ["b ? b ? i1 : i2 : i1", "expected \":\" after \"?\" in ternary operator"],
             ["b ? rb : NIL", "incompatible types in ternary operator: 'Base' and 'NIL'"],
             ["b ? NIL : NIL", "cannot use 'NIL' as a result of ternary operator"],
             ["passPDerived(b ? NIL : pb)", "type mismatch for argument 1: 'PBase' cannot be converted to 'PDerived'"],
             ["passPDerived(b ? pb : NIL)", "type mismatch for argument 1: 'PBase' cannot be converted to 'PDerived'"],
             ["passRef(b ? i1 : i2)", "ternary operator result cannot be passed as VAR actual parameter"]
             )
    ),
"array expression": testWithGrammar(
    grammar.expression,
    pass("[1]",
         "[1, 2]",
         "[FALSE, TRUE]"
         ),
    fail(["[]", "not parsed"],
         ["[1, TRUE]", "array's elements should have the same type: expected 'INTEGER', got 'BOOLEAN'"],
         ["[NIL]", "cannot use NIL to initialize array's element"],
         ["[1, NIL]", "cannot use NIL to initialize array's element"],
         ["[[1, 2], [3, 4]]", "array's elements should have the same type: expected 'ARRAY 2 OF INTEGER', got 'ARRAY 2 OF INTEGER'"] // not supported
        )
    ),
"CONST array": testWithGrammar(
    grammar.declarationSequence,
    pass("CONST a = [1];",
         "CONST a = [1, 2];",
         "CONST a = [FALSE, TRUE];"
         )
    ),
"CONST array pass to procedure": testWithContext(
    context(grammar.expression,
            "CONST a = [1, 2, 3];"
            + "PROCEDURE intArray(a: ARRAY OF INTEGER): BOOLEAN; RETURN FALSE; END;"
            + "PROCEDURE intVarArray(VAR a: ARRAY OF INTEGER): BOOLEAN; RETURN FALSE; END;"
            + "PROCEDURE charArray(a: ARRAY OF CHAR): BOOLEAN; RETURN FALSE; END;"
            ),
    pass("intArray(a)"
         ),
    fail(["intVarArray(a)", "constant cannot be passed as VAR actual parameter"],
         ["charArray(a)", "type mismatch for argument 1: 'ARRAY 3 OF INTEGER' cannot be converted to 'ARRAY OF CHAR'"])
    ),
"CONST array with string literals": testWithContext(
    context(grammar.expression,
            "CONST a = [\"a\", \"bc\", \"d\"];"
            + "PROCEDURE stringArray(a: ARRAY OF STRING): BOOLEAN; RETURN FALSE; END;"
            ),
    pass("stringArray(a)")
    )
};

})(imports["test_unit_eberon.js"]);
imports["test_unit_oberon.js"] = {};
(function module$test_unit_oberon(exports){
"use strict";

var language = require("oberon/oberon_grammar.js").language;
var TestUnitCommon = require("test_unit_common.js");

var pass = TestUnitCommon.pass;
var fail = TestUnitCommon.fail;
var context = TestUnitCommon.context;

function testWithContext(context, pass, fail){
    return TestUnitCommon.testWithContext(context, grammar.declarationSequence, language, pass, fail);
}

function testWithGrammar(parser, pass, fail){
    return TestUnitCommon.testWithGrammar(parser, language, pass, fail);
}

var grammar = language.grammar;

exports.suite = {
"arithmetic operators": testWithContext(
    context(grammar.statement, "VAR b1: BOOLEAN;"),
    pass(),
    fail(["b1 := b1 + b1", "operator '+' type mismatch: numeric type or SET expected, got 'BOOLEAN'"])
    ),
"eberon key words can be identifiers": testWithGrammar(
    grammar.variableDeclaration,
    pass("SELF: INTEGER",
         "SUPER: INTEGER"
         )
    ),
"eberon types are missing": testWithGrammar(
    grammar.variableDeclaration,
    pass(),
    fail(["s: STRING", "undeclared identifier: 'STRING'"])
    ),
"array does not have indexOf() method": testWithContext(
    context(grammar.expression,
            "VAR a: ARRAY 3 OF INTEGER;"),
    pass(),
    fail(["a.indexOf(123)", "selector '.indexOf' cannot be applied to 'ARRAY 3 OF INTEGER'"])
    ),
"cannot designate call result in expression": testWithContext(
    context(grammar.expression,
            "TYPE PT = POINTER TO RECORD field: INTEGER END;"
            + "ProcType = PROCEDURE(): INTEGER;"
            + "VAR p: PT;"
            + "PROCEDURE proc(): PT; RETURN p END proc;"
            + "PROCEDURE p1(): INTEGER; RETURN 1 END p1;"
            + "PROCEDURE p2(): ProcType; RETURN p1 END p2;"),
    pass(),
    fail(["proc().field", "not parsed"],
         ["p2()()", "not parsed"])
    ),
"cannot designate call result in statement": testWithContext(
    context(grammar.statement,
            "PROCEDURE p; END p;"),
    pass(),
    fail(["p()()", "not parsed"])
    ),
"procedure arguments can be modified": testWithContext(
    context(grammar.procedureDeclaration, ""),
    pass("PROCEDURE p(a: INTEGER); BEGIN a := a + 1 END p")
    ),
"Non-VAR ARRAY parameter cannot be passed as VAR": testWithContext(
    context(grammar.procedureDeclaration,
            "PROCEDURE pArrayRef(VAR a: ARRAY OF INTEGER); END pArrayRef;"
            ),
    pass(),
    fail(["PROCEDURE p(a: ARRAY OF INTEGER); BEGIN pArrayRef(a) END p",
          "non-VAR formal parameter cannot be passed as VAR actual parameter"]
         )
    ),
"Non-VAR RECORD parameter cannot be passed as VAR": testWithContext(
    context(grammar.procedureDeclaration,
            "TYPE T = RECORD i: INTEGER END;"
            + "PROCEDURE recordVar(VAR r: T); END recordVar;"
            ),
    pass(),
    fail(["PROCEDURE p(r: T); BEGIN recordVar(r); END p",
          "non-VAR formal parameter cannot be passed as VAR actual parameter"]
         )
    ),
"Non-VAR open array assignment fails": testWithGrammar(
    grammar.procedureDeclaration,
    pass(),
    fail(["PROCEDURE p(s1, s2: ARRAY OF CHAR); BEGIN s1 := s2 END p",
          "cannot assign to non-VAR formal parameter"])
    ),
"string assignment to non-VAR open array fails": testWithGrammar(
    grammar.procedureDeclaration,
    pass(),
    fail(["PROCEDURE p(s: ARRAY OF CHAR); BEGIN s := \"abc\" END p", "cannot assign to non-VAR formal parameter"])
    ),
"procedure": testWithGrammar(
    grammar.procedureDeclaration,
    pass(),
    fail(["PROCEDURE p; END", "not parsed"])
    ),
"syntax strictness": testWithGrammar(
    grammar.procedureDeclaration,
    pass(),
    fail(["TYPE T = RECORD field: INTEGER; END;", "not parsed"],
         ["PROCEDURE p(): INTEGER; RETURN 0; END;", "END expected (PROCEDURE)"])
    )
};

})(imports["test_unit_oberon.js"]);
imports["test_unit.js"] = {};
(function module$test_unit(exports){
"use strict";

var assert = require("rtl.js").assert;
var Class = require("rtl.js").Class;
var CodeGenerator = require("js/CodeGenerator.js");
var Grammar = require("grammar.js");
var Test = require("test.js");
var TestUnitCommon = require("test_unit_common.js");
var TestUnitEberon = require("test_unit_eberon.js");
var TestUnitOberon = require("test_unit_oberon.js");

var eberon = require("eberon/eberon_grammar.js").language;
var oberon = require("oberon/oberon_grammar.js").language;

var context = TestUnitCommon.context;
var pass = TestUnitCommon.pass;
var fail = TestUnitCommon.fail;
var setupParser = TestUnitCommon.setupParser;
var testWithSetup = TestUnitCommon.testWithSetup;

function makeSuiteForGrammar(language){
    var grammar = language.grammar;
    function testWithContext(context, pass, fail){
        return TestUnitCommon.testWithContext(context, grammar.declarationSequence, language, pass, fail);
    }

    function testWithModule(src, pass, fail){
        return TestUnitCommon.testWithModule(src, language, pass, fail);
    }

    function testWithGrammar(parser, pass, fail){
        return TestUnitCommon.testWithGrammar(parser, language, pass, fail);
    }

return {
"comment": testWithGrammar(
    grammar.expression,
    pass("(**)123",
         "(*abc*)123",
         "(*abc*)(*def*)123",
         "(*a(*b*)c*)123"),
    fail(["(*123", "comment was not closed"])
    ),
"spaces are required to separate keywords and integers": testWithGrammar(
    grammar.typeDeclaration,
    pass(),
    fail(["T = ARRAY10OFARRAY5OFINTEGER", "not parsed"],
         ["T = ARRAY10 OF ARRAY 5 OF INTEGER", "not parsed"],
         ["T = ARRAY 10OF ARRAY 5 OF INTEGER", "not parsed"],
         ["T = ARRAY 10 OFARRAY 5 OF INTEGER", "not parsed"],
         ["T = ARRAY 10 OF ARRAY5 OF INTEGER", "undeclared identifier: 'ARRAY5'"],
         ["T = ARRAY 10 OF ARRAY 5OF INTEGER", "not parsed"],
         ["T = ARRAY 10 OF ARRAY 5 OFINTEGER", "not parsed"])
    ),
"expression": testWithContext(
    context(grammar.expression,
            "TYPE ProcType = PROCEDURE(): INTEGER;"
            + "PROCEDURE p1(): INTEGER; RETURN 1 END p1;"
            + "PROCEDURE p2(): ProcType; RETURN p1 END p2;"
            + "PROCEDURE noResult(); END noResult;"),
    pass("123",
         "1+2",
         "1 + 2",
         "1 + 2 + 3",
         "-1",
         "+1",
         "p1()",
         "p1() + p1()",
         "p2()",
         "~FALSE",
         "~TRUE"
         ),
    fail(["", "not parsed"],
         ["12a", "not parsed"],
         ["noResult()", "procedure returning no result cannot be used in an expression"],
         ["1 + INTEGER", "type name 'INTEGER' cannot be used as an expression"],
         ["INTEGER + 1", "type name 'INTEGER' cannot be used as an expression"],
         ["1 * INTEGER", "type name 'INTEGER' cannot be used as an expression"],
         ["INTEGER * 1", "type name 'INTEGER' cannot be used as an expression"],
         ["-INTEGER", "type name 'INTEGER' cannot be used as an expression"],
         ["+INTEGER", "type name 'INTEGER' cannot be used as an expression"],
         ["~BOOLEAN", "type name 'BOOLEAN' cannot be used as an expression"],
         ["INTEGER", "type name 'INTEGER' cannot be used as an expression"],
         ["~~INTEGER", "type name 'INTEGER' cannot be used as an expression"],
         ["1 + + 1", "invalid operand"],
         ["1 * + 1", "invalid operand"]
         )
    ),
"string expression": testWithContext(
    context(grammar.expression,
            "CONST cs = \"abc\";"
            + "PROCEDURE charByRef(VAR c: CHAR): CHAR; RETURN c END charByRef;"
           ),
    pass("\"\"",
         "\"a\"",
         "\"abc\"",
         "0FFX",
         "0AX",
         "22X",
         "0X"),
    fail(["\"", "unexpected end of string"],
         ["\"abc", "unexpected end of string"],
         ["FFX", "undeclared identifier: 'FFX'"],
         ["charByRef(cs[1])", "read-only array's element cannot be passed as VAR actual parameter"]
        )
    ),
"parentheses": testWithGrammar(
    grammar.expression,
    pass("(1)",
         "(1 + 2)",
         "(1 + 2) * 3",
         "3 * (1 + 2)"),
    fail(["(1  + 2", "no matched ')'"])
    ),
"identifier": testWithSetup(
    function(){
        var IdentDeclarationContext = Class.extend({
            init: function IdentDeclarationContext(){this.__ident = undefined;},
            handleIdent: function(id){this.__ident = id;},
            ident: function() {return this.__ident;},
            getResult: function() {return this.__ident;},
        });
        function makeContext() {return new IdentDeclarationContext();}

        return setupParser(grammar.ident, language, makeContext);},
    pass("i", "abc1"),
    fail(["", "not parsed"],
         [";", "not parsed"],
         ["1", "not parsed"]
         )
    ),
"variable declaration": testWithGrammar(
    grammar.variableDeclaration,
    pass("i: INTEGER",
         "i, j: INTEGER"),
    fail(["i: T", "undeclared identifier: 'T'"],
         ["p: POINTER TO T", "type 'T' was not declared"])
    ),
"record declaration": testWithGrammar(
    grammar.typeDeclaration,
    pass("T = RECORD END",
         "T = RECORD i: INTEGER END",
         "T = RECORD i, j: INTEGER END",
         "T = RECORD i, j: INTEGER; b: BOOLEAN END",
         "T = RECORD p: PROCEDURE(r: T) END",
         "T = POINTER TO RECORD p: PROCEDURE(): T END"
         ),
    fail(["T = RECORD i, j, i: INTEGER END", "duplicated field: 'i'"],
         ["T = RECORD r: T END", "recursive field definition: 'r'"],
         ["T = RECORD a: ARRAY 10 OF T END", "recursive field definition: 'a'"],
         ["T = RECORD a: ARRAY 3 OF ARRAY 5 OF T END", "recursive field definition: 'a'"],
         ["T = RECORD r: RECORD rr: T END END", "recursive field definition: 'r'"],
         ["T = RECORD (T) END", "recursive inheritance: 'T'"],
         ["T = RECORD r: RECORD (T) END END", "recursive field definition: 'r'"],
         ["T = RECORD p: PROCEDURE(): T END", "procedure cannot return T"]
         )
    ),
"record cannot have forward type as a base": testWithGrammar(
    grammar.declarationSequence,
    pass(),
    fail(["TYPE PForward = POINTER TO Forward; T = RECORD (Forward) END;", 
          "undeclared identifier: 'Forward'"])
    ),
"record extension": testWithContext(
    context(grammar.typeDeclaration,
            "TYPE B = RECORD END;"),
    pass("T = RECORD(B) END"
         ),
    fail(["T = RECORD(INTEGER) END", "RECORD type is expected as a base type, got 'INTEGER'"],
         ["T = RECORD(INTEGER) m: INTEGER END", "RECORD type is expected as a base type, got 'INTEGER'"]
         )
    ),
"array declaration": testWithContext(
    context(grammar.typeDeclaration,
            "CONST c1 = 5; VAR v1: INTEGER; p: POINTER TO RECORD END;"),
    pass("T = ARRAY 10 OF INTEGER",
         "T = ARRAY 10 OF BOOLEAN",
         "T = ARRAY 1 + 2 OF INTEGER",
         "T = ARRAY c1 OF INTEGER",
         "T = ARRAY ORD({0..5} <= {0..8}) OF INTEGER",
         "T = ARRAY 1, 2 OF ARRAY 3, 4 OF INTEGER"
         ),
    fail(["T = ARRAY 0 OF INTEGER",
          "array size must be greater than 0, got 0"],
         ["T = ARRAY TRUE OF INTEGER",
          "'INTEGER' constant expression expected, got 'BOOLEAN'"],
         ["T = ARRAY v1 OF INTEGER",
          "constant expression expected as ARRAY size"],
         ["T = ARRAY p OF INTEGER",
          "'INTEGER' constant expression expected, got 'POINTER TO anonymous RECORD'"],
         ["T = ARRAY c1 - 10 OF INTEGER",
          "array size must be greater than 0, got -5"],
         ["T = ARRAY ORD({0..5} >= {0..8}) OF INTEGER",
          "array size must be greater than 0, got 0"]
         )
    ),
"multi-dimensional array declaration": testWithGrammar(
    grammar.typeDeclaration,
    pass("T = ARRAY 10 OF ARRAY 5 OF INTEGER",
         "T = ARRAY 10, 5 OF INTEGER")
    ),
"PROCEDURE type declaration": testWithContext(
    context(grammar.typeDeclaration, "TYPE R = RECORD END; A = ARRAY 3 OF INTEGER;"),
    pass("T = PROCEDURE",
         "T = PROCEDURE()",
         "T = PROCEDURE(a: INTEGER)",
         "T = PROCEDURE(a: INTEGER; b: BOOLEAN)",
         "T = PROCEDURE(): T"),
    fail(["T = PROCEDURE(): A;", "procedure cannot return ARRAY 3 OF INTEGER"],
         ["T = PROCEDURE(): R;", "procedure cannot return R"],
         ["T = ARRAY 3 OF PROCEDURE(): T;", "procedure cannot return ARRAY 3 OF PROCEDURE"]
        )
    ),
"POINTER declaration": testWithGrammar(
    grammar.typeDeclaration,
    pass("T = POINTER TO RECORD END",
         "T = RECORD p: POINTER TO T END",
         "T = POINTER TO RECORD p: T END"),
    fail(["T = POINTER TO INTEGER",
          "RECORD is expected as a POINTER base type, got 'INTEGER'"],
         ["T = POINTER TO POINTER TO RECORD END",
          "RECORD is expected as a POINTER base type, got 'POINTER TO anonymous RECORD'"],
         ["T = POINTER TO RECORD p: POINTER TO T END",
          "RECORD is expected as a POINTER base type, got 'T'"],
         ["T = POINTER TO T",
          "RECORD is expected as a POINTER base type"]
        )
    ),
"POINTER dereference": testWithContext(
    context(grammar.statement,
            "TYPE T = RECORD END; PT = POINTER TO T;"
            + "VAR pt: PT; p: POINTER TO RECORD field: INTEGER END; i: INTEGER; r: RECORD END;"
            + "PROCEDURE pVar(VAR r: T);END pVar;"),
    pass("p^.field := 1",
         "p.field := 0",
         "pVar(pt^)"),
    fail(["i^", "POINTER TO type expected, got 'INTEGER'"],
         ["r^", "POINTER TO type expected, got 'anonymous RECORD'"],
         ["p.unknown := 0", "type 'anonymous RECORD' has no 'unknown' field"],
         ["pt.constructor := 0", "type 'T' has no 'constructor' field"], // "constructor" is JS predefined property
         ["pt.prototype := 0", "type 'T' has no 'prototype' field"], // "prototype" is JS predefined property
         ["pt.unknown := 0", "type 'T' has no 'unknown' field"])
    ),
"POINTER argument dereference and passing as VAR": testWithContext(
    context(grammar.declarationSequence,
            "TYPE T = RECORD END; PT = POINTER TO T;"
            + "VAR pt: PT; p: POINTER TO RECORD field: INTEGER END; i: INTEGER; r: RECORD END;"
            + "PROCEDURE pVar(VAR r: T);END pVar;"),
    pass("PROCEDURE proc(p: PT); BEGIN pVar(p^); END proc;"),
    fail()
    ),
"POINTER assignment": testWithContext(
    context(grammar.statement,
            "TYPE Base = RECORD END;"
                + "Derived = RECORD (Base) END;"
                + "PDerivedAnonymous = POINTER TO RECORD(Base) END;"
            + "VAR p1, p2: POINTER TO RECORD END;"
                + "pBase: POINTER TO Base; pDerived: POINTER TO Derived;"
                + "pDerivedAnonymous: PDerivedAnonymous;"
                + "pDerivedAnonymous2: POINTER TO RECORD(Base) END;"
                ),
    pass("p1 := NIL",
         "p1 := p2",
         "pBase := pDerived",
         "pBase := pDerivedAnonymous",
         "pBase := pDerivedAnonymous2"
         ),
    fail(["p1 := pBase",
          "type mismatch: 'POINTER TO anonymous RECORD' cannot be assigned to 'POINTER TO Base' expression"],
          ["pDerived := pBase",
           "type mismatch: 'POINTER TO Derived' cannot be assigned to 'POINTER TO Base' expression"],
          ["NIL := p1", "not parsed"])
    ),
"typeguard": testWithContext(
    context(grammar.expression,
            "TYPE Base = RECORD END; PBase = POINTER TO Base; Derived = RECORD (Base) END; PDerived = POINTER TO Derived;"
            + "VAR p1, p2: POINTER TO RECORD END; pBase: POINTER TO Base; pDerived: POINTER TO Derived;"
            + "vb: Base; i: INTEGER;"),
    pass("pBase(PDerived)",
         "pBase^(Derived)"),
    fail(["pDerived(PDerived)",
          "invalid type cast: 'Derived' is not an extension of 'Derived'"],
         ["p1(PBase)", 
          "invalid type cast: 'Base' is not an extension of 'anonymous RECORD'"],
         ["p1(INTEGER)", 
          "invalid type cast: POINTER type expected as an argument of POINTER type cast, got 'INTEGER'"],
         ["i(Derived)",
          "invalid type cast: POINTER to type or RECORD expected, got 'INTEGER'"],
         ["vb(Derived)",
          "invalid type cast: a value variable cannot be used"],
         ["vb(PDerived)",
          "invalid type cast: a value variable cannot be used"])
    ),
"NIL": testWithContext(
    context(grammar.expression,
            "VAR i: INTEGER;"),
    pass(),
    fail(["i = NIL", "type mismatch: expected 'INTEGER', got 'NIL'"])
        ),
"POINTER relations": testWithContext(
    context(grammar.expression,
            "TYPE B = RECORD END; D = RECORD(B) END; PB = POINTER TO B;"
          + "VAR p1, p2: POINTER TO RECORD END; pb: POINTER TO B; pd: POINTER TO D;"),
    pass("p1 = p2",
         "p1 # p2",
         "pb = pd",
         "pd # pb"
         ),
    fail(["p1 < p2", "operator '<' type mismatch: numeric type or CHAR or character array expected, got 'POINTER TO anonymous RECORD'"],
         ["p1 <= p2", "operator '<=' type mismatch: numeric type or SET or CHAR or character array expected, got 'POINTER TO anonymous RECORD'"],
         ["p1 > p2", "operator '>' type mismatch: numeric type or CHAR or character array expected, got 'POINTER TO anonymous RECORD'"],
         ["p1 >= p2", "operator '>=' type mismatch: numeric type or SET or CHAR or character array expected, got 'POINTER TO anonymous RECORD'"],
         ["p1 = pb", "type mismatch: expected 'POINTER TO anonymous RECORD', got 'POINTER TO B'"],
         ["pb = PB", "type name 'PB' cannot be used as an expression"],
         ["PB = pb", "type name 'PB' cannot be used as an expression"]
         )
    ),
"IS expression": testWithContext(
    context(grammar.expression,
            "TYPE Base = RECORD END; Derived = RECORD (Base) END; PDerived = POINTER TO Derived;"
            + "VAR p: POINTER TO RECORD END; pBase: POINTER TO Base; pDerived: POINTER TO Derived; vDerived: Derived; i: INTEGER;"),
    pass("pBase IS PDerived",
         "pBase^ IS Derived"
        ),
    fail(["pBase IS pDerived", "type name expected"],
         ["pBase IS TRUE", "type name expected"],
         ["pBase IS vDerived", "type name expected"],
         ["Derived IS Derived", 
          "type name 'Derived' cannot be used as an expression"],
         ["i IS Derived", 
          "invalid type test: POINTER to type or RECORD expected, got 'INTEGER'"],
         ["p^ IS Derived", 
          "invalid type test: 'Derived' is not an extension of 'anonymous RECORD'"],
         ["p IS PDerived", 
          "invalid type test: 'Derived' is not an extension of 'anonymous RECORD'"],
         ["pDerived^ IS Derived", 
         "invalid type test: 'Derived' is not an extension of 'Derived'"],
         ["pDerived IS PDerived", 
         "invalid type test: 'Derived' is not an extension of 'Derived'"],
         ["pDerived^ IS Base", 
          "invalid type test: 'Base' is not an extension of 'Derived'"],
         ["pDerived IS INTEGER", 
          "invalid type test: POINTER type expected as an argument of POINTER type test, got 'INTEGER'"],
         ["pBase IS Derived", 
          "invalid type test: POINTER type expected as an argument of POINTER type test, got 'Derived'"],
         ["pBase^ IS PDerived", 
          "invalid type test: RECORD type expected as an argument of RECORD type test, got 'PDerived'"]
         )
    ),
"IS for VAR argument": testWithContext(
    context(grammar.procedureDeclaration,
            "TYPE Base = RECORD END; Derived = RECORD (Base) i: INTEGER END;"
            + "T = RECORD END; TD = RECORD(T) b: Base END;"),
    pass("PROCEDURE proc(VAR p: Base): BOOLEAN; RETURN p IS Derived END proc"),
    fail(["PROCEDURE proc(p: Base): BOOLEAN; RETURN p IS Derived END proc",
          "invalid type test: a value variable cannot be used"],
         ["PROCEDURE proc(p: TD): BOOLEAN; RETURN p.b IS Derived END proc",
          "invalid type test: a value variable cannot be used"],
         ["PROCEDURE proc(VAR p: T):BOOLEAN; RETURN p(TD).b IS Derived END proc",
          "invalid type test: a value variable cannot be used"])
    ),
"BYTE": testWithContext(
    context(grammar.statement,
              "VAR b1, b2: BYTE; i: INTEGER; set: SET; a: ARRAY 3 OF BYTE; ai: ARRAY 3 OF INTEGER;"
            + "PROCEDURE varIntParam(VAR i: INTEGER); END varIntParam;"
            + "PROCEDURE varByteParam(VAR b: BYTE); END varByteParam;"
            + "PROCEDURE arrayParam(b: ARRAY OF BYTE); END arrayParam;"
            + "PROCEDURE arrayIntParam(i: ARRAY OF INTEGER); END arrayIntParam;"
            ),
    pass("b1 := b2",
         "i := b1",
         "b2 := i",
         "a[b1] := i",
         "ASSERT(i = b1)",
         "ASSERT(b1 = i)",
         "ASSERT(i < b1)",
         "ASSERT(b1 > i)",
         "ASSERT(b1 IN set)",
         "i := b1 DIV i",
         "i := i DIV b1",
         "b1 := b1 MOD i",
         "b1 := i MOD b1",
         "b1 := b1 + i",
         "b1 := i - b1",
         "i := b1 * i",
         "i := -b1",
         "i := +b1",
         "arrayParam(a)",
         "arrayIntParam(ai)"
        ),
    fail(["i := b1 / i", "operator DIV expected for integer division"],
         ["varIntParam(b1)", "type mismatch for argument 1: cannot pass 'BYTE' as VAR parameter of type 'INTEGER'"],
         ["varByteParam(i)", "type mismatch for argument 1: cannot pass 'INTEGER' as VAR parameter of type 'BYTE'"],
         ["arrayParam(ai)", "type mismatch for argument 1: 'ARRAY 3 OF INTEGER' cannot be converted to 'ARRAY OF BYTE'"],
         ["arrayIntParam(a)", "type mismatch for argument 1: 'ARRAY 3 OF BYTE' cannot be converted to 'ARRAY OF INTEGER'"]
        )
    ),
"NEW": testWithContext(
    context(grammar.statement,
            "TYPE P = POINTER TO RECORD END; T = RECORD END;"
            + "VAR p: P; i: INTEGER; r: RECORD END;"
            + "PROCEDURE proc(): P; RETURN NIL END proc;"
            ),
    pass("NEW(p)"),
    fail(["NEW.NEW(p)", "selector '.NEW' cannot be applied to 'standard procedure NEW'"],
         ["NEW(i)", "POINTER variable expected, got 'INTEGER'"],
         ["NEW(r)", "POINTER variable expected, got 'anonymous RECORD'"],
         ["NEW()", "1 argument(s) expected, got 0"],
         ["NEW(p, p)", "1 argument(s) expected, got 2"],
         ["NEW(proc())", "expression cannot be used as VAR parameter"],
         ["NEW(P)", "cannot apply type cast to standard procedure NEW"],
         ["NEW(T)", "cannot apply type cast to standard procedure NEW"]
         )
    ),
"ABS": testWithContext(
    context(grammar.statement,
            "VAR i: INTEGER; r: REAL; c: CHAR;"),
    pass("i := ABS(i)",
         "r := ABS(r)"),
    fail(["i := ABS(r)", "type mismatch: 'INTEGER' cannot be assigned to 'REAL' expression"],
         ["i := ABS(c)", "type mismatch: expected numeric type, got 'CHAR'"],
         ["i := ABS(i, i)", "1 argument(s) expected, got 2"]
         )
    ),
"FLOOR": testWithContext(
    context(grammar.statement, "VAR i: INTEGER; r: REAL;"),
    pass("i := FLOOR(r)"),
    fail(["i := FLOOR(i)", "type mismatch for argument 1: 'INTEGER' cannot be converted to 'REAL'"],
         ["i := FLOOR(r, r)", "1 argument(s) expected, got 2"]
         )
    ),
"FLT": testWithContext(
    context(grammar.statement, "VAR i: INTEGER; r: REAL;"),
    pass("r := FLT(i)"),
    fail(["r := FLT(r)", "type mismatch for argument 1: 'REAL' cannot be converted to 'INTEGER'"],
         ["i := FLT(i, i)", "1 argument(s) expected, got 2"]
         )
    ),
"LSL": testWithContext(
    context(grammar.statement,
            "VAR i: INTEGER; r: REAL; c: CHAR;"),
    pass("i := LSL(i, i)"),
    fail(["i := LSL(i, r)", "type mismatch for argument 2: 'REAL' cannot be converted to 'INTEGER'"],
         ["i := LSL(r, i)", "type mismatch for argument 1: 'REAL' cannot be converted to 'INTEGER'"],
         ["r := LSL(i, i)", "type mismatch: 'REAL' cannot be assigned to 'INTEGER' expression"],
         ["i := LSL(i)", "2 argument(s) expected, got 1"]
         )
    ),
"ASR": testWithContext(
    context(grammar.statement,
            "VAR i: INTEGER; r: REAL; c: CHAR;"),
    pass("i := ASR(i, i)"),
    fail(["i := ASR(i, r)", "type mismatch for argument 2: 'REAL' cannot be converted to 'INTEGER'"],
         ["i := ASR(r, i)", "type mismatch for argument 1: 'REAL' cannot be converted to 'INTEGER'"],
         ["r := ASR(i, i)", "type mismatch: 'REAL' cannot be assigned to 'INTEGER' expression"],
         ["i := ASR(i)", "2 argument(s) expected, got 1"]
         )
    ),
"ROR": testWithContext(
    context(grammar.statement,
            "VAR i: INTEGER; r: REAL; c: CHAR;"),
    pass("i := ROR(i, i)"),
    fail(["i := ROR(i, r)", "type mismatch for argument 2: 'REAL' cannot be converted to 'INTEGER'"],
         ["i := ROR(r, i)", "type mismatch for argument 1: 'REAL' cannot be converted to 'INTEGER'"],
         ["r := ROR(i, i)", "type mismatch: 'REAL' cannot be assigned to 'INTEGER' expression"],
         ["i := ROR(i)", "2 argument(s) expected, got 1"]
         )
    ),
"ODD": testWithContext(
    context(grammar.statement, "VAR b: BOOLEAN;"),
    pass("b := ODD(1)",
         "b := ODD(123)"
         ),
    fail(["b := ODD(1.2)", "type mismatch for argument 1: 'REAL' cannot be converted to 'INTEGER'"],
         ["b := ODD(TRUE)", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"]
         )
),
"ODD const expression": testWithGrammar(
    grammar.typeDeclaration,
    pass("T = ARRAY ORD(ODD(1)) OF INTEGER",
         "T = ARRAY ORD(ODD(3)) OF INTEGER"
         ),
    fail(["T = ARRAY ORD(ODD(0)) OF INTEGER", "array size must be greater than 0, got 0"],
         ["T = ARRAY ORD(ODD(2)) OF INTEGER", "array size must be greater than 0, got 0"]
         )
),
"ORD": testWithContext(
    context(grammar.statement, "VAR ch: CHAR; i: INTEGER; b: BOOLEAN;"),
    pass("i := ORD(ch)",
         "i := ORD(TRUE)",
         "i := ORD(b)",
         "i := ORD(b = FALSE)",
         "i := ORD({1})",
         "i := ORD(\"a\")",
         "b := ORD(22X) = 022H"),
    fail(["i := ORD(1.2)", "ORD function expects CHAR or BOOLEAN or SET as an argument, got 'REAL'"],
         ["i := ORD(\"abc\")", "ORD function expects CHAR or BOOLEAN or SET as an argument, got 'multi-character string'"]
         )
),
"ORD const expression": testWithGrammar(
    grammar.typeDeclaration,
    pass("T = ARRAY ORD({0}) OF INTEGER",
         "T = ARRAY ORD({0}) + 1 OF INTEGER",
         "T = ARRAY ORD(TRUE) OF INTEGER",
         "T = ARRAY ORD(TRUE) + 1 OF INTEGER",
         "T = ARRAY ORD(\"A\") OF INTEGER",
         "T = ARRAY ORD(\"A\") + 1 OF INTEGER"
         ),
    fail(["T = ARRAY ORD({}) OF INTEGER", "array size must be greater than 0, got 0"],
         ["T = ARRAY ORD(FALSE) OF INTEGER", "array size must be greater than 0, got 0"],
         ["T = ARRAY ORD(0X) OF INTEGER", "array size must be greater than 0, got 0"]
         )
),
"CHR": testWithContext(
    context(grammar.statement, "VAR i: INTEGER; ch: CHAR;"),
    pass("ch := CHR(i)"),
    fail(["ch := CHR(ch)", "type mismatch for argument 1: 'CHAR' cannot be converted to 'INTEGER'"])
),
"INC": testWithContext(
    context(grammar.statement, "VAR i: INTEGER;"),
    pass("INC(i)",
         "INC(i, 3)",
         "INC(i, i)"),
    fail(["INC(i + i)", "expression cannot be used as VAR parameter"],
         ["INC()", "at least 1 argument expected, got 0"],
         ["INC(i, 1, 2)", "at most 2 arguments expected, got 3"]
         )
),
"DEC": testWithContext(
    context(grammar.statement, "VAR i: INTEGER;"),
    pass("DEC(i)",
         "DEC(i, 3)",
         "DEC(i, i)"),
    fail(["DEC(i + i)", "expression cannot be used as VAR parameter"],
         ["DEC()", "at least 1 argument expected, got 0"],
         ["DEC(i, 1, 2)", "at most 2 arguments expected, got 3"]
         )
),
"PACK": testWithContext(
    context(grammar.statement, "VAR r: REAL; i: INTEGER;"),
    pass("PACK(r, i)",
         "PACK(r, 3)"),
    fail(["PACK(r, r)", "type mismatch for argument 2: 'REAL' cannot be converted to 'INTEGER'"])
),
"UNPK": testWithContext(
    context(grammar.statement, "VAR r: REAL; i: INTEGER;"),
    pass("UNPK(r, i)"),
    fail(["UNPK(r, r)", "type mismatch for argument 2: 'REAL' cannot be converted to 'INTEGER'"],
         ["UNPK(r, 3)", "expression cannot be used as VAR parameter"],
         ["UNPK(123.456, i)", "expression cannot be used as VAR parameter"]
         )
),
"standard procedure cannot be referenced" : testWithContext(
    context(grammar.expression, "VAR chr: PROCEDURE(c: CHAR): INTEGER;"),
    pass(),
    fail(["CHR", "standard procedure CHR cannot be referenced"])
    ),
"assignment statement": testWithContext(
    context(grammar.statement,
            "CONST c = 15;"
            + "VAR ch: CHAR; i, n: INTEGER; b: BOOLEAN;"
                + "proc1: PROCEDURE; proc2: PROCEDURE(): INTEGER;"
                + "a: ARRAY 5 OF INTEGER;"
            + "PROCEDURE p(): INTEGER; RETURN 1 END p;"
            + "PROCEDURE noResult(); END noResult;"),
    pass("i := 0",
         "i := n",
         "i := c",
         "b := TRUE",
         "ch := \"A\"",
         "i := p()",
         "proc1 := proc1",
         "proc2 := NIL",
         "a[1] := 2"),
    fail(["i = 0", "did you mean ':=' (statement expected, got expression)?"],
         ["i := b", "type mismatch: 'INTEGER' cannot be assigned to 'BOOLEAN' expression"],
         ["c := i", "cannot assign to constant"],
         ["ch := \"AB\"",
          "type mismatch: 'CHAR' cannot be assigned to 'multi-character string' expression"],
         ["ch := CHAR",
          "type name 'CHAR' cannot be used as an expression"],
         ["i := .1", "expression expected"],
         ["proc1 := proc2",
          "type mismatch: 'PROCEDURE' cannot be assigned to 'PROCEDURE(): INTEGER' expression"],
         ["i := noResult()", "procedure returning no result cannot be used in an expression"])
    ),
"INTEGER number": testWithGrammar(
    grammar.expression,
    pass("0",
         "123",
         "1H",
         "1FH",
         "0FFH",
         "0H"),
    fail(["FFH", "undeclared identifier: 'FFH'"],
         ["FF", "undeclared identifier: 'FF'"],
         ["1HH", "not parsed"],
         ["1H0", "not parsed"],
         ["1 23", "not parsed"],
         ["1F FH", "integer constant looks like having hexadecimal format but 'H' suffix is missing"]
         )
    ),
"INTEGER number in statement": testWithGrammar(
    grammar.statement,
    pass("IF 1 < 2345 THEN END"),
    fail(["IF 1 < 2345THEN END", "invalid operand"],
         ["IF 1 < 2345HTHEN END", "invalid operand"])
    ),
"SET statement": testWithContext(
    context(grammar.statement, "VAR s: SET;"),
    pass("s := {}",
         "s := {0}",
         "s := {0, 1}",
         "s := {1 + 2, 5..10}")
    //fail("s := {32}", "0..31")
    ),
"REAL number": testWithGrammar(
    grammar.expression,
    pass("1.2345",
         "1.",
         "1.2345E6",
         "1.2345E+6",
         "1.2345E-12"),
    fail(["1..", "not parsed"],
         ["1..2", "not parsed"],
         ["1. 2345E-12", "not parsed"],
         ["1.23 45E-12", "not parsed"],
         ["1.2345 E-12", "not parsed"],
         ["1.2345E-1 2", "not parsed"])
    ),
"REAL number in statement": testWithGrammar(
    grammar.statement,
    pass("IF 1. < 1.2345 THEN END"),
    fail(["IF 1. < 1.2345THEN END", "invalid operand"])
    ),
"IF statement": testWithContext(
    context(grammar.statement,
            "VAR b1: BOOLEAN; i1: INTEGER; p: POINTER TO RECORD END;"),
    pass("IF b1 THEN i1 := 0 END",
         "IF FALSE THEN i1 := 0 ELSE i1 := 1 END",
         "IF TRUE THEN i1 := 0 ELSIF FALSE THEN i1 := 1 ELSE i1 := 2 END"),
    fail(["IF i1 THEN i1 := 0 END", "'BOOLEAN' expression expected, got 'INTEGER'"],
         ["IF b1 THEN i1 := 0 ELSIF i1 THEN i1 := 2 END",
          "'BOOLEAN' expression expected, got 'INTEGER'"],
         ["IF p THEN i1 := 0 END",
          "'BOOLEAN' expression expected, got 'POINTER TO anonymous RECORD'"],
         ["IF b1 (*THEN*) i1 := 0 END", "THEN expected"],
         ["IF b1 THEN i1 := 0 ELSIF ~b1 (*THEN*) i1 := 0 END", "THEN expected"])
    ),
"CASE statement with integer or char": testWithContext(
    context(grammar.statement,
              "CONST ci = 15; cc = \"A\"; cb = TRUE; cs = \"abc\";"
            + "TYPE T = RECORD END;"
            + "VAR c1: CHAR; b1: BOOLEAN; i1, i2: INTEGER; byte: BYTE; p: POINTER TO RECORD END;"),
    pass("CASE i1 OF END",
         "CASE i1 OF | END",
         "CASE i1 OF | 0: b1 := TRUE END",
         "CASE i1 OF 0: b1 := TRUE END",
         "CASE cc OF \"A\": b1 := TRUE END",
         "CASE \"A\" OF \"A\": b1 := TRUE END",
         "CASE c1 OF \"A\": b1 := TRUE END",
         "CASE byte OF 3: b1 := TRUE END",
         "CASE i1 OF 0: b1 := TRUE | 1: b1 := FALSE END",
         "CASE i1 OF 0, 1: b1 := TRUE END",
         "CASE c1 OF \"A\", \"B\": b1 := TRUE END",
         "CASE i1 OF 0..2: b1 := TRUE END",
         "CASE i1 OF ci..2: b1 := TRUE END",
         "CASE c1 OF cc..\"Z\": b1 := TRUE END",
         "CASE i1 OF 1, 2, 3: b1 := TRUE | 4..10: b1 := FALSE | 11: c1 := \"A\" END",
         "CASE i1 OF 1, 2, 5..9: b1 := TRUE END"
         ),
    fail(["CASE i1 OF undefined: b1 := TRUE END",
          "undeclared identifier: 'undefined'"],
         ["CASE i1 OF i2: b1 := TRUE END",
          "'i2' is not a constant"],
         ["CASE b1 OF END", "'RECORD' or 'POINTER' or 'INTEGER' or 'BYTE' or 'CHAR' expected as CASE expression"],
         ["CASE \"AA\" OF \"A\": b1 := TRUE END", "'RECORD' or 'POINTER' or 'INTEGER' or 'BYTE' or 'CHAR' expected as CASE expression"],
         ["CASE i1 OF \"A\": b1 := TRUE END",
          "label must be 'INTEGER' (the same as case expression), got 'CHAR'"],
         ["CASE i1 OF p: b1 := TRUE END",
          "'p' is not a constant"],
         ["CASE i1 OF T: b1 := TRUE END",
          "'T' is not a constant"],
         ["CASE c1 OF \"A\", 1: b1 := TRUE END",
          "label must be 'CHAR' (the same as case expression), got 'INTEGER'"],
         ["CASE c1 OF \"A\"..1: b1 := TRUE END",
          "label must be 'CHAR' (the same as case expression), got 'INTEGER'"],
         ["CASE c1 OF cs: b1 := TRUE END", "single-character string expected"],
         ["CASE ci OF cb: b1 := TRUE END", "label must be 'INTEGER' (the same as case expression), got 'BOOLEAN'"],
         ["CASE ci OF TRUE: b1 := TRUE END", "not parsed"]
         )
    ),
"CASE statement with type guard": testWithContext(
    context(grammar.statement,
              "CONST c = 0;"
            + "TYPE Base = RECORD END;" 
            + "Derived = RECORD (Base) i: INTEGER END; PDerived = POINTER TO Derived;"
            + "Derived2 = RECORD (Base) i2: INTEGER END; PDerived2 = POINTER TO Derived2;"
            + "    T2 = RECORD i: INTEGER; b: Base END; PT2 = POINTER TO T2;"
            + "VAR b: Base; pb: POINTER TO Base; t2: T2;"),
    pass("CASE pb OF END",
         "CASE pb OF PDerived: pb.i := 0 END",
         "CASE pb OF PDerived: pb.i := 0 | PDerived2: pb.i2 := 0 END"
         ),
    fail(["CASE b OF END", "only records passed as VAR argument can be used to test type in CASE"],
         ["CASE t2.b OF END", "only records passed as VAR argument can be used to test type in CASE"],
         ["CASE pb OF Derived END", "invalid type test: POINTER type expected as an argument of POINTER type test, got 'Derived'"],
         ["CASE pb OF 123 END", "type's name expected in label, got expression: 123"],
         ["CASE pb OF \"a\" END", "type's name expected in label, got expression: \"a\""],
         ["CASE pb OF c END", "'c' is not a type"],
         ["CASE pb OF PT2: pb.i := 0 END", "invalid type test: 'T2' is not an extension of 'Base'"],
         ["CASE pb OF PDerived..PDerived2: END", "cannot use diapason (..) with type guard"],
         ["CASE pb OF PDerived..1: END", "type's name expected in label, got expression: 1"],
         ["CASE c OF 0..PDerived: END", "'PDerived' is not a constant"]
         )
    ),
"CASE statement with type guard - pass as VAR argument": testWithContext(
    context(grammar.declarationSequence,
              "TYPE Base = RECORD END;" 
            + "Derived = RECORD (Base) END; PDerived = POINTER TO Derived;"
            + "PROCEDURE passDerived(d: Derived); END passDerived;"
            + "PROCEDURE passDerivedVar(VAR d: Derived); END passDerivedVar;"
            ),
    pass("PROCEDURE p(VAR b: Base); BEGIN CASE b OF Derived: passDerived(b) END; END p;",
         "PROCEDURE p(VAR b: Base); BEGIN CASE b OF Derived: passDerivedVar(b) END; END p;"
         )
    ),
"CASE statement with type guard for VAR argument": testWithContext(
    context(grammar.declarationSequence,
              "TYPE Base = RECORD END; Derived = RECORD (Base) i: INTEGER END; PBase = POINTER TO Base; PDerived = POINTER TO Derived;"),
    pass("PROCEDURE p(VAR b: Base); BEGIN CASE b OF END END p;",
         "PROCEDURE p(VAR b: Base); BEGIN CASE b OF Derived: END END p;",
         "PROCEDURE p(VAR b: PBase); BEGIN CASE b OF PDerived: END END p;",
         "PROCEDURE p(VAR b: Base); BEGIN CASE b OF Derived: b.i := 0 END END p;"
        ),
    fail(["PROCEDURE p(b: Base); BEGIN CASE b OF END END p;", "only records passed as VAR argument can be used to test type in CASE"],
         ["PROCEDURE p(VAR b: PBase); BEGIN CASE b OF PDerived: b.i := 0 END END p;", "type 'Base' has no 'i' field"])
    ),
"CASE statement with type guard scope": testWithContext(
    context(grammar.declarationSequence,
            "TYPE Base = RECORD END; Derived = RECORD (Base) i: INTEGER END; Derived2 = RECORD (Base) i2: INTEGER END;"),
    pass(),
    fail(["PROCEDURE p(VAR b: Base); BEGIN CASE b OF Derived: END; b.i := 0; END p;", "type 'Base' has no 'i' field"],
         ["PROCEDURE p(VAR b: Base); BEGIN CASE b OF Derived: | Derived2: b.i := 0 END; END p;", "type 'Derived2' has no 'i' field"])
    ),
"CASE statement with type guard and non-variable expression": testWithContext(
    context(grammar.statement,
              "TYPE Base = RECORD pb: POINTER TO Base END; Derived = RECORD (Base) i: INTEGER END; PDerived = POINTER TO Derived;"
            + "    T2 = RECORD i: INTEGER END;"
            + "VAR b: Base; pb: POINTER TO Base;"),
    pass("CASE pb^ OF END",
         "CASE pb^ OF Derived: ASSERT(TRUE) END",
         "CASE b.pb OF END",
         "CASE b.pb OF PDerived: ASSERT(TRUE) END",
         "CASE b.pb^ OF END",
         "CASE b.pb^ OF Derived: ASSERT(TRUE) END"
        ),
    fail(["CASE pb^ OF Derived: pb.i := 0 END", "type 'Base' has no 'i' field"]
         )
    ),
"CASE statement with type guard for imported type": testWithModule(
    "MODULE test; TYPE Base* = RECORD END; Derived* = RECORD(Base) END; Derived2 = RECORD(Base) END; END test.",
    pass("MODULE m; IMPORT test; PROCEDURE p(VAR b: test.Base); BEGIN CASE b OF test.Derived: END; END p; END m."),
    fail(["MODULE m; IMPORT test; PROCEDURE p(VAR b: test.Base); BEGIN CASE b OF test.Derived2: END; END p; END m.",
          "identifier 'Derived2' is not exported by module 'test'"]
        )),
"CASE statement with imported constant": testWithModule(
    "MODULE test; CONST i* = 0; END test.",
    pass("MODULE m; IMPORT test; PROCEDURE p(j: INTEGER); BEGIN CASE j OF test.i: END; END p; END m."),
    fail(["MODULE m; IMPORT test; PROCEDURE p(j: INTEGER); BEGIN CASE j OF test.unknown: END; END p; END m.",
          "identifier 'unknown' is not exported by module 'test'"]
        )),
"WHILE statement": testWithContext(
    context(grammar.statement,
            "VAR b1: BOOLEAN; i1: INTEGER;"),
    pass("WHILE TRUE DO i1 := 0 END",
         "WHILE b1 DO i1 := 0 ELSIF FALSE DO i1 := 1 END"),
    fail(["WHILE i1 DO i1 := 0 END", "'BOOLEAN' expression expected, got 'INTEGER'"],
         ["WHILE b1 DO i1 := 0 ELSIF i1 DO i1 := 1 END", "'BOOLEAN' expression expected, got 'INTEGER'"])
    ),
"REPEAT statement": testWithContext(
    context(grammar.statement,
            "VAR b1: BOOLEAN; i1: INTEGER;"),
    pass("REPEAT i1 := 0 UNTIL TRUE",
         "REPEAT i1 := 0 UNTIL b1"),
    fail(["REPEAT i1 := 0 UNTIL i1", "'BOOLEAN' expression expected, got 'INTEGER'"])
    ),
"FOR statement": testWithContext(
    context(grammar.statement,
              "CONST c = 15; zero = 1 - 1;"
            + "VAR b: BOOLEAN; i, n: INTEGER; ch: CHAR; p: POINTER TO RECORD END;"),
    pass("FOR i := 0 TO 10 DO n := 1 END",
         "FOR i := 0 TO 10 BY 5 DO b := TRUE END",
         "FOR i := 0 TO n DO b := TRUE END",
         "FOR i := 0 TO n BY c DO n := 1; b := FALSE END",
         "FOR i := 0 TO 10 BY 0 DO b := TRUE END",
         "FOR i := 0 TO 10 BY zero DO b := TRUE END"
         ),
    fail(["FOR undefined := 0 TO 10 DO n := 1 END",
          "undeclared identifier: 'undefined'"],
         ["FOR b := TRUE TO 10 DO n := 1 END",
          "'b' is a 'BOOLEAN' variable, 'FOR' control variable must be 'INTEGER'"],
         ["FOR ch := 'a' TO 10 DO n := 1 END",
          "'ch' is a 'CHAR' variable, 'FOR' control variable must be 'INTEGER'"],
         ["FOR c := 0 TO 10 DO END", "'c' is not a variable"],
         ["FOR i := TRUE TO 10 DO n := 1 END",
          "'INTEGER' expression expected to assign 'i', got 'BOOLEAN'"],
         ["FOR i := p TO 10 DO n := 1 END",
          "'INTEGER' expression expected to assign 'i', got 'POINTER TO anonymous RECORD'"],
         ["FOR i := 0 TO p DO n := 1 END",
          "'INTEGER' expression expected as 'TO' parameter, got 'POINTER TO anonymous RECORD'"],
         ["FOR i := 0 TO TRUE DO END",
          "'INTEGER' expression expected as 'TO' parameter, got 'BOOLEAN'"],
         ["FOR i := 0 TO 10 BY n DO END",
          "constant expression expected as 'BY' parameter"],
         ["FOR i := 0 TO 10 BY p DO END",
          "'INTEGER' expression expected as 'BY' parameter, got 'POINTER TO anonymous RECORD'"],
         ["FOR i := 0 TO 10 BY TRUE DO END",
          "'INTEGER' expression expected as 'BY' parameter, got 'BOOLEAN'"],
         ["FOR i := 0 TO 10 DO - END", "END expected (FOR)"]
         )
    ),
"logical operators": testWithContext(
    context(grammar.statement, "VAR b1, b2: BOOLEAN; i1: INTEGER; p: POINTER TO RECORD END;"),
    pass("b1 := b1 OR b2",
         "b1 := b1 & b2",
         "b1 := ~b2"),
    fail(["b1 := i1 OR b2", "BOOLEAN expected as operand of 'OR', got 'INTEGER'"],
         ["b1 := b1 OR i1", "type mismatch: expected 'BOOLEAN', got 'INTEGER'"],
         ["b1 := p OR b1", "BOOLEAN expected as operand of 'OR', got 'POINTER TO anonymous RECORD'"],
         ["b1 := i1 & b2", "BOOLEAN expected as operand of '&', got 'INTEGER'"],
         ["b1 := b1 & i1", "type mismatch: expected 'BOOLEAN', got 'INTEGER'"],
         ["b1 := ~i1", "type mismatch: expected 'BOOLEAN', got 'INTEGER'"])
    ),
"arithmetic operators": testWithContext(
    context(grammar.statement,
            "VAR b1: BOOLEAN; i1, i2: INTEGER; r1, r2: REAL; c1: CHAR; s1: SET;"
            + "p1: PROCEDURE; ptr1: POINTER TO RECORD END;"),
    pass("i1 := i1 + i2",
         "i1 := i1 - i2",
         "i1 := i1 * i2",
         "i1 := i1 DIV i2",
         "i1 := i1 MOD i2",
         "r1 := r1 + r2",
         "r1 := r1 - r2",
         "r1 := r1 * r2",
         "r1 := r1 / r2"),
    fail(["i1 := i1 / i2", "operator DIV expected for integer division"],
         ["r1 := r1 DIV r1", "operator 'DIV' type mismatch: 'INTEGER' or 'BYTE' expected, got 'REAL'"],
         ["c1 := c1 - c1", "operator '-' type mismatch: numeric type or SET expected, got 'CHAR'"],
         ["p1 := p1 * p1", "operator '*' type mismatch: numeric type or SET expected, got 'PROCEDURE'"],
         ["ptr1 := ptr1 / ptr1", "operator '/' type mismatch: numeric type or SET expected, got 'POINTER TO anonymous RECORD'"],
         ["s1 := +s1", "operator '+' type mismatch: numeric type expected, got 'SET'"],
         ["b1 := -b1", "operator '-' type mismatch: numeric type or SET expected, got 'BOOLEAN'"],
         ["s1 := +b1", "operator '+' type mismatch: numeric type expected, got 'BOOLEAN'"])
    ),
"relations are BOOLEAN": testWithContext(
    context(grammar.statement,
            "TYPE Base = RECORD END; Derived = RECORD (Base) END;"
            + "VAR pBase: POINTER TO Base; proc1, proc2: PROCEDURE;"
                + "set1, set2: SET;"
                + "b: BOOLEAN; i1, i2: INTEGER; r1, r2: REAL; c1, c2: CHAR; ca1, ca2: ARRAY 10 OF CHAR;"),
    pass("b := pBase^ IS Derived",
         "b := pBase = pBase",
         "b := proc1 # proc2",
         "b := set1 <= set2",
         "b := i1 IN set2",
         "b := i1 < i2",
         "IF i1 > i2 THEN END",
         "b := c1 > c2",
         "b := ca1 <= ca2",
         "b := r1 >= r2")
    ),
"SET relations": testWithContext(
    context(grammar.expression,
            "CONST constSet1 = {}; constSet2 = {};"
            + "VAR set1, set2: SET; b: BOOLEAN; i: INTEGER;"),
    pass("set1 <= set2",
         "set1 >= set2",
         "set1 = set2",
         "set1 # set2",
         "constSet1 = constSet2",
         "constSet1 # constSet2",
         "i IN set1"),
    fail(["set1 <= i", "type mismatch: expected 'SET', got 'INTEGER'"],
         ["b IN set1", "'INTEGER' or 'BYTE' expected as an element of SET, got 'BOOLEAN'"],
         ["i IN b", "type mismatch: expected 'SET', got 'BOOLEAN'"],
         ["set1 < set2", "operator '<' type mismatch: numeric type or CHAR or character array expected, got 'SET'"],
         ["set1 > set2", "operator '>' type mismatch: numeric type or CHAR or character array expected, got 'SET'"]
         )
    ),
"SET operators": testWithContext(
    context(grammar.expression,
            "VAR set1, set2: SET; b: BOOLEAN; i: INTEGER;"),
    pass("set1 + set2",
         "set1 - set2",
         "set1 * set2",
         "set1 / set2",
         "-set1"),
    fail(["set1 + i", "type mismatch: expected 'SET', got 'INTEGER'"],
         ["set1 - b", "type mismatch: expected 'SET', got 'BOOLEAN'"],
         ["set1 * b", "type mismatch: expected 'SET', got 'BOOLEAN'"],
         ["set1 / b", "type mismatch: expected 'SET', got 'BOOLEAN'"])
    ),
"SET functions": testWithContext(
    context(grammar.statement,
            "VAR set1, set2: SET; b: BOOLEAN; i: INTEGER;"),
    pass("INCL(set1, 0)",
         "EXCL(set1, 3)",
         "INCL(set1, i)",
         "EXCL(set1, i)"),
    fail(["INCL({}, i)", "expression cannot be used as VAR parameter"],
         ["INCL(set1, 32)", "value (0..31) expected as a second argument of INCL, got 32"],
         ["EXCL(set1, -1)", "value (0..31) expected as a second argument of EXCL, got -1"]
        )
    ),
"PROCEDURE relations": testWithContext(
    context(grammar.expression,
            "VAR p1: PROCEDURE; p2: PROCEDURE;"),
    pass("p1 = p2",
         "p1 # p2",
         "p1 = NIL",
         "NIL # p1"
         )
    ),
"VAR parameter": testWithContext(
    context(grammar.statement,
            "CONST c = 123;"
            + "TYPE Base = RECORD END; Derived = RECORD (Base) END; PBase = POINTER TO Base; PDerived = POINTER TO Derived;"
            + "VAR i1: INTEGER; b1: BOOLEAN; a1: ARRAY 5 OF INTEGER;"
                + "r1: RECORD f1: INTEGER END;"
                + "pBase: PBase; pDerived: PDerived;"
            + "PROCEDURE p1(VAR i: INTEGER); END p1;"
            + "PROCEDURE p2(VAR b: BOOLEAN); END p2;"
            + "PROCEDURE procBasePointer(VAR p: PBase); END procBasePointer;"
            + "PROCEDURE int(): INTEGER; RETURN 0 END int;"
            ),
    pass("p1(i1)",
         "p1(a1[0])",
         "p1(r1.f1)"),
    fail(["p1(c)", "constant cannot be passed as VAR actual parameter"],
         ["p1(123)", "expression cannot be used as VAR parameter"],
         ["p2(TRUE)", "expression cannot be used as VAR parameter"],
         ["procBasePointer(NIL)", "expression cannot be used as VAR parameter"],
         ["p1(i1 + i1)", "expression cannot be used as VAR parameter"],
         ["p1(i1 * i1)", "expression cannot be used as VAR parameter"],
         ["p1(+i1)", "expression cannot be used as VAR parameter"],
         ["p1(-i1)", "expression cannot be used as VAR parameter"],
         ["p2(~b1)", "expression cannot be used as VAR parameter"],
         ["p1(int())", "expression cannot be used as VAR parameter"],
         ["procBasePointer(pDerived)", 
          "type mismatch for argument 1: cannot pass 'PDerived' as VAR parameter of type 'PBase'"]
         )
    ),
"procedure call": testWithContext(
    context(grammar.statement,
            "TYPE ProcType = PROCEDURE;" +
            "VAR notProcedure: INTEGER; ptr: POINTER TO RECORD END;" +
            "PROCEDURE p; END p;" +
            "PROCEDURE p1(i: INTEGER); END p1;" +
            "PROCEDURE p2(i: INTEGER; b: BOOLEAN); END p2;" +
            "PROCEDURE p3(): ProcType; RETURN p END p3;"),
    pass("p",
         "p()",
         "p1(1)",
         "p1(1 + 2)",
         "p2(1, TRUE)"),
    fail(["notProcedure", "PROCEDURE expected, got 'INTEGER'"],
         ["ptr()", "PROCEDURE expected, got 'POINTER TO anonymous RECORD'"],
         ["p2(TRUE, 1)", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"],
         ["p2(1, 1)", "type mismatch for argument 2: 'INTEGER' cannot be converted to 'BOOLEAN'"],
         ["p3", "procedure returning a result cannot be used as a statement"],
         ["p3()", "procedure returning a result cannot be used as a statement"],
         ["IF p() THEN END", "procedure returning no result cannot be used in an expression"],
         ["IF ~p() THEN END", "type mismatch: expected 'BOOLEAN', got no type (proper procedure call)"]
         )
),
"procedure assignment": testWithContext(
    context(grammar.statement,
            "TYPE ProcType1 = PROCEDURE(): ProcType1;"
              + "ProcType2 = PROCEDURE(): ProcType2;"
              + "ProcType3 = PROCEDURE(p: ProcType3): ProcType3;"
              + "ProcType4 = PROCEDURE(p: ProcType4): ProcType4;"
              + "ProcType4VAR = PROCEDURE(VAR p: ProcType4VAR): ProcType4VAR;"
              + "ProcType5 = PROCEDURE(p: ProcType3): ProcType4;"
              + "ProcType6 = PROCEDURE(p: INTEGER);"
              + "ProcType7 = PROCEDURE(VAR p: INTEGER);"
            + "VAR v1: ProcType1; v2: ProcType2;"
                + "v3: PROCEDURE(i: INTEGER): ProcType1; v4: PROCEDURE(b: BOOLEAN): ProcType1;"
                + "v5: PROCEDURE(p: ProcType1); v6: PROCEDURE(p: ProcType2);"
                + "v7: ProcType3; v8: ProcType4; v8VAR: ProcType4VAR; v9: ProcType5; v10: ProcType6; v11: ProcType7;"
                + "vProcCharArray: PROCEDURE (a: ARRAY OF CHAR);"
                + "vProcInt: PROCEDURE (i: INTEGER);"
                + "vProcReturnInt: PROCEDURE(): INTEGER;"
            + "PROCEDURE p1(): ProcType1; RETURN p1 END p1;"
            + "PROCEDURE procCharArray(a: ARRAY OF CHAR); END procCharArray;"
            + "PROCEDURE procIntArray(a: ARRAY OF INTEGER); END procIntArray;"
            + "PROCEDURE procByte(b: BYTE); END procByte;"
            + "PROCEDURE procReturnByte(): BYTE; RETURN 0 END procReturnByte;"
            ),
    pass("v1 := v2",
         "v5 := v6",
         "v7 := v8",
         "v7 := v9",
         "v8 := v9",
         "v1 := p1",
         "vProcCharArray := procCharArray"),
    fail(["p1 := v1", "cannot assign to procedure 'p1'"],
         ["v3 := v1",
          "type mismatch: 'PROCEDURE(INTEGER): ProcType1' cannot be assigned to 'ProcType1' expression"],
         ["v3 := v4",
          "type mismatch: 'PROCEDURE(INTEGER): ProcType1' cannot be assigned to 'PROCEDURE(BOOLEAN): ProcType1' expression"],
         ["v10 := NEW",
          "standard procedure NEW cannot be referenced"],
         ["v10 := v11", "type mismatch: 'ProcType6' cannot be assigned to 'ProcType7' expression" ],
         ["v8 := v8VAR", "type mismatch: 'ProcType4' cannot be assigned to 'ProcType4VAR' expression" ],
         ["vProcCharArray := procIntArray",
          "type mismatch: 'PROCEDURE(ARRAY OF CHAR)' cannot be assigned to 'PROCEDURE(ARRAY OF INTEGER)' expression"],
         ["vProcInt := procByte",
          "type mismatch: 'PROCEDURE(INTEGER)' cannot be assigned to 'PROCEDURE(BYTE)' expression"],
         ["vProcReturnInt := procReturnByte",
          "type mismatch: 'PROCEDURE(): INTEGER' cannot be assigned to 'PROCEDURE(): BYTE' expression"]
         )
    ),
"string assignment": testWithContext(
    context(grammar.statement,
            "VAR a1: ARRAY 3 OF CHAR;"
            + "ch1: CHAR;"
            + "intArray: ARRAY 10 OF INTEGER;"
            ),
    pass("a1 := \"abc\"",
         "a1 := \"ab\"",
         "a1 := \"a\"",
         "a1 := 22X",
         "ch1 := \"A\"",
         "ch1 := 22X"),
    fail(["a1 := \"abcd\"", "3-character ARRAY is too small for 4-character string"],
         ["intArray := \"abcd\"",
          "type mismatch: 'ARRAY 10 OF INTEGER' cannot be assigned to 'multi-character string' expression"])
    ),
"string relations": testWithContext(
    context(grammar.expression,
            "VAR ch: CHAR;"),
    pass("ch = \"a\"",
         "\"a\" = ch",
         "ch # \"a\"",
         "\"a\" # ch"
        ),
    fail(["ch = \"ab\"", "type mismatch: expected 'CHAR', got 'multi-character string'"])
    ),
"array assignment": testWithContext(
    context(grammar.statement,
            "VAR charArray: ARRAY 3 OF CHAR;"
            + "intArray: ARRAY 10 OF INTEGER;"
            + "intArray2: ARRAY 10 OF INTEGER;"
            + "intArray3: ARRAY 5 OF INTEGER;"
            + "intArray23m1: ARRAY 2 OF ARRAY 3 OF INTEGER;"
            + "intArray23m2: ARRAY 2, 3 OF INTEGER;"
            + "intArray24m: ARRAY 2, 4 OF INTEGER;"
            + "intArray43m: ARRAY 4, 3 OF INTEGER;"
            ),
    pass("intArray := intArray2",
         "intArray23m1 := intArray23m2",
         "intArray23m2 := intArray23m1",
         "intArray43m[0] := intArray23m1[0]"
         ),
    fail(["intArray := charArray",
         "type mismatch: 'ARRAY 10 OF INTEGER' cannot be assigned to 'ARRAY 3 OF CHAR' expression"],
         ["intArray2 := intArray3",
          "type mismatch: 'ARRAY 10 OF INTEGER' cannot be assigned to 'ARRAY 5 OF INTEGER' expression"],
         ["intArray3 := charArray",
          "type mismatch: 'ARRAY 5 OF INTEGER' cannot be assigned to 'ARRAY 3 OF CHAR' expression"],
         ["intArray24m := intArray23m1",
          "type mismatch: 'ARRAY 2, 4 OF INTEGER' cannot be assigned to 'ARRAY 2, 3 OF INTEGER' expression"]
          )
    ),
"record assignment": testWithContext(
    context(grammar.statement,
            "TYPE Base1 = RECORD END;"
                + "T1 = RECORD (Base1) END;"
                + "T2 = RECORD END;"
            + "VAR b1: Base1; r1: T1; r2: T2; pb1: POINTER TO Base1;"
            ),
    pass("r1 := r1",
         "b1 := r1",
         "pb1^ := b1",
         "pb1^ := r1",
         "pb1^ := pb1^"
         ),
    fail(["r1 := r2", "type mismatch: 'T1' cannot be assigned to 'T2' expression"],
         ["r1 := b1", "type mismatch: 'T1' cannot be assigned to 'Base1' expression"])
    ),
"string argument": testWithContext(
    context(grammar.statement,
            "PROCEDURE p1(s: ARRAY OF CHAR); END p1;"
            + "PROCEDURE p2(VAR s: ARRAY OF CHAR); END p2;"
            + "PROCEDURE p3(i: INTEGER); END p3;"
            + "PROCEDURE p4(a: ARRAY OF INTEGER); END p4;"
            ),
    pass("p1(\"abc\")"),
    fail(["p2(\"abc\")", "expression cannot be used as VAR parameter"],
         ["p3(\"abc\")", "type mismatch for argument 1: 'multi-character string' cannot be converted to 'INTEGER'"],
         ["p4(\"abc\")", "type mismatch for argument 1: 'multi-character string' cannot be converted to 'ARRAY OF INTEGER'"])
    ),
"assert": testWithGrammar(
    grammar.statement,
    pass("ASSERT(TRUE)"),
    fail(["ASSERT()", "1 argument(s) expected, got 0"],
         ["ASSERT(TRUE, 123)", "1 argument(s) expected, got 2"],
         ["ASSERT(123)", "type mismatch for argument 1: 'INTEGER' cannot be converted to 'BOOLEAN'"])
    ),
"import module with reserved name": testWithContext(
    { grammar: grammar.module,
      source: "",
      moduleReader: function(name){
        TestUnitCommon.expectEq(name, "Math"); 
        return "MODULE " + name + "; END " + name + "."; 
        }
    },
    pass("MODULE m; IMPORT Math; END m."),
    fail()
    ),
"imported module without exports": testWithModule(
    "MODULE test; END test.",
    pass("MODULE m; IMPORT test; END m."),
    fail(["MODULE m; IMPORT test; BEGIN test.p(); END m.",
          "identifier 'p' is not exported by module 'test'"],
         ["MODULE m; IMPORT t := test; BEGIN t.p(); END m.",
          "identifier 'p' is not exported by module 'test'"],
         ["MODULE m; IMPORT test; BEGIN test(); END m.",
          "PROCEDURE expected, got 'MODULE'"]
        )),
"import record type": testWithModule(
    "MODULE test; TYPE T* = RECORD f*: INTEGER; notExported: BOOLEAN END; END test.",
    pass("MODULE m; IMPORT test; VAR r: test.T; BEGIN r.f := 0; END m."),
    fail(["MODULE m; IMPORT test; VAR r: test.T; BEGIN r.notExported := FALSE; END m.",
          "type 'T' has no 'notExported' field"]
        )),
"imported variables are read-only": testWithModule(
    "MODULE test; VAR i*: INTEGER; END test.",
    pass("MODULE m; IMPORT test; PROCEDURE p(i: INTEGER); END p; BEGIN p(test.i); END m."),
    fail(["MODULE m; IMPORT test; BEGIN test.i := 123; END m.",
          "cannot assign to imported variable"],
         ["MODULE m; IMPORT test; PROCEDURE p(VAR i: INTEGER); END p; BEGIN p(test.i); END m.",
          "imported variable cannot be passed as VAR actual parameter"]
        )
    ),
"import pointer type": testWithModule(
    "MODULE test;"
    + "TYPE TPAnonymous1* = POINTER TO RECORD END; TPAnonymous2* = POINTER TO RECORD END;"
        + "Base* = RECORD END; TPDerived* = POINTER TO RECORD(Base) END;"
    + "END test.",
    pass("MODULE m; IMPORT test; VAR p1: test.TPAnonymous1; p2: test.TPAnonymous2; END m.",
         "MODULE m; IMPORT test;"
            + "VAR pb: POINTER TO test.Base; pd: test.TPDerived;"
            + "BEGIN pb := pd; END m."),
    fail(["MODULE m; IMPORT test; VAR p1: test.TPAnonymous1; p2: test.TPAnonymous2; BEGIN p1 := p2; END m.",
          "type mismatch: 'TPAnonymous1' cannot be assigned to 'TPAnonymous2' expression"]
         )
    ),
"import array type": testWithModule(
    "MODULE test; TYPE TA* = ARRAY 3 OF INTEGER; END test.",
    pass("MODULE m; IMPORT test; VAR a: test.TA; END m.")
    ),
"import procedure type": testWithModule(
    "MODULE test; TYPE TProc* = PROCEDURE; END test.",
    pass("MODULE m; IMPORT test; VAR proc: test.TProc; END m.")
    ),
"imported pointer type cannot be used in NEW if base type is not exported": testWithModule(
    "MODULE test;"
    + "TYPE T = RECORD END; TP* = POINTER TO T;"
    + "TPAnonymous* = POINTER TO RECORD END; END test.",
    pass(),
    fail(["MODULE m; IMPORT test; VAR p: test.TPAnonymous; BEGIN NEW(p) END m.",
          "non-exported RECORD type cannot be used in NEW"],
         ["MODULE m; IMPORT test; VAR p: test.TP; BEGIN NEW(p) END m.",
          "non-exported RECORD type cannot be used in NEW"])
    ),
"imported pointer type cannot be dereferenced if base type is not exported (even if base of base type is exported)": testWithModule(
    "MODULE test;"
    + "TYPE B* = RECORD i: INTEGER END; T = RECORD(B) END; TP* = POINTER TO T;"
    + "TPAnonymous* = POINTER TO RECORD(B) END;"
    + "PROCEDURE makeTP*(): TP; VAR result: TP; BEGIN NEW(result); RETURN result END makeTP;"
    + "PROCEDURE makeTPA*(): TPAnonymous; VAR result: TPAnonymous; BEGIN NEW(result); RETURN result END makeTPA;"
    + "END test.",
    pass(),
    fail(["MODULE m; IMPORT test; VAR p: test.TPAnonymous; BEGIN p := test.makeTPA(); p.i := 123; END m.",
          "POINTER TO non-exported RECORD type cannot be dereferenced"],
         ["MODULE m; IMPORT test; VAR p: test.TP; BEGIN p := test.makeTP(); p.i := 123; END m.",
          "POINTER TO non-exported RECORD type cannot be dereferenced"])
    ),
"imported pointer type can be used as a base of derived type even if pointer's record type is not exported": testWithModule(
    "MODULE test;"
    + "TYPE B = RECORD END; PB* = POINTER TO B; T* = RECORD(B) END;"
    + "END test.",
    pass("MODULE m; IMPORT test; VAR pb: test.PB; p: POINTER TO test.T; BEGIN pb := p; END m."),
    fail()
    ),
"imported pointer variable: anonymous record field cannot be used": testWithModule(
    "MODULE test; VAR p*: POINTER TO RECORD i: INTEGER END; END test.",
    pass(),
    fail(["MODULE m; IMPORT test; BEGIN ASSERT(test.p.i = 0) END m.",
          "POINTER TO non-exported RECORD type cannot be dereferenced"])
    ),
"procedure VAR section": testWithGrammar(
    grammar.declarationSequence,
    pass("VAR",
         "VAR i: INTEGER;",
         "VAR i, j: INTEGER;",
         "VAR i, j: INTEGER; b: BOOLEAN;")
    ),
"const declaration": testWithContext(
    context(grammar.declarationSequence,
            "CONST ci = 1; VAR v1: INTEGER;"),
    pass("CONST i = 10;",
         "CONST i = 1 + 2;",
         "CONST i = ci + 2;",
         "CONST i = ci * 2;",
         "CONST i = ORD({0..5});",
         "CONST i = ORD({0..5} <= {0..8});",
         "CONST b = TRUE;",
         "CONST b = {0..5} <= {0..8};",
         "CONST c = \"a\";",
         "CONST s = \"abc\";",
         "CONST s0 = \"\";",
         "CONST set = {};",
         "CONST set = {1 + 2};",
         "CONST set = {0..32 - 1};",
         "CONST set = {ci};",
         "CONST i1 = 1; b1 = TRUE;",
         "CONST i1 = 1; i2 = i1 + 1;",
         "CONST i1 = 1; i2 = i1 + 1; i3 = i2 + 2;"),
    fail(["CONST i1 = v1;", "constant expression expected"],
         ["CONST i1 = v1 * 2;", "constant expression expected"],
         ["CONST i1 = v1 - 10;", "constant expression expected"],
         ["CONST i1 = 10 - v1;", "constant expression expected"],
         ["CONST s = {v1};", "constant expression expected"],
         ["CONST s = {1, v1};", "constant expression expected"],
         ["CONST s = {1..v1};", "constant expression expected"],
         ["CONST s = {10 - v1..15};", "constant expression expected"])
    ),
"POINTER forward declaration": testWithContext(
    context(grammar.module, ""),
    pass("MODULE m; TYPE T = POINTER TO NotDeclaredYet; NotDeclaredYet = RECORD END; END m.",
         "MODULE m; TYPE T1 = POINTER TO NotDeclaredYet; T2 = POINTER TO NotDeclaredYet; NotDeclaredYet = RECORD END; END m."
         ),
    fail(["MODULE m; TYPE T = POINTER TO NotDeclaredYet; END m.",
          "no declaration found for 'NotDeclaredYet'"],
         ["MODULE m; TYPE T1 = POINTER TO NotDeclaredYet1; T2 = POINTER TO NotDeclaredYet2; END m.",
          "no declaration found for 'NotDeclaredYet1', 'NotDeclaredYet2'"],
         ["MODULE m; TYPE T1 = POINTER TO Forward; Forward = PROCEDURE; END m.",
          "'Forward' must be of RECORD type because it was used before in the declation of POINTER"])
    ),
"typeguard for VAR argument": testWithContext(
    context(grammar.procedureDeclaration,
            "TYPE Base = RECORD END; Derived = RECORD (Base) i: INTEGER END;"
            + "T = RECORD END; TD = RECORD(T) b: Base END;"),
    pass("PROCEDURE proc(VAR p: Base); BEGIN p(Derived).i := 1; END proc"),
    fail(["PROCEDURE proc(p: Base); BEGIN p(Derived).i := 1; END proc",
          "invalid type cast: a value variable cannot be used"],
         ["PROCEDURE proc(p: TD); BEGIN p.b(Derived).i := 1; END proc",
          "invalid type cast: a value variable cannot be used"],
         ["PROCEDURE proc(VAR p: T); BEGIN p(TD).b(Derived).i := 1; END proc",
          "invalid type cast: a value variable cannot be used"])
    ),
"NEW for read only array element fails": testWithContext(
    context(grammar.procedureDeclaration,
            "TYPE P = POINTER TO RECORD END;"),
    pass(),
    fail(["PROCEDURE readOnlyPointers(a: ARRAY OF P); BEGIN NEW(a[0]) END readOnlyPointers",
          "read-only array's element cannot be passed as VAR actual parameter"])
    ),
"LEN": testWithGrammar(
    grammar.procedureDeclaration,
    pass("PROCEDURE p(a: ARRAY OF INTEGER): INTEGER; RETURN LEN(a) END p",
         "PROCEDURE p(VAR a: ARRAY OF BOOLEAN): INTEGER; RETURN LEN(a) END p",
         "PROCEDURE p(): INTEGER; RETURN LEN(\"abc\") END p"),
    fail(["PROCEDURE p(a: ARRAY OF INTEGER): INTEGER; RETURN LEN(a[0]) END p",
          "ARRAY or string is expected as an argument of LEN, got 'INTEGER'"])
    ),
"array expression": testWithGrammar(
    grammar.procedureBody,
    pass("VAR a: ARRAY 10 OF INTEGER; BEGIN a[0] := 1 END",
         "VAR a: ARRAY 10 OF INTEGER; BEGIN a[0] := 1; a[1] := a[0] END",
         "VAR a1, a2: ARRAY 3 OF CHAR; BEGIN ASSERT(a1 = a2); END",
         "VAR a1: ARRAY 2 OF CHAR; a2: ARRAY 3 OF CHAR; BEGIN ASSERT(a1 = a2); END",
         "CONST cs = \"a\"; VAR a: ARRAY 3 OF CHAR; BEGIN ASSERT(a = cs); ASSERT(cs # a); ASSERT(a < cs); ASSERT(cs > a); END",
         "CONST cs = \"a\"; BEGIN ASSERT(cs[0] = \"a\"); END"
         ),
    fail(["VAR a: ARRAY 10 OF INTEGER; BEGIN a[0] := TRUE END",
          "type mismatch: 'INTEGER' cannot be assigned to 'BOOLEAN' expression"],
         ["VAR a: ARRAY 10 OF INTEGER; BEGIN a[TRUE] := 1 END",
          "'INTEGER' or 'BYTE' expression expected, got 'BOOLEAN'"],
         ["VAR a: ARRAY 10 OF INTEGER; p: POINTER TO RECORD END; BEGIN a[p] := 1 END",
          "'INTEGER' or 'BYTE' expression expected, got 'POINTER TO anonymous RECORD'"],
         ["VAR i: INTEGER; BEGIN i[0] := 1 END",
          "ARRAY or string expected, got 'INTEGER'"],
         ["VAR p: POINTER TO RECORD END; BEGIN p[0] := 1 END",
          "ARRAY or string expected, got 'POINTER TO anonymous RECORD'"],
         ["VAR a: ARRAY 10 OF INTEGER; BEGIN a[0][0] := 1 END",
          "ARRAY or string expected, got 'INTEGER'"],
         ["VAR a: ARRAY 10 OF BOOLEAN; BEGIN a[0,0] := TRUE END",
          "ARRAY or string expected, got 'BOOLEAN'"],
         ["VAR a: ARRAY 10, 20 OF BOOLEAN; BEGIN a[0] := TRUE END",
          "type mismatch: 'ARRAY 20 OF BOOLEAN' cannot be assigned to 'BOOLEAN' expression"],
         ["VAR a: ARRAY 10 OF INTEGER; BEGIN a[10] := 0 END",
          "index out of bounds: maximum possible index is 9, got 10"],
         ["CONST c1 = 5; VAR a: ARRAY 10 OF INTEGER; BEGIN a[10 + c1] := 0 END",
          "index out of bounds: maximum possible index is 9, got 15"],
         ["VAR a1, a2: ARRAY 3 OF INTEGER; BEGIN ASSERT(a1 = a2); END",
          "operator '=' type mismatch: numeric type or SET or BOOLEAN or CHAR or character array or POINTER or PROCEDURE expected, got 'ARRAY 3 OF INTEGER'"],
         ["CONST cs = \"\"; BEGIN ASSERT(cs[0] = \"a\"); END",
          "cannot index empty string"],
         ["CONST cs = \"\"; VAR i: INTEGER; BEGIN ASSERT(cs[i] = \"a\"); END",
          "cannot index empty string"],
         ["CONST cs = \"a\"; BEGIN ASSERT(cs[1] = \"a\"); END",
          "index out of bounds: maximum possible index is 0, got 1"],
         ["CONST ci = -1; VAR a: ARRAY 10 OF INTEGER; BEGIN ASSERT(a[ci] = 0); END",
          "index is negative: -1"],
         ["CONST ci = -1; PROCEDURE p(a: ARRAY OF INTEGER); BEGIN ASSERT(a[ci] = 0); END p; END",
          "index is negative: -1"]
        )
    ),
"multi-dimensional array expression": testWithGrammar(
    grammar.procedureBody,
    pass("VAR a: ARRAY 10 OF ARRAY 5 OF INTEGER; BEGIN a[0][0] := 1 END",
         "VAR a: ARRAY 10, 5 OF BOOLEAN; BEGIN a[0][0] := TRUE END",
         "VAR a: ARRAY 10, 5 OF BOOLEAN; BEGIN a[0, 0] := TRUE END")
    ),
"selector": testWithContext(
    context(grammar.expression,
            "TYPE T = RECORD field: INTEGER END; VAR r: T; i: INTEGER;"),
    pass("r.field"),
    fail(["i.field",
          "selector '.field' cannot be applied to 'INTEGER'"],
         ["T.field", "selector '.field' cannot be applied to 'type T'"])
    ),
"procedure body": testWithGrammar(
    grammar.procedureBody,
    pass("END",
         "VAR END",
         "VAR i: INTEGER; END",
         "VAR a: ARRAY 10 OF INTEGER; END",
         "VAR i: INTEGER; BEGIN i := 1 END",
         "VAR b: BOOLEAN; BEGIN b := TRUE END",
         "VAR i, j: INTEGER; BEGIN i := 1; j := 2; i := 1 + i + j - 2 END",
         "TYPE T = RECORD field: INTEGER END; VAR v: T; BEGIN v.field := 1 END",
         "TYPE T1 = RECORD field: INTEGER END; T2 = RECORD field: T1 END; VAR v1: T1; v2: T2; BEGIN v1.field := v2.field.field END",
         "TYPE T1 = RECORD field1: INTEGER END; T2 = RECORD (T1) field2: INTEGER END; VAR v: T2; BEGIN v.field2 := v.field1 END"),
    fail(["VAR i: INTEGER;", "END expected (PROCEDURE)"],
         ["VAR i: INTEGER; i := 1; END", "END expected (PROCEDURE)"],
         ["VAR i: INTEGER; BEGIN j := 1 END", "undeclared identifier: 'j'"],
         ["VAR i: INTEGER; BEGIN i := j END", "undeclared identifier: 'j'"],
         ["TYPE T = RECORD field: INTEGER END; VAR v: T; BEGIN v := 1 END",
          "type mismatch: 'T' cannot be assigned to 'INTEGER' expression"],
         ["TYPE T = RECORD field: INTEGER END; VAR v: T; BEGIN v.unknown := 1 END",
          "type 'T' has no 'unknown' field"],
         ["TYPE T1 = RECORD field1: INTEGER END; T2 = RECORD (T1) field1: INTEGER END; END",
          "base record already has field: 'field1'"])
    ),
"procedure": testWithContext(
    context(grammar.procedureDeclaration,
            "TYPE ProcType = PROCEDURE(): ProcType;"),
    pass("PROCEDURE p; END p",
         "PROCEDURE p; VAR i: INTEGER; BEGIN i := i + 1 END p",
         "PROCEDURE p(a1, a2: INTEGER); END p",
         "PROCEDURE p; BEGIN p() END p",
         "PROCEDURE p(a: INTEGER); BEGIN p(a) END p",
         "PROCEDURE p(a: INTEGER; b: BOOLEAN); BEGIN p(a, b) END p",
         "PROCEDURE p(): ProcType; RETURN p END p"),
    fail(["PROCEDURE p1; END p2",
          "mismatched procedure names: 'p1' at the begining and 'p2' at the end"],
         ["PROCEDURE p(a: INTEGER); VAR a: INTEGER END p", "'a' already declared"],
         ["PROCEDURE p(a: INTEGER); BEGIN p() END p", "1 argument(s) expected, got 0"],
         ["PROCEDURE p(a: INTEGER); BEGIN p(1, 2) END p", "1 argument(s) expected, got 2"],
         ["PROCEDURE p(a: INTEGER; b: BOOLEAN); BEGIN p(b, a) END p",
          "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"],
         ["PROCEDURE p; BEGIN p1() END p", "undeclared identifier: 'p1'"],
         ["PROCEDURE p(a1: INTEGER; a1: BOOLEAN)", "'a1' already declared"],
         ["PROCEDURE p(p: INTEGER)", "argument 'p' has the same name as procedure"]         
         )
    ),
"procedure RETURN": testWithContext(
    context(
        grammar.procedureDeclaration,
            "TYPE A = ARRAY 3 OF INTEGER; R = RECORD END; PR = POINTER TO R;"
          + "VAR i: INTEGER; PROCEDURE int(): INTEGER; RETURN 1 END int;"),
    pass("PROCEDURE p(): BOOLEAN; RETURN TRUE END p",
         "PROCEDURE p(): BOOLEAN; RETURN int() = 1 END p",
         "PROCEDURE p; BEGIN END p" ,
         "PROCEDURE p(): INTEGER; BEGIN RETURN 0 END p"),
    fail(["PROCEDURE p; RETURN TRUE END p", "unexpected RETURN in PROCEDURE declared with no result type"],
         ["PROCEDURE p(): BOOLEAN; END p", "RETURN expected at the end of PROCEDURE declared with 'BOOLEAN' result type"],
         ["PROCEDURE p(): undeclared; END p", "undeclared identifier: 'undeclared'"],
         ["PROCEDURE p(): i; END p", "type name expected"],
         ["PROCEDURE p(): INTEGER; RETURN TRUE END p", "RETURN 'INTEGER' expected, got 'BOOLEAN'"],
         ["PROCEDURE p(a: A): A; RETURN a END p", "procedure cannot return ARRAY 3 OF INTEGER"],
         ["PROCEDURE p(): A; VAR a: A; RETURN a END p", "procedure cannot return ARRAY 3 OF INTEGER"],
         ["PROCEDURE p(r: R): R; RETURN r END p", "procedure cannot return R"],
         ["PROCEDURE p(): R; VAR r: R; RETURN r END p", "procedure cannot return R"],
         ["PROCEDURE p(pr: PR): R; RETURN pr END p", "procedure cannot return R"]
         )
    ),
"pass VAR argument as VAR parameter": testWithContext(
    context(grammar.procedureDeclaration,
            "PROCEDURE p1(VAR i: INTEGER); END p1;"
            + "PROCEDURE p2(VAR b: BOOLEAN); END p2;"),
    pass("PROCEDURE p(VAR i1: INTEGER); BEGIN p1(i1) END p"),
    fail(["PROCEDURE p(VAR b: BOOLEAN); BEGIN p2(~b) END p", "expression cannot be used as VAR parameter"])
    ),
"ARRAY parameter": testWithContext(
    context(grammar.procedureDeclaration,
            "TYPE T = RECORD i: INTEGER; p: POINTER TO T END;"
            + "PROCEDURE p1(i: INTEGER); END p1;"
            + "PROCEDURE varInteger(VAR i: INTEGER); END varInteger;"
            + "PROCEDURE p2(a: ARRAY OF INTEGER); END p2;"
            + "PROCEDURE p3(VAR a: ARRAY OF INTEGER); END p3;"
            ),
    pass("PROCEDURE p(a: ARRAY OF INTEGER); END p",
         "PROCEDURE p(a: ARRAY OF ARRAY OF INTEGER); END p",
         "PROCEDURE p(a: ARRAY OF ARRAY OF INTEGER); BEGIN p1(a[0][0]) END p",
         "PROCEDURE p(a: ARRAY OF INTEGER); BEGIN p2(a) END p",
         "PROCEDURE p(a: ARRAY OF T); BEGIN varInteger(a[0].p.i) END p"),
    fail(["PROCEDURE p(a: ARRAY OF INTEGER); BEGIN a[0] := 0 END p",
          "cannot assign to read-only array's element"],
         ["PROCEDURE p(a: ARRAY OF T); BEGIN a[0].i := 0 END p",
          "cannot assign to read-only record's field"],
         ["PROCEDURE p(a: ARRAY OF T); BEGIN varInteger(a[0].i) END p",
          "read-only record's field cannot be passed as VAR actual parameter"])
    ),
"RECORD parameter": testWithContext(
    context(grammar.procedureDeclaration,
            "TYPE T = RECORD i: INTEGER; p: POINTER TO T END;"
            + "PROCEDURE intValue(i: INTEGER); END intValue;"
            + "PROCEDURE intVar(VAR i: INTEGER); END intVar;"
            + "PROCEDURE recordValue(r: T); END recordValue;"
            + "PROCEDURE recordVar(VAR r: T); END recordVar;"
            ),
    pass("PROCEDURE p(VAR r: T); BEGIN r.i := 0; intVar(r.i); END p",
         "PROCEDURE p(VAR r: T); BEGIN recordValue(r); recordVar(r); END p",
         "PROCEDURE p(r: T); BEGIN intValue(r.i); recordValue(r); END p"
        ),
    fail(["PROCEDURE p(r: T); BEGIN r.i := 0 END p",
          "cannot assign to read-only record's field"],
         ["PROCEDURE p(r: T); BEGIN intVar(r.i); END p",
          "read-only record's field cannot be passed as VAR actual parameter"]
        )
    ),
"local procedure": testWithContext(
    context(grammar.procedureDeclaration,
            "TYPE ProcType = PROCEDURE;" +
            "VAR procVar: ProcType;" +
            "PROCEDURE procWithProcArg(p: ProcType); END procWithProcArg;"),
    pass("PROCEDURE p; PROCEDURE innerP; END innerP; END p",
         "PROCEDURE p; PROCEDURE innerP; END innerP; BEGIN innerP() END p"),
    fail(["PROCEDURE p; PROCEDURE innerP; END innerP; BEGIN procVar := innerP END p",
          "local procedure 'innerP' cannot be referenced"],
         ["PROCEDURE p; PROCEDURE innerP; END innerP; BEGIN procWithProcArg(innerP) END p",
          "local procedure 'innerP' cannot be referenced"],
         ["PROCEDURE p; PROCEDURE innerP; VAR innerV: INTEGER; END innerP; BEGIN innerV := 0 END p",
          "undeclared identifier: 'innerV'"])
    ),
"open array assignment fails": testWithGrammar(
    grammar.procedureDeclaration,
    pass(),
    fail(["PROCEDURE p(VAR s1, s2: ARRAY OF CHAR); BEGIN s1 := s2 END p",
          "open 'ARRAY OF CHAR' cannot be assigned"],
         ["PROCEDURE p(s1: ARRAY OF CHAR); VAR s2: ARRAY 10 OF CHAR; BEGIN s2 := s1 END p",
          "type mismatch: 'ARRAY 10 OF CHAR' cannot be assigned to 'ARRAY OF CHAR' expression"])
    ),
"open array type as procedure parameter": testWithContext(
    context(grammar.procedureDeclaration,
            "TYPE A = ARRAY 3 OF INTEGER;"
            ),
    pass("PROCEDURE p(a: ARRAY OF INTEGER); BEGIN END p",
         "PROCEDURE p(a: ARRAY OF ARRAY OF INTEGER); BEGIN END p",
         "PROCEDURE p(a: ARRAY OF A); BEGIN END p"
        ),
    fail(["PROCEDURE p(a: ARRAY OF ARRAY 3 OF INTEGER); BEGIN END p",
          "')' expected"]
        )
    ),
"non-open array type as procedure parameter": testWithContext(
    context(grammar.procedureDeclaration,
            "TYPE A = ARRAY 2 OF INTEGER;"
            + "VAR a: A;"
            + "PROCEDURE pa(a: A); BEGIN END pa;"
            ),
    pass("PROCEDURE p(a: A); BEGIN END p",
         "PROCEDURE p(); VAR a: A; BEGIN pa(a) END p",
         "PROCEDURE p(); VAR a: ARRAY 2 OF INTEGER; BEGIN pa(a) END p"
         ),
    fail(["PROCEDURE p(a: ARRAY 3 OF INTEGER); BEGIN END p",
          "')' expected"],
         ["PROCEDURE p(a: A): INTEGER; BEGIN RETURN a[2] END p",
          "index out of bounds: maximum possible index is 1, got 2"],
         ["PROCEDURE p(); VAR a: ARRAY 1 OF INTEGER; BEGIN pa(a) END p",
          "type mismatch for argument 1: 'ARRAY 1 OF INTEGER' cannot be converted to 'ARRAY 2 OF INTEGER'"],
         ["PROCEDURE p(a: ARRAY OF INTEGER); BEGIN pa(a) END p",
          "type mismatch for argument 1: 'ARRAY OF INTEGER' cannot be converted to 'ARRAY 2 OF INTEGER'"]
        )
    ),
"string assignment to open array fails": testWithGrammar(
    grammar.procedureDeclaration,
    pass(),
    fail(["PROCEDURE p(VAR s: ARRAY OF CHAR); BEGIN s := \"abc\" END p", "string cannot be assigned to open ARRAY OF CHAR"])
    ),
"scope": testWithGrammar(
    grammar.declarationSequence,
    pass("PROCEDURE p1(a1: INTEGER); END p1; PROCEDURE p2(a1: BOOLEAN); END p2;")
    ),
"module": testWithGrammar(
    grammar.module,
    pass("MODULE m; END m."),
    fail(["MODULE m; END undeclared.",
          "original module name 'm' expected, got 'undeclared'"],
         ["MODULE m; BEGIN - END m.", "END expected (MODULE)"])
    ),
"export": testWithGrammar(
    grammar.declarationSequence,
    pass("CONST i* = 1;",
         "TYPE T* = RECORD END;",
         "VAR i*: INTEGER;",
         "PROCEDURE p*; END p;"
         ),
    fail(["TYPE T = RECORD f*: INTEGER END;",
          "field 'f' can be exported only if record 'T' itself is exported too"],
         ["TYPE PT* = POINTER TO RECORD f*: INTEGER END;",
          "cannot export anonymous RECORD field: 'f'"],
         ["VAR p: POINTER TO RECORD f*: INTEGER END;",
          "cannot export anonymous RECORD field: 'f'"],
         ["VAR p*: POINTER TO RECORD r: RECORD f*: INTEGER END END;",
          "field 'f' can be exported only if field 'r' itself is exported too"],
         ["VAR i*: POINTER TO RECORD f*: INTEGER END;",
          "cannot export anonymous RECORD field: 'f'"],
         ["VAR i*: POINTER TO RECORD r*: RECORD f*: INTEGER END END;",
          "cannot export anonymous RECORD field: 'r'"],
         ["PROCEDURE p*; VAR i*: INTEGER; END p;",
          "cannot export from within procedure: variable 'i'"]
         //["TYPE PT = POINTER TO RECORD END; PROCEDURE p*(): PT; RETURN NIL END p;",
         //"exported PROCEDURE 'p' uses non-exported type 'PT'"]
         )
    ),
"import JS": testWithGrammar(
    grammar.module,
    pass("MODULE m; IMPORT JS; END m.",
         "MODULE m; IMPORT JS; BEGIN JS.alert(\"test\") END m.",
         "MODULE m; IMPORT JS; BEGIN JS.console.info(123) END m.",
         "MODULE m; IMPORT JS; BEGIN JS.do(\"throw new Error()\") END m."
         ),
    fail(["MODULE m; IMPORT JS; BEGIN JS.do(123) END m.",
          "string is expected as an argument of JS predefined procedure 'do', got INTEGER"],
         ["MODULE m; IMPORT JS; BEGIN JS.do(\"a\", \"b\") END m.",
          "1 argument(s) expected, got 2"],
         ["MODULE m; IMPORT JS; VAR s: ARRAY 10 OF CHAR; BEGIN JS.do(s) END m.",
          "string is expected as an argument of JS predefined procedure 'do', got ARRAY 10 OF CHAR"]
          )
    ),
"JS.var": testWithGrammar(
    grammar.module,
    pass("MODULE m; IMPORT JS; VAR v: JS.var; END m.",
         "MODULE m; IMPORT JS; VAR v: JS.var; BEGIN v := JS.f(); END m.",
         "MODULE m; IMPORT JS; VAR v: JS.var; BEGIN v := JS.f1(); JS.f2(v); END m."
         ),
    fail(["MODULE m; IMPORT JS; VAR v: JS.var; i: INTEGER; BEGIN i := v; END m.",
          "type mismatch: 'INTEGER' cannot be assigned to 'JS.var' expression"])
    ),
"import unknown module": testWithGrammar(
    grammar.module,
    pass(),
    fail(["MODULE m; IMPORT unknown; END m.", "module(s) not found: unknown"],
         ["MODULE m; IMPORT unknown1, unknown2; END m.", "module(s) not found: unknown1, unknown2"]
         )
    ),
"self import is failed": testWithGrammar(
    grammar.module,
    pass(),
    fail(["MODULE test; IMPORT test; END test.", "module 'test' cannot import itself"])
    ),
"import aliases": testWithGrammar(
    grammar.module,
    pass("MODULE m; IMPORT J := JS; END m.",
         "MODULE m; IMPORT J := JS; BEGIN J.alert(\"test\") END m."),
    fail(["MODULE m; IMPORT u1 := unknown1, unknown2; END m.", "module(s) not found: unknown1, unknown2"],
         ["MODULE m; IMPORT a1 := m1, a2 := m1; END m.", "module already imported: 'm1'"],
         ["MODULE m; IMPORT a1 := u1, a1 := u2; END m.", "duplicated alias: 'a1'"],
         ["MODULE m; IMPORT J := JS; BEGIN JS.alert(\"test\") END m.", "undeclared identifier: 'JS'"]
         )
    ),
"variables exported as read-only": testWithModule(
    "MODULE test; TYPE T* = RECORD i*: INTEGER END; VAR r*: T; p*: POINTER TO T; i*: INTEGER; END test.",
    pass("MODULE m; IMPORT test; BEGIN ASSERT(test.r.i = 0); END m.",
         "MODULE m; IMPORT test; BEGIN ASSERT(test.i = 0); END m.",
         "MODULE m; IMPORT test; BEGIN test.p.i := 0; END m."
        ),
    fail(["MODULE m; IMPORT test; BEGIN test.i := 0; END m.", "cannot assign to imported variable"],
         ["MODULE m; IMPORT test; BEGIN test.r.i := 0; END m.", "cannot assign to read-only record's field"]
        )),
"syntax errors": testWithGrammar(
    grammar.module,
    pass(),
    fail(["MODULE m; CONST c = 1 END m.",
          "';' expected"],
         ["MODULE m; TYPE T = RECORD END END m.",
          "';' expected"],
         ["MODULE m; VAR v: INTEGER END m.",
          "';' expected"],
         ["MODULE m; PROCEDURE p(INTEGER) END m.",
          "')' expected"])
    )
    };
}

function run(){
    return Test.run({
        "common": {
            "oberon": makeSuiteForGrammar(oberon),
            "eberon": makeSuiteForGrammar(eberon)
        },
        "eberon": TestUnitEberon.suite,
        "oberon": TestUnitOberon.suite
    });
}

exports.run = run;
})(imports["test_unit.js"]);
