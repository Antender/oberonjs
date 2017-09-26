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
