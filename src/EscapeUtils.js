(function() { //MODULE START

	/**
	Author: marcus	
	**/
	var Character = gjax.Character;

	EscapeUtils = {
		escapeHtmlFull: function(s) {
			// late bind to allow HtmlEncoder.encode override
			return gjax.HtmlEncoder.encode(s);
		},
		escapeHtmlSimple: function(str) {
			// fastest variant on MSIE, fast enough on others
			// testcase: http://localhost:8080/gjaxXB/GL_LANG/gjaxXB/_testcases/EscapeUtilsAndCharacter/results.html
			return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\'/g, '&#39;');
		},
		unescapeHtml: function(str) {
			// maybe add other common entities http://www.w3schools.com/HTML/html_entities.asp	
			// but anyway this should be enough to be compatible with escapeHtmlFull,escapeHtmlSimple and big5 and big3 
			var s1 = str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, "'"),
				s2 = s1.replace(/(&#(\d+);)/g, function(foo, bar, code) {
					var codePoint = parseInt(code, 10),
					chars = Character.toChars(codePoint);
					return String.fromCharCode.apply(null, chars); //TEST for Unicode Plane 1:&#65792;
				});
			return s2;
		}
	};
	// aliases
	EscapeUtils.html = EscapeUtils.escapeHtmlFull;
	// export
	gjax.EscapeUtils = EscapeUtils;


} ());       //MODULE END    