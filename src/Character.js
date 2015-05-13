(function() { //MODULE START

	/**
	author: marcus@gratex.com
	implementacia Unicde.Character triedy ala Java
	potrebnej pre dalsie encodingu konzistentne z Java svetom
	Mostly syntax "rewrite from java sources, not converted to JavaScript"
	**/

	// imports
	var fromCharCode = String.fromCharCode,

	//TODO: assrety lebo null hodnoty produkuju divne resulty napriklad
	//TODO: remove .this from "Static" methods !!!!
	//pozri napriklad gjax.Character.toChars(undefined) !!!
	MIN_CODE_POINT = 0,
	MAX_CODE_POINT = 0x10ffff,
	/*
	var MIN_HIGH_SURROGATE = '\uD800';
	var MAX_HIGH_SURROGATE = '\uDBFF';
	var MIN_LOW_SURROGATE  = '\uDC00';
	var MAX_LOW_SURROGATE  = '\uDFFF';
	var MIN_SUPPLEMENTARY_CODE_POINT = 0x010000;
	*/
	MIN_HIGH_SURROGATE = 0xD800,
	MAX_HIGH_SURROGATE = 0xDBFF,
	MIN_LOW_SURROGATE = 0xDC00,
	MAX_LOW_SURROGATE = 0xDFFF,
	MIN_SUPPLEMENTARY_CODE_POINT = 0x010000,

	// dumped from Grammars.js, crosscheck by mackbeth
	RE_IS_WHITESPACE = /^[\u0009-\u000D\u001C-\u0020\u1680\u180E\u2000-\u2006\u2008-\u200A\u2028-\u2029\u205F\u3000]{1,}$/;

	function toSurrogates(codePoint, dst, index) {
		var offset = codePoint - MIN_SUPPLEMENTARY_CODE_POINT;
		dst[index + 1] = ((offset & 0x3ff) + MIN_LOW_SURROGATE);
		dst[index] = ((offset >>> 10) + MIN_HIGH_SURROGATE);
	};
	function _toChars(codePoint, dst, dstIndex) {
		// original java impl
		if (codePoint < 0 || codePoint > MAX_CODE_POINT) {
			throw new Error("IllegalArgumentException");
		}
		if (codePoint < MIN_SUPPLEMENTARY_CODE_POINT) {
			dst[dstIndex] = codePoint;
			return 1;
		}
		toSurrogates(codePoint, dst, dstIndex);
		return 2;
	};
	var Ch = {
		//--------------------------------- Java API -----------------------------------
		isWhitespace: function(cp) {
			///<summary>
			///		Determines if the specified character (Unicode code point)
			///		is white space according to Java. (see JSE JavaDoc)
			///		[\u0009-\u000D\u001C-\u0020\u1680\u180E\u2000-\u2006\u2008-\u200A\u2028-\u2029\u205F\u3000]	
			///</summary>
			var s = fromCharCode.apply(null, Ch.toChars(cp));
			return !!s.match(RE_IS_WHITESPACE);
		},
		isISOControl: function(cp) {
			if (typeof cp != 'number') throw new Error("Illegal argument expecting number not:" + (typeof cp));
			return (cp >= 0x0000 && cp <= 0x001F)
				|| (cp >= 0x007F && cp <= 0x009F);
		},
		isHighSurrogate: function(ch) {
			return ch >= MIN_HIGH_SURROGATE && ch <= MAX_HIGH_SURROGATE;
		},
		isLowSurrogate: function(ch) {
			return ch >= MIN_LOW_SURROGATE && ch <= MAX_LOW_SURROGATE;
		},
		isSurrogatePair: function(high, low) {
			return Ch.isHighSurrogate(high) && Ch.isLowSurrogate(low);
		},
		isSupplementaryCodePoint: function(cp) {
			///<summary>
			///		Determines whether the specified character (Unicode code point) 
			///		is in the supplementary character range. 
			///</summary>
			return cp >= MIN_SUPPLEMENTARY_CODE_POINT && cp <= MAX_CODE_POINT;
		},
		codePointAt: function(seq, index) {
			// TODO: standalone testcase
			var c1 = seq.charCodeAt(index++), c2;
			if (Ch.isHighSurrogate(c1)) {
				if (index < seq.length) {
					c2 = seq.charCodeAt(index);
					if (Ch.isLowSurrogate(c2)) {
						return Ch.toCodePoint(c1, c2);
					}
				}
			}
			return c1;
		},
		isDefined: function(cp) {
			//TODO: ?
			return true;
		},
		toCodePoint: function(high, low) {
			return ((high - MIN_HIGH_SURROGATE) << 10)
            + (low - MIN_LOW_SURROGATE) + MIN_SUPPLEMENTARY_CODE_POINT;
		},
		toChars: function(codePoint) {
			///<summary>
			///		Converts the specified character (Unicode code point) to its 
			///		UTF-16 representation stored in a char array. 
			///		If the specified code point is a BMP (Basic Multilingual Plane or Plane 0) value, 
			///		the resulting char array has the same value as codePoint. 
			///		If the specified code point is a supplementary code point, 
			///		the resulting char array has the corresponding surrogate pair.
			///</summary>
			var r = []; _toChars(codePoint, r, 0); return r;
		},
		//--------------------------------- extensions -----------------------------------
		toCodePoints: function(s) {
			///<summary>
			///		Splits string s into array of codepoints (int[])
			///		May return int[] containing "unpaired surrogate" codePoint (symetry with fromCodePoints)
			///</summary>
			// custom extension
			for (var r = [], j = 0, i = 0, l = s.length, cp; i < l; j++) {
				r[j] = cp = Ch.codePointAt(s, i);
				i += Ch.isSupplementaryCodePoint(cp) ? 2 : 1;
			}
			return r;
		},
		fromCodePoints: function(codePoints) {
			///<summary>
			///		Joins int[] of code points into String
			///		See String(int[],int,int) Java constructor
			///		JavaScript String.fromCharCodes works with char and char pairs
			///		this one works with codepoints.
			///		May return string containing "unpaired surrogate" (for symetry with Java API)
			///</summary>
			///<returns type="String" mayBeNull="false"></returns>	
			for (var s = [], j = 0, i = 0, l = codePoints.length; i < l; i++) {
				j = j + _toChars(codePoints[i], s, j);
			}
			return fromCharCode.apply(null, s);
		},
		iterateCodePoints: function(s, callback) {
			///<summary>
			///		CodePoint Iterator,
			///		alterantive to toCodePoints, without constructing array
			///		May send "unpaired surrogate" (for symetry with Java API) 
			///		into callback.
			///</summary>
			///<param name="callback" type="Function" mayBeNull="false" optional="false">
			///		Signature myCallback(codePoint,srcIndex)
			///</param>
			for (var i = 0, l = s.length, cp; i < l; ) {
				cp = Ch.codePointAt(s, i); //TODO: get rid of Ch. !! unncesary lookup
				callback(cp, i);
				i += Ch.isSupplementaryCodePoint(cp) ? 2 : 1;
			}
		},
		getGlyphs: function(s) {
			///<summary>
			///		Split String into glyphs
			///</summary>
			///<returns	type="Array" elementType="String"
			///		String[], string is split based on Unicode Glyphs not chars
			///		Fails if "unpaired surrogate" found
			/// </returns>
			var i, cp, retVal = [], l = s.length;
			for (i = 0; i < l; i++) {
				cp = s.charCodeAt(i); //TODO: pozor na rozdiel charAt a charCodeAt !!!
				if (Ch.isHighSurrogate(cp)) {
					if (!Ch.isLowSurrogate(s.charCodeAt(i + 1))) //outOfIndex->Nan->!LowSurrogate
						throw new Error("IllegalArgumentException, failed on position:" + i);
					retVal.push(fromCharCode(cp, s.charCodeAt(i + 1)));
					i++;
				}
				else {
					retVal.push(s.charAt(i));
				}
			}
			return retVal;
		}
	}
	gjax.Character = Ch;
} ());               //MODULE END
