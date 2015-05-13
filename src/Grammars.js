/// <reference path="../base/gjax.js" />
/// <reference path="Character.js" />
/// <reference path="EscapeUtils.js" />
/// <reference path="Basic.js" />



(function() {

	/*
	JS mapping for (A)BNF

	2.2.  Rule Form
	RL
	2.3.  Terminal Values
	literals, strings,"chars",number 
	'',"",0x,10 
	3.1.  Concatenation:  Rule1 Rule2
	C()
	3.2.  Alternatives:  Rule1 / Rule2
	A()
	3.4.  Value Range Alternatives:
	R(s,e)
	3.5.  Sequence Group:  (Rule1 Rule2)
	G
	elem (foo / bar) blat
	3.6.  Variable Repetition:  *Rule
	*/

	// ecma and dom shortcuts
	var toString = Object.prototype.toString,
		hasOwnProperty = Object.prototype.hasOwnProperty,
		slice = Array.prototype.slice,
		fromCharCode = String.fromCharCode,
	// gjax shortcuts
		asrt = gjax.asrt,
		isArray = gjax.isArray,
		$C = gjax.Collections,
		EU = gjax.EscapeUtils,
		Character = gjax.Character,
		ClassMatcher = gjax.EscapeUtils.ClassMatcher,
	// EscapeUtils shortcuts	
		asrtNumber = EU.asrtNumber,
		num2Hex = EU.num2Hex,
		num2Ues = EU.num2Ues,
		toChar = EU.toChar,
		escapeForRegExp = EU.escapeForRegExpSafe; // full escaping, produces more readable than just class escaping 
	//------------------------- helers functions ------------------
	function compactArray(arr) {
		///<summary>
		///         Converts int[] into Object[], 
		///         seqences of incremented ints [i,i+1,i+2] are converted to range object R(i,i+2)
		///</summary>
		// java code by zdenko capik (js rewrite)
		asrt(arr != null, "Illegal Argument");

		if (arr.length == 0) return [];
		arr = arr.slice(0);
		arr.sort(function(a, b) { return a - b; });

		var TRESHOLD = 1,
			ret = [],
			first = arr[0],
			last = arr[0],
			ready = false,
			i, j, l = arr.length, l1 = l - 1;

		for (i = 0; i < l; i++) {
			if (arr[i] == (last + 1) || arr[i] == last) {
				last = arr[i];
				ready = false;
			} else {
				ready = true;
			}
			if (ready || i == l1) {
				if (last > first) {
					if (last - first > TRESHOLD)
						ret.push(R(first, last));
					else
						for (j = first; j <= last; j++) ret.push(j);
				} else {
					ret.push(last);
				}

				if (i == l1 && arr[i] != last) {
					ret.push(arr[i]);
				}
				first = arr[i];
				last = arr[i];
			}
		}
		return ret;
	};

	//------------------------- common functions ------------------
	function isALPHA(c) {	// number expected !
		// redundant but fast check for alpha and digit
		// also to prevent recursion in some functions
		return c >= 0x41 && c <= 0x5A || c >= 0x61 && c <= 0x7A;
	}
	function isDIGIT(c) {// number expected !
		return c >= 0x30 && c <= 0x39;
	}
	function isDisplayableAscii(c) {
		return c >= 0x21 && c <= 0x7E;
	}

	var common_prototype = {
		toRegExpClass: function(bComplementary) {
			return new RegExp(this.toRegExpString(bComplementary));
		}
	};
	function A(a) {
		// Alternatives	
		if (!isArray(a)) a = slice.call(arguments); // A(1,2,3) is the same as A([1,2,3])
		return new A.prototype.cnstr(a);
	}
	A.CHS = function(s) {
		return new A.prototype.cnstr(s.split(''));
	}
	A.prototype = {
		name: "ALT",
		cnstr: function(a) {
			this._a = a; //sort ?
			// syntax checking
			for (var ai, i = 0; i < a.length; i++) {
				ai = a[i];
				asrt(typeof ai != "string" || ai.length == 1, "A.cnstr: Invalid SMP 'char' specified at position " + i);
			}
		},
		toString: function() {
			/*
			for (var a = this._a, r = [], i = a.length; i--; ) {
			r[i] = a[i].toString();
			}
			return r.join("");
			*/
			return this._a.join("");
		},
		toRegExpString: function(bComplementary, parcial) {

			// parcial is for private usage ! no enveloping is done
			// TODO: optimize ?!
			//			for (var a = this._a, r = [], i = a.length; i--; ) {
			//				r[i] = a[i].toRegExpString ? a[i].toRegExpString(null, true) : escapeForRegExp(a[i].toString());
			//			}
			//			r = r.join("");
			//			return parcial ? r : bComplementary ? "[^" : "[" + r + "]";
			var r, i, a = this.toAlt(); //'char'[]
			for (i = 0, l = a.length; i < l; i++) {
				a[i] = a[i].charCodeAt(0); //BMP only !
			}
			//debugger;
			// [] mix of int and R
			a = compactArray(a);

			for (r = [], i = a.length; i--; ) {
				r[i] = a[i].toRegExpString ?
					a[i].toRegExpString(null, true) : // R
					escapeForRegExp(fromCharCode(a[i])); //INT
			};
			r = r.join("");
			return parcial ? r : (bComplementary ? "[^" : "[") + r + "]";
		},
		test: function(s) {
			// test if whole string contains only allowed chars in alternative
			// TODO: this will prblably stop working after alf can contain more types of chids ? 
			var re = new RegExp("^" + this.toRegExpString() + "{1,}$");
			return !!s.match(re);
		},
		toAlt: function() {
			var a = this._a, r = [], i, l = l = a.length, aa;
			for (i = 0; i < l; i++) {
				aa = a[i].toAlt ? a[i].toAlt() : a[i].toString();
				r = r.concat(aa);
			}
			return r;
		},
		matcher: function() {
			///<returns type="ClassMatcher" mayBeNull="false"></returns>
			return ClassMatcher(this.toRegExpString());
		}
	};
	gjax.augment(A.prototype, common_prototype);
	A.prototype.cnstr.prototype = A.prototype;

	function R(s, e) {
		// Ranges
		return new R.prototype.cnstr(s, e);
	}
	R.prototype = {
		name: "RNG",
		cnstr: function(s, e) {
			s = toChar(s); e = toChar(e);
			this._s = s;
			this._e = e;
		},
		toString: function() {
			return num2Hex(this._s) + "-" + num2Hex(this._e);
		},
		toRegExpString: function(bComplementary, parcial) {
			var r, s = this._s, e = this._e;
			//			if (isALPHA(s) && isALPHA(e) || isDIGIT(s) && isDIGIT(e)) { //TODO: minimize a-z,A-Z,0-9
			//				r = fromCharCode(s) + "-" + fromCharCode(e);
			//			}
			//			else {
			//				r = num2Ues(s) + "-" + num2Ues(e); //could be optimized for alpha and digit
			//			}
			r = escapeForRegExp(fromCharCode(s)) + "-" + escapeForRegExp(fromCharCode(e));
			return parcial ? r : (bComplementary ? "[^" : "[") + r + "]";

		},
		test: function(n) {
			asrtNumber(n);
			return n >= this._s && n <= this._e;
		},
		toAlt: function() {

			var r = [], s = this._s, e = this._e, i;
			if (e - s > 2048) throw new Error("R.toArr: too large range");
			for (i = 0; s <= e; s++, i++) r[i] = fromCharCode.apply(this, Character.toChars(s));
			return r;
		},
		matcher: A.prototype.matcher
	};
	gjax.augment(R.prototype, common_prototype);
	R.prototype.cnstr.prototype = R.prototype;

	function S() {
		// Sequence group
		return new S.prototype.cnstr(slice.call(arguments));
	}
	S.prototype = {
		name: "SQG", //TODO: verfify name
		cnstr: function(a) {
			this._a = a;
		},
		test: function() {

		},
		toString: function() {
			//TODO: change
			return this._a.join(" ");
		},
		toRegExpString: function(bComplementary, parcial) {
			var a = this._a, r = [], i, l = l = a.length, aa;
			for (i = 0; i < l; i = i + 2) {
				aa = a[i].toRegExpString ? a[i].toRegExpString(bComplementary, parcial) : escapeForRegExp(a[i].toString());
				aa += a[i + 1]; // kazde druhe je {}
				r[i] = aa;
			}
			return r.join("");
		}
	};
	gjax.augment(S.prototype, common_prototype);
	S.prototype.cnstr.prototype = S.prototype;

	var RL = function() { },
		C = function() { },
		G = function() { };
	//-------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------
	var rfc5234 = (function() {
		///<summary>
		///		http: //tools.ietf.org/html/rfc5234
		///		Augmented BNF for Syntax Specifications: ABNF	
		///</summary>
		var ALPHA = A(R(0x41, 0x5A), R(0x61, 0x7A)),
			DIGIT = R(0x30, 0x39);
		return {
			ALPHA: ALPHA,
			DIGIT: DIGIT,
			HEXDIG: A(DIGIT, 'A', 'B', 'C', 'D', 'E', 'F'),
			CHAR: R(0x01, 0x7F),   //any 7-bit US-ASCII character,excluding NUL
			VCHAR: R(0x21, 0x7E) //visible (printing) characters
		};
	} ());
	//-------------------------------------------------------------------------------------
	var rfc2396 = (function() {
		// imports
		var ALPHA = rfc5234.ALPHA,
			DIGIT = rfc5234.DIGIT,
		// locals
		//reserved = A(';', '/', '?', ':', '@', '&', '=', '+', '$', ','),
			reserved = A.CHS(";/?:@&=+$,"), //experimental short syntax
			mark = A('-', '_', '.', '!', '~', '*', '\'', '(', ')'),
			delims = A('<', '>', '#', '%', '"'),
			alphanum = A(ALPHA, DIGIT),
			unreserved = A(alphanum, mark)
		// public	
		return {
			reserved: reserved,
			mark: mark,
			unreserved: unreserved
			//delims: delims
		};
	} ());
	//-------------------------------------------------------------------------------------
	var rfc3986 = (function() {
		// imports
		var ALPHA = rfc5234.ALPHA,
			DIGIT = rfc5234.DIGIT,
			HEXDIG = rfc5234.HEXDIG,
		// locals	
			gen_delims = A(':', '/', '?', '#', '[', ']', '@'),
			sub_delims = A('!', '$', '&', '\'', '(', ')', '*', '+', ',', ';', '='),
			reserved = A(gen_delims, sub_delims),
			unreserved = A(ALPHA, DIGIT, "-", ".", "_", "~"),
			pct_encoded = S("%", "{1}", HEXDIG, "{2}");
		// public	
		return {
			reserved: reserved,
			unreserved: unreserved,
			pct_encoded: pct_encoded
		};
	} ());
	//-------------------------------------------------------------------------------------
	var Xml10 = (function() {
		//(XML) 1.0 (Fifth Edition), http://www.w3.org/TR/REC-xml/

		var whiteSpaceChars = A.CHS("\x20\x09\x0D\x0A"),
			whiteSpace = S(whiteSpaceChars, "{1,}"); //Whitespace [3]    S    ::=    (#x20 | #x9 | #xD | #xA)+
		return {
			WhiteSpace_S: whiteSpace,
			_WhiteSpace: whiteSpaceChars // not in grammars, just for dumps
		};

	} ());
	var Unicode520 = (function() {
		//http://www.unicode.org/Public/5.2.0/ucd/PropList.txt
		var Zs = A('\x20', '\xA0', '\u1680', '\u180E', R(0x2000, 0x200A), '\u202F', '\u205F', '\u3000'), // SPACE_SEPARATOR
			Zl = A('\u2028'), //LINE_SEPARATOR
			Zp = A('\u2029'), //PARAGRAPH_SEPARATOR
			White_Space = A(R(0x09, 0x0D), '\u0085', Zs, Zl, Zp),
			High_surrogate_code_point = R(0xD800, 0xDBFF),
			Low_surrogate_code_point = R(0xDC00, 0xDFFF);

		asrt(White_Space.toAlt().length == 26); //# Total code points: 26s
		return {
			White_Space: White_Space,
			//non-breaking space ('\u00A0', '\u2007', '\u202F'). 
			Zs: Zs, // SPACE_SEPARATOR
			Zl: Zl, //LINE_SEPARATOR
			Zp: Zp, //PARAGRAPH_SEPARATOR
			Cc: A(R(0, 0x001F), R(0x007F, 0x009F)),
			// http://www.unicode.org/versions/Unicode5.2.0/ch03.pdf#2630
			High_surrogate_code_point: High_surrogate_code_point,
			Low_surrogate_code_point: Low_surrogate_code_point,
			Surrogate_pair: S(High_surrogate_code_point, "{1}", Low_surrogate_code_point, "{1}")
		};
	} ());

	//-------------------------------------------------------------------------------------
	var Ecma262_3 = (function() {
		var ALPHA = rfc5234.ALPHA,
			DIGIT = rfc5234.DIGIT;
		var uriReserved = rfc2396.reserved,
			uriMark = rfc2396.mark,
			uriUnescaped = rfc2396.unreserved;
		return {
			uriReserved: uriReserved,
			uriMark: uriMark,
			uriUnescaped: uriUnescaped,
			//Let unescapedURISet be a string containing one instance of each character valid in uriReserved
			// and uriUnescaped plus #.
			encodeURI_unescapedURISet: A(uriUnescaped, uriReserved, "#"),
			encodeURIComponent_unescapedURISet: uriUnescaped,
			escape_unescapedSet: A(ALPHA, DIGIT, "@", "*", "_", "+", "-", ".", "/")
		};

	} ());
	var Java16 = (function() {
		// It is a Unicode space character (SPACE_SEPARATOR, LINE_SEPARATOR, or PARAGRAPH_SEPARATOR)
		// but is not also a non-breaking space ('\u00A0', '\u2007', '\u202F').
		//It is '\u0009', HORIZONTAL TABULATION. 
		//It is '\u000A', LINE FEED. 
		//It is '\u000B', VERTICAL TABULATION. 
		//It is '\u000C', FORM FEED. 
		//It is '\u000D', CARRIAGE RETURN. 
		//It is '\u001C', FILE SEPARATOR. 
		//It is '\u001D', GROUP SEPARATOR. 
		//It is '\u001E', RECORD SEPARATOR. 
		//It is '\u001F', UNIT SEPARATOR.
		var isWhitespace = A(Unicode520.Zs, Unicode520.Zl, Unicode520.Zp).toAlt();
		isWhitespace = $C.removeAll(isWhitespace, ['\u00A0', '\u2007', '\u202F']).concat([
			'\u0009', '\u000A', '\u000B', '\u000C', '\u000D', '\u001C', '\u001D', '\u001E', '\u001F'
		]);
		isWhitespace = $C.unique(isWhitespace);
		return {
			URIEncoder_same: A(R('A', 'Z'), R('a', 'z'), R('0', '9'), ".", "-", "*", "_"),
			isWhitespace: A(isWhitespace),
			isISOControl: A(R(0x0, 0x1F), R(0x7f, 0x9F))
		};
	} ());
	var Html4 = (function() {
		var unused_ascii = [R(0, 8), R(11, 12), R(14, 31), R(127, 159)],
			surrogates = R(55296, 57343),
			unused = unused_ascii.concat(surrogates);
		return {
			// see: http://www.w3.org/TR/html4/sgml/sgmldecl.html
			// http://alis.isoc.org/web_ml/html/rfc-i18n/rfc-i18n-2.en.html
			// This means that numeric character references
			// within that range (e.g. &#146;) are illegal in HTML.
			// if surrogates are also included, means this is usable for code points not 'chars'
			UNUSED: A(unused),
			_BIG_5: A('<', '>', '&', '"', "'")
		};
	} ());
	//-------------------------------------------------------------------------------------
	var RE = (function() {
		//RegExp:Mootools uses this.replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
		// \/[]{}?+*|.^$()- (16)
		// by Mr.D "specials"
		// \/[]{}?+*|.^$ (13)
		// some articles specify only 11 chars
		return {
			// see Mootools
			toBeEscaped: A('\\', '/', '[', ']', '(', ')', '{', '}', '?', '+', '*', '|', '.', '^', '$', '(', ')', '-'),
			// see JavaScript the Good Parts
			class_escape: A('\\', '/', '[', ']', '^'), //Mr.D
			// see MSDN RegExp syntax
			whiteSpace_s: A(' ', '\x0c', '\x0a', '\x0d', '\x09', '\x0b'),
			wordCharacter_w: A(R('A', 'Z'), R('a', 'z'), R('0', '9'), '_')
		};
	} ());
	var Misc = (function() {
		// various and made up definitions
		// http://msdn.microsoft.com/en-us/library/ms181045(VS.80).aspx
		var VS2005_special_characters = A.CHS("$&<>{}[]():;=^|*!\\/%?,'\t\u2026"),
		// http://msdn.microsoft.com/en-us/library/aa980550.aspx#ProjectNames, //Special characters
			TFS2010_special_characters = A(
				Unicode520.Cc,
				Unicode520.High_surrogate_code_point,
				Unicode520.Low_surrogate_code_point,
				A.CHS("/:\~&%;@'\"?<>|#$*}{,+=[]\u2025\u2026")
			),
		// http://www.comentum.com/File-Systems-HFS-FAT-UFS.html (TODO: rewise, I do not trust this source)
			FS_Restricted_Win = A.CHS("\"/\*?<>|:"),
			FS_Restricted_MacOs9 = A(':'),
			FS_Restricted_MacOsX = A(':', '/'),
			FS_Restricted_Unix = A(' ', '/')
		return {
			VS2005_special_characters: VS2005_special_characters,
			TFS2010_special_characters: TFS2010_special_characters,
			FS_Restricted_Win: FS_Restricted_Win,
			FS_Restricted_MacOs9: FS_Restricted_MacOs9,
			FS_Restricted_MacOsX: FS_Restricted_MacOsX,
			FS_Restricted_Unix: FS_Restricted_Unix
			// TODO: IIS restricted URLs etc...
		}
	} ());
	//-------------------------------------------------------------------------------------
	gjax.EscapeUtils.Grammars = {
		rfc5234: rfc5234, //ABNF
		rfc3986: rfc3986,
		rfc2396: rfc2396,
		Xml: Xml10,
		Html4: Html4,
		Unicode: Unicode520,
		Ecma: Ecma262_3,
		Java: Java16,
		RegExp: RE,
		Misc: Misc
	};
} ());

