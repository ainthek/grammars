(function() {
	// imports
	var asrt = gjax.asrt,
		EU = gjax.EscapeUtils,
	// hepers
		asrtString = function(str) {
			asrt(typeof str == "string" && str.length > 0); //empty, null, undefined not allowed
		};
	function ClassMatcher(classString) {
		asrt(classString.charAt(0) == '[' && classString.slice(-1) == ']');
		return new ClassMatcher.prototype.cnstr(classString);
	}
	ClassMatcher.negate = function(classString) {
		var c = classString, c2 = c.charAt(1);
		return c2 == '^' ? "[" + c.slice(2) : "[^" + c.slice(1); //TODO: faster variant ?
	};
	ClassMatcher.box = function(rawCharSet) {
		return "[" + rawCharSet + "]";
	};
	ClassMatcher.unbox = function(rawCharSet) {
		var c = classString, c2 = c.charAt(1);
		return c2 == '^' ? c.slice(2, -1) : c.slice(1, -1);
	};
	ClassMatcher.prototype = {
		cnstr: function(classString) {
			// TODO: potrebujem nejake specialne gim swithes pre urcite sady znakov ?
			// ak ano ake ?
			// TODO: regexp caching ?
			this.c = classString;
		},
		toString: function() {
			return ClassMatcher("[^\u0021-\u007E]").replaceIn(this.c, EU.chars2Ues);
		},
		allIn: function(str) {
			asrtString(str);
			return new RegExp("^" + this.c + "{1,}$").test(str);
		},
		allOut: function(str) {
			// TODO: negate regexp or negate result ?
			return !this.anyIn(str);
		},
		anyIn: function(str) {
			asrtString(str);
			return new RegExp(this.c).test(str);
		},
		anyOut: function(str) {
			return new RegExp(ClassMatcher.negate(this.c)).test(str);
		},
		replaceIn: function(str, replace) {
			asrtString(str);
			return str.replace(new RegExp(this.c, "g"), replace);
		},
		replaceOut: function(str, replace) {
			asrtString(str);
			return str.replace(new RegExp(ClassMatcher.negate(this.c), "g"), replace);
		}
	};
	ClassMatcher.prototype.cnstr.prototype = ClassMatcher.prototype;

	// exports
	gjax.EscapeUtils.ClassMatcher = ClassMatcher;
} ());