var mysql = require('mysql');


var database = function(){
    
    var db = {};

    var conn = null;

    var createConnection = function(){
    //------Open databse connection
    //load parameters from dbConfig file
        var dbConfig = require('./dbConfig');
        if (conn==null){
            conn = mysql.createConnection({
              host     : dbConfig.storageConfig.host,
              user     : dbConfig.storageConfig.user,
              port     : dbConfig.storageConfig.port,
              password : dbConfig.storageConfig.password,
              database : dbConfig.storageConfig.database
            }); 
        }
        
        return conn;
    };
    //-------


    var closeConnection = function(){
        conn.end();
    };

    var query = function(querySTR, callback){
        conn.query(querySTR, function(err, rows, fields) {
          if (err) {console.log(querySTR);throw err;}        
//            console.log('The solution is: ', rows);   
            callback(rows);
        });
    };
    
    var queryP = function(querySTR, param, callback){
        conn.query(querySTR, param, function(err, rows, fields) {
          if (err) {console.log(querySTR);throw err;}        
//            console.log('The solution is: ', rows);   
            callback(rows);
        });
    };
    
    return {
        createConnection : createConnection,
        closeConnection  : closeConnection,
        queryP           : queryP,
        query            : query
        
    };
};



module.exports = database();
