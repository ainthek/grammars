/// <reference path="../base/gjax.js" />
(function() {

	// imports
	var asrt = gjax.asrt,
		isNumber = gjax.isNumber;

	function asrtNumber(num, msg) {
		return asrt(isNumber(num), msg || "NumberExpected");
	};
	function num2Hex(num, pad, prefix) {
		///<summary>
		///		Converts number to hexa notation string (0x00AA). Uppercased.
		///</summary>
		///<param name="num" type="number" mayBeNull="false" optional="false">
		///		integral number or Number, NaN is not accepted
		///</param>
		///<param name="pad" type="string" mayBeNull="true" optional="true">
		///		Default is "0000"
		///</param>
		///<param name="prefix" type="string" mayBeNull="true" optional="true">
		///		Default is "0x". To supress prefixing use "".
		///</param>
		//	Speed overhead: 1.33 (over exact code with range based padding)
		asrtNumber(num);
		// defaults
		if (pad == null) pad = "0000";
		if (prefix == null) prefix = "0x";

		var hex = num.toString(16).toUpperCase();
		if (pad != null && hex.length < pad.length)
			hex = (pad + hex).slice(-pad.length);
		return prefix == null ? hex : prefix + hex;
	};
	function num2Ues(num) {
		///<summary>
		///		Number 2 Unicode Escape Sequence.
		///		Remark: use on chars not ints to produce string literals of SMP characters
		///</summary>
		///<returns type="String" mayBeNull="false">
		///		String in the form of \u0000
		///</returns>
		return "\\u" + num2Hex(num, "0000", ""); //do not rely o defaults ;-))
	};
	function chars2Ues(str) {
		///<summary>
		///		Converts allchars in string to Unicode Escape Sequence literal
		///		Escaping is done by chars (not bytes, nor codePoints)	
		///</summary>
		var i, r = [];
		for (i = 0, l = str.length; i < l; i++) {
			r.push(num2Ues(str.charCodeAt(i)));
		}
		return r.join("");
	};
	function toChar(numOrChar) {
		///<summary>
		///		"Cast to char", usable for BMP only, 
		///		for SMP use Character.toCodePoints 
		///</summary>
		///<param name="numOrChar" type="Object" mayBeNull="false" optional="false">
		///		 'a','9' are converted to their charCode.
		///</param>
		///<returns type="number" mayBeNull="false">(char) range</returns>
		//TODO: rewrite nicer
		asrt(isNumber(numOrChar) || typeof numOrChar == "string" && numOrChar.length == 1);
		var r;
		if (typeof numOrChar == "string") {
			r = numOrChar.charCodeAt(0);
		}
		else {
			//todo: shift
			r = numOrChar;
		}
		asrt(r >= 0 && r < 0xFFFF); //TODO: check 
		return r;
	};
	function escapeForRegExp(rawCharSet) {
		///<summary>
		///		Mootools version 
		///		(fast, seem to be runtime safe, but may produce UNPRINTABLEs in RegExp.source)
		///		escapes -.*+?^${}()|[]/\ (16chars)
		///</summary>
		return rawCharSet.replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
	};
	function escapeForRegExpClass(rawCharSet) {
		///<summary>
		///		Crockford version -/[\]^ (6 chars)
		///		(fast, unverified runtime safety (//TODO: XB tests!), UNPRINTABLEs in RegExp.source)
		///		for regexp CLASS escaping
		///</summary>
		return rawCharSet.replace(/[\u002d\u002f\u005b\u005c\u005d\u005e]/g, '\\$1');
	};
	function escapeForRegExpSafe(strData) {
		///<summary>
		///		Replaces all chars out of a-zA-Z0-9 range
		///		with unicode escape sequence (\uXXXX)
		///		(SLOW, runtime safe, PRINTABLE RegExp.source)
		///</summary>
		// Mootools uses this class:  [-.*+?^${}()|[\]\/\\]
		// and replaces with \\ escape
		// I like this version more, its safer (for unprintable ascii chars)
		// Extremelly slow (4seconds fo 10000 loops in MSIE !)
		// TODO: optimize performance (refactor: expand method)
		return strData.replace(/[^a-zA-Z0-9]/g, function(mch) {
			// escaping to \u not just \
			return num2Ues(mch.charCodeAt(0));
		});
	};
	var percentEncode = (function() {

		var indexOf = Array.prototype["indexOf"] || function(value, i) {
			// from Stack.js
			var j;
			for (j = this.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0; i < j && this[i] !== value; i++);
			return j <= i ? -1 : i;
		},
		//format = num2Hex,
		immuneA = function(arr, a) { return indexOf.call(arr, a) != -1; },
		immuneR = function(regExp, a) { return regExp.test(a); };

		return function(str, immune) {
			///<summary>
			///		Non-ASCII characters must first be encoded according to UTF-8 [STD63], and then
			///		each octet of the corresponding UTF-8 sequence must be percent-
			///		encoded.
			///		Support for Chars from Secondary Multilingual Plane ("2 char glyphs")
			///</summary>
			///<param name="immune" type="Object" mayBeNull="true" optional="false">
			///		a) Array of imune chars example: ['a','/','-']
			///		if null no chars are encoded, if [] all chars are encoded,
			///		Use arrays only for short lists < 5 (performance !) 
			///		and use regExp instead
			///		b) or RegExp, then each char is tested against regexp if immune
			///     if null no chars are encoded
			///</param>
			// Remarks:
			// TC available here: http://localhost:8007/_testcases/EscapeUtils/01.html
			// Benchmarks:
			//	FF 
			//	 12 ms with native + replace
			//	145 ms with rfc3986.unreserved array,
			//	 80 ms with rfc3986.unreserved regexp
			// MSIE
			//	 125 ms 
			//	1265 ms
			//	 587 ms
			// tested on 1000 loops with teststring RFC.rfc3986.reserved + "Aa0-_.!~*'()*";
			// means: teststring on short string with reserved and unreserverd chars
			// Generally this is too slow in this generic form, 
			// Probably much faster "ad hoc codes" can be used for "specialized unescaped sets".
			if (immune == null) return str;
			var isRegExp = immune.constructor === RegExp,
				isImmune = isRegExp ? immuneR : immuneA,
				encodeAll = !isRegExp && !immune.length,
				r = [], i, l, c, c2, chc, h, ec;

			for (i = 0, l = str.length; i < l; i++) {
				c = str.charAt(i);
				// this is not here by purpose for "double encoding freedom"
				//if (c == "%") {	r.push("%25");}	else  
				if (encodeAll || !isImmune(immune, c)) {
					try {
						// this encodes everything except alphanum and -_.!~*'()
						ec = encodeURIComponent(c);
					} catch (ex) {
						// fails on high surrogates from SMP
						// since we do not expect SMP usually
						// we leave this in catch block instead of preemptive if
						// this fails if not follwed by correct low surr.
						// or on end of string ("" from charAt(i+1))
						try {
							ec = encodeURIComponent(c + str.charAt(i + 1)); //+ is concat here
							i++;
						} catch (ex1) {
							throw new Error("percentEncode: Illegal character sequence");
						}
					}
					// if not immune and not encoded by default encodeURI
					// it is sure < 128
					// asrt(c.chatCodeAt(0) < 0xFF);
					if (ec.length == 1) {
						//ec = format(c.charCodeAt(0), "00", "%"); //slow ?
						// faster 400 vs. 587 ms on MSIE 80 vs 60ms on FF
						chc = c.charCodeAt(0);
						h = chc.toString(16).toUpperCase();
						ec = "%" + (chc < 0x16 ? "0" + h : h);
					}
					r.push(ec);
				}
				else {
					r.push(c);
				}
			}
			return r.join("");
		}
	} ());

	// export
	var ns = gjax.EscapeUtils;
	ns.asrtNumber = asrtNumber;
	ns.toChar = toChar;

	ns.num2Hex = num2Hex;
	ns.num2Ues = num2Ues;

	ns.chars2Ues = chars2Ues;

	ns.escapeForRegExp = escapeForRegExp;
	ns.escapeForRegExpClass = escapeForRegExpClass;
	ns.escapeForRegExpSafe = escapeForRegExpSafe;

	ns.percentEncode = percentEncode;

} ());
// testcases available at: http://localhost:8007/_testcases/EscapeUtils/01.html
