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
