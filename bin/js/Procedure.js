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
