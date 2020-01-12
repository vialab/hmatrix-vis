//-------
var mysql  = require('mysql'),
    _ = require("lodash");


//------Open databse connection
//load parameters from dbConfig file
var database = require('./dbStudy');

database.createConnection();
//-------

database.query('SELECT * FROM wordlist');



//-------Close database connection
database.closeConnection();


