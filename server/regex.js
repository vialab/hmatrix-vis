var Regex = require("regex");
var fs = require("fs");
var nLastChars = 2, ignoreSymbols = true;



fs.readFile('../database/decoded words with context col.csv', 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  var words = data.split("\n");
    //console.log(words);
    for (line in words){        
        var col = words[line].split(','); 
        var original = col[2], decoded = col[4], abbreviation = col[3];
        
        if (ignoreSymbols==true)
            abbreviation = abbreviation.replace(/[^a-zA-Z0-9 ]+/gi, "").trim();
        var length = abbreviation.length;        
        var searchStr = abbreviation.substring((length - nLastChars), length);
        
        var origiCol = original.endsWith(searchStr);
        var decCol = decoded.endsWith(searchStr);
        console.log(col[0]+','+col[1]+','+col[2]+','+col[3]+','+col[4]+','+col[5]+','+origiCol+','+decCol);
    }
});




