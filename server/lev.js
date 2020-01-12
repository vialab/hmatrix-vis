// Dependencies 
var LevDist = require("levdist");
var fs = require("fs");
 



// Output the levdist of these two words 

fs.readFile('../database/decoded words with context col.csv', 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  var words = data.split("\n");
    //console.log(words);
    for (line in words){        
        var col = words[line].split(','); 
        console.log(col[0]+','+col[1]+','+col[2]+','+col[3]+','+col[4]+','+col[5]+','+LevDist(col[2], col[4]));
    }
});



// => 1 
