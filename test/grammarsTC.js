var grammarsTC = {
	"grammarsTC.all_whitespaces": function() {
		function getAllWhitespaces() {
			var G = EscapeUtils.Grammars,
                    j = G.Java.isWhitespace.toAlt(),
                    u = G.Unicode.White_Space.toAlt(),
                    x = G.Xml._WhiteSpace.toAlt(),
                    r = G.RegExp.whiteSpace_s.toAlt(),
                    all = j.concat(u).concat(x).concat(r);

			all = $A($C.unique(all));
			asrt(all.length == 30 && all.join("").length == 30, "Whitespaces SMP check failed"); //
			return all;
		};
		var whitespaces = getAllWhitespaces(),
                        charCodes = whitespaces.map(function(ch) {
                        	return toChar(ch);
                        });

		charCodes.sort(function(a, b) { return a - b });
		return "All whitespaces from all grammars"
                        + " length:" + charCodes.length
                        + ", data:" + charCodes.join(",");
	},
	"ClassMatcher.negate": function() {
		var ClassMatcher = gjax.EscapeUtils.ClassMatcher;
		asrt(ClassMatcher.negate("[a]") == "[^a]");
		asrt(ClassMatcher.negate("[^a]") == "[a]");
		return "OK";
	},
	"ClassMatcher.allIn": function() {
		var g = EscapeUtils.Grammars.rfc5234.ALPHA, m = g.matcher();
		asrt(m.allIn("abc"));
		asrt(!m.allIn("ab1"));
		asrt(!m.allIn("a\r\nbc"));
		return g.toRegExpString();
	},
	"ClassMatcher.anyIn": function() {
		var g = EscapeUtils.Grammars.rfc5234.ALPHA, m = g.matcher();
		asrt(m.anyIn("abc"));
		asrt(m.anyIn("a11"));
		asrt(!m.anyIn("111"));
		return g.toRegExpString();
	},
	"ClassMatcher.allOut": function() {
		var g = EscapeUtils.Grammars.rfc5234.ALPHA, m = g.matcher();
		asrt(!m.allOut("abc"));
		asrt(!m.allOut("ab1"));
		asrt(m.allOut("123"));
		return g.toRegExpString();
	},
	"ClassMatcher.anyOut": function() {
		var g = EscapeUtils.Grammars.rfc5234.ALPHA, m = g.matcher();
		asrt(!m.anyOut("abc"));
		asrt(m.anyOut("a11"));
		asrt(m.anyOut("111"));
		return g.toRegExpString();
	},
	"ClassMatcher.replaceIn": function() {
		var g = EscapeUtils.Grammars.rfc5234.ALPHA, m = g.matcher();
		asrt(m.replaceOut("abc", ".") == "abc");
		asrt(m.replaceOut("a1c", ".") == "a.c");
		asrt(m.replaceOut("a\r\nc", ".") == "a..c");
		return g.toRegExpString();
	},
	"ClassMatcher.replaceOut": function() {
		var g = EscapeUtils.Grammars.rfc5234.ALPHA, m = g.matcher();
		asrt(m.replaceOut("abc", ".") == "abc");
		asrt(m.replaceOut("a1c", ".") == "a.c");
		asrt(m.replaceOut("a\r\nc", ".") == "a..c");
		return g.toRegExpString();
	},
	"ClassMatcher.testSMPAndOthers": function() {
		function mooTools_escapeRegExp(s) {
			return s.replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
		};
		var ClassMatcher = gjax.EscapeUtils.ClassMatcher,
            s = gjax.$("smpServer").innerHTML,
            c = "[" + mooTools_escapeRegExp(s) + "]",
            g1 = Character.getGlyphs(s)[1];

		// test SMP
		asrt(ClassMatcher(c).anyIn(g1));
		asrt(!ClassMatcher(c).anyIn('a'));
		// test 01..001f
		s = "\u0001\r\n\u0002";
		c = "[" + s + "]";
		asrt(ClassMatcher(c).anyIn(s.charAt(0)));
		asrt(ClassMatcher(c).anyIn(s.charAt(1)));
		asrt(ClassMatcher(c).anyIn(s.charAt(2)));

		asrt(ClassMatcher(c).allIn(s));
		return "OK";
	}
};
            