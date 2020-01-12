var express = require('express');
var path = require('path');
var LevDist = require("levdist");
var clusterMaker = require('clusters');
//var request = require('request');
//var $ = require('ajax');
var router = express.Router();
var request = require('request');
var running_script = false;
var app = express();
var fs = require('fs');
var d3 = require("d3");

var bodyParser = require('body-parser');
var mx_data = require('./server/hmatrix-data');
        

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//-------
var mysql  = require('mysql'),
    _ = require("lodash");


//------Open databse connection
//load parameters from dbConfig file
var database = require('./server/dbStudy');

app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next()
});


function query(str, callback){
    var cn = database.createConnection();
    cn.query(str, function(err, rows, fields) {
        if (err){ console.log(str); throw err;         }
        callback(rows);
    });
}

function queryP(str, param, callback){
    var cn = database.createConnection();
    cn.query(str, param, function(err, rows, fields) {
        if (err){ console.log(str); throw err;         }
        callback(rows);
    });
}

function print(msg){
    console.log(msg);
}




// -
app.get('/filelistAll', function(req, res) {
    var data = query('SELECT fileid as file FROM icle', function(rows){
        res.setHeader('Cache-Control', 'no-cache');
        res.send(rows);
    });
});


app.get('/filelistToeflAll', function(req, res) {
    //    var data = query('SELECT t.filename as file ,i.llanguage as language, i.score_level, t.id, count(*) as errors FROM toefl_index i left join (toefl t) on (t.id=i.file) left join (error_matches m) on (t.id=m.file_id) where m.essay_set=1 group by id order by errors DESC', function(rows){
    var data = query('select i.filename as file ,i.llanguage as language, i.score_level, i.file as id, i.errors, i.categories, i.prompt from toefl_index i order by id', function(rows){
        res.setHeader('Cache-Control', 'no-cache');
        //        print(rows);
        res.send(rows);
    });
});


app.post('/filelist', function(req, res) {

    var str = 'SELECT file FROM germ WHERE ';
    if(Array.isArray(req.body["msg[]"])){
        for(i=0;i<req.body["msg[]"].length;i++){
            str += ' llanguage LIKE "'+req.body["msg[]"][i]+'"';
            if((i+1)<req.body["msg[]"].length){
                str += " OR ";
            }else{
                str += ';';
            }
        }
    }else{
        str += "llanguage LIKE '"+req.body["msg[]"]+"';";
    }
    //        print(str);
    var data = query(str, function(rows){
        res.setHeader('Cache-Control', 'no-cache');
        res.send(rows);
    });
});

app.post('/reqEssays/db/:db', function(req, res) {
    print(req.body);
    var cells = req.body['cells'];    
    // var cells = req.body.cells; #visargue version
    var str = "", db = req.params.db;
    print(db);
    switch(db){
        case 'toefl': str = "SELECT distinct(essay)  as file, language, score_level, id, errors, categories, prompt FROM toefl_search WHERE "; break;
    }
    var results = [], where="", param = [];

    cells.forEach(function(obj, i, array){
        where += " ((category=? OR subcategory=? OR subsubcategory=? OR rule=?) AND language=?)";
        param.push(obj.row);
        param.push(obj.row);
        param.push(obj.row);
        param.push(obj.row);
        param.push(obj.col);  

        if((i+1)<cells.length)
            where+=" OR ";
        else
            where+=";";
    });
    print(str+where);
    queryP(str+where, param, function(essays){
        res.setHeader('Cache-Control', 'no-cache');
        res.send(essays);      
    });
});

app.post('/standReqEssays/db/:db', function(req, res) {
    var dict = req.body, rows = [], cols = [];
    for(var key in dict){
        if(key.indexOf('row')>-1)
            rows.push(dict[key]);
        else if (key.indexOf('col'))
            cols.push(dict[key]);
    }
    print(rows);
    print(cols);
    var cells = [];
    rows.forEach(function(obj,i,array){
        cells.push({row:rows[i], col:cols[i]});
    });
    print(cells);
    var str = "", db = req.params.db;

    switch(db){
        case 'toefl': str = "SELECT distinct(s.essay)  as file, s.language, i.score_level, id, i.errors, i.categories, prompt FROM icle_corpus.toefl_search s inner join toefl_index i on (i.file=s.id) where "; break;
            //        case 'toefl': str = "SELECT distinct(essay)  as file, language, score_level, id, errors, categories, prompt FROM toefl_search WHERE "; break;
    }
    var results = [], where="", param = [];

    cells.forEach(function(obj, i, array){
        where += " ((s.category=? OR s.subcategory=? OR s.subsubcategory=? OR s.rule=?) AND s.language=?)";
        param.push(obj.row);
        param.push(obj.row);
        param.push(obj.row);
        param.push(obj.row);
        param.push(obj.col);  

        if((i+1)<cells.length)
            where+=" OR ";
        else
            where+=";";
    });

    print(str+where);

    queryP(str+where, param, function(essays){
        res.setHeader('Cache-Control', 'no-cache');
        res.send(essays);      
    });
});



app.get('/getErrorEssay/id/:id', function(req, res) {
    var str = "SELECT m.context_text, m.context_length, m.context_offset, m.length, t.category, t.subcategory, t.subsubcategory, t.rule, m.offset, t.description FROM error_matches m LEFT JOIN error_tree t ON  (m.rule_id=t.rule_id) WHERE m.essay_set=1 AND m.file_id=? order by m.offset;";    
    queryP(str,[parseInt(req.params.id)], function (data){        
        res.setHeader('Cache-Control', 'no-cache');
        res.send(data);
    });
});

app.get('/getErrorStats/id/:id', function(req, res) {
    var str = "SELECT t.category, count(*) as count FROM error_matches m LEFT JOIN error_tree t ON  (m.rule_id=t.rule_id) WHERE m.essay_set=1 AND m.file_id=? group by category order by category";    
    queryP(str,[parseInt(req.params.id)], function (data){        
        res.setHeader('Cache-Control', 'no-cache');
        res.send(data);
    });
});

app.post('/filelistToefl', function(req, res) {

    var str = 'SELECT file FROM toefl_index WHERE ';
    if(Array.isArray(req.body["msg[]"])){
        for(i=0;i<req.body["msg[]"].length;i++){
            str += ' llanguage LIKE "'+req.body["msg[]"][i]+'"';
            if((i+1)<req.body["msg[]"].length){
                str += " OR ";
            }else{
                str += ';';
            }
        }
    }else{
        str += "llanguage LIKE '"+req.body["msg[]"]+"';";
    }
    //        print(str);
    var data = query(str, function(rows){
        res.setHeader('Cache-Control', 'no-cache');
        res.send(rows);
    });
});


app.get('/getessay/id/:id', function(req, res) {
    var str = 'SELECT content FROM icle where fileid like ?';
    print(req.params.id);
    queryP(str,['%'+req.params.id+'%'], function (data){
        if(data.length>0){
            var buffer = new Buffer(data[0]["content"]);
            result = buffer.toString("utf8");
        }else{
            result = "File not found. (DB error)";
        }
        //                print(result);
        res.setHeader('Cache-Control', 'no-cache');
        res.send(result);
    });
});

app.get('/getessayToefl/id/:id', function(req, res) {
    var str = 'SELECT idx.file, idx.llanguage as language, idx.title, idx.score_level, db.content, db.id FROM toefl_index idx LEFT JOIN toefl db ON (idx.file=db.id) WHERE idx.file = ?';
    print(req.params.id);
    var result;
    queryP(str,[req.params.id], function (data){
        if(data.length>0){
            var buffer = new Buffer(data[0]["content"]);
            result = {content: buffer.toString("utf8"),
                      language: data[0]["language"],
                      file: data[0]["file"],
                      title: data[0]["title"],                
                      score_level: data[0]["score_level"],
                      id: data[0]["id"]  
                     };
        }else{
            result = "File not found. (DB error)";
        }
        //                print(result);
        res.setHeader('Cache-Control', 'no-cache');
        res.send(result);
    });
});

function orderRule(p, sql){
    switch(p.orderRow){
        default: sql+=" order by x.rule"; break;
    }
    return sql;
}
function orderCategory(p, sql){
    switch(p.orderRow){
            //        case "alpha": sql+=" order by x.category"; break;
        default: sql+=" order by x.category"; break;
    }
    return sql;
}
function orderSubcategory(p, sql){
    switch(p.orderRow){
        default: sql+=" order by x.subcategory"; break;
    }
    return sql;
}
function orderSubsubcategory(p, sql){
    switch(p.orderRow){
        default: sql+=" order by x.subsubcategory"; break;
    }
    return sql;
}

function orderCol(p, sql){
    switch (p.orderCol){
        case "alpha": sql+=', x.language'; break;
    }
    return sql;
}

function createSQL(p){
    var sql = "";
    var groupby = "group by x.language, x.category, x.rule, x.subcategory, x.subsubcategory, y.tot_essays";
    if(p.dataset=="toefl"){
        sql = "select * from aux_toefl_table";
        // var sel = 'select x.language, x.category, x.rule, x.subcategory, x.subsubcategory, sum(y.error_count) error_count, count(y.id) file_count, y.tot_essays from aux_toefl_distinct x left join aux_toefl_count y on (x.language=y.language AND x.category=y.category AND x.rule=y.rule AND y.error_count is not null) ';
        // switch (p.level){
        //     case "rule":
        //         sql = orderRule(p, sel+groupby); break;
        //     case "category":
        //         sql = orderCategory(p, sel+groupby); break;
        //     case "subcategory":
        //         sql = orderSubcategory(p, sel+'where x.subcategory is not null '+groupby); break;
        //     case "subsubcategory":
        //         sql = orderSubsubcategory(p, sel+'where x.subcategory is not null '+groupby); break;
        // }
        // sql = orderCol(p, sql);
    }else if (p.dataset=="icle"){
        var sel = 'select x.language, x.category, x.rule, x.subcategory, x.subsubcategory, sum(y.error_count) error_count, count(y.id) file_count, y.tot_essays from aux_icle_distinct x left join    aux_icle_count y on (x.language=y.language AND x.category=y.category AND x.rule=y.rule AND y.error_count is not null) ';
        switch (p.level){
            case "rule":
                sql = orderRule(p, sel+groupby); break;
            case "category":
                sql = orderCategory(p, sel+groupby); break;
            case "subcategory":
                sql = orderSubcategory(p, sel+groupby); break;
            case "subsubcategory":
                sql = orderSubsubcategory(p, sel+'where x.subcategory is not null '+groupby); break;
        }
        sql = orderCol(p, sql);
    }else if (p.dataset=="visas"){
        var sel = 'select x.language, x.category, x.rule, x.subcategory, x.subsubcategory, y.tot_essays, sum(y.error_count) error_count, count(y.id) file_count, y.tot_essays from aux_icle_distinct x left join    aux_icle_count y on (x.language=y.language AND x.category=y.category AND x.rule=y.rule AND y.error_count is not null) ';
        switch (p.level){
            case "rule":
                sql = orderRule(p, "select x.language, x.category, x.rule, x.subcategory, x.subsubcategory, sum(y.error_count) error_count, count(y.id) file_count, y.tot_essays \
from (select distinct idx.topic topic, c.name category, r.text_id rule, s.subcategory, s.subsubcategory \
from error_matches m left join (error_rule r) on (r.id=m.rule_id)	left join (error_category c) on (c.id=r.category_id) \
left join (grammar_subrules s) on (s.id=r.subcategory_id and s.category='Grammar') \
left join (visas corpus) on (corpus.id=m.file_id) \
left join (visas_index  idx) on (idx.file_id=corpus.id) \
where essay_set=2) x \
left join (select corpus.id, idx.topic topic, c.name category, r.text_id rule, s.subcategory, s.subsubcategory, count(1) error_count, a.tot_essays \
from error_matches m \
left join (error_rule r) on (r.id=m.rule_id) \
left join (error_category c) on (c.id=r.category_id) \
left join (grammar_subrules s) on (s.id=r.subcategory_id) \
left join (visas corpus) on (corpus.id=m.file_id) \
left join (visas_index  idx) on (idx.file_id=corpus.id) \
left join (select topic, count(1) tot_essays \
from visas_index group by topic) a on (a.topic=idx.topic) \
where essay_set=2	group by corpus.id, category, rule,s.subcategory, s.subsubcategory\
) y on (x.topic=y.topic AND x.category=y.category AND x.rule=y.rule AND y.error_count is not null) "+groupby); break;
            case "category":
                sql = orderCategory(p, sel+groupby); break;
            case "subcategory":
                sql = orderSubcategory(p, sel+'where x.subcategory is not null '+groupby); break;
            case "subsubcategory":
                sql = orderSubsubcategory(p, sel+'where x.subcategory is not null '+groupby); break;
        }
        sql += " ,x.topic";
    }

    sql+=" ;";
    return sql;
}




app.post('/loadMatrixTest', function(req, res) {
    var param = req.body;
    console.log(param);

    console.log("Teste postive");
    res.send({data:[{obj: 1, val:'text'}, {obj: 2, val:'text'}], id:2});
});



app.post('/loadExternalMatrix', function(req, res) {
    var p = req.body;
    print('processing');

    var param = {dataset: p.dataset, level: "rule", orderCol: "alpha", orderRow: "alpha", normal: p.normal};

    var str = createSQL(param);
    print(str);
    var level = param.level;
    query(str, function (data){
        var result = data;
        var tableVal = {};
        var rows;
        var tableTotal = {col:{}, row:{}};
        var array = [];

        if(data.length>0){
            var tree = buildTree(data);
            colName = 'language';
            if(param.dataset=='visas') colName = 'topic';
            var columns = _.uniq(_.map(data, colName));
            var groups = _.groupBy(data, function(value){
                if(param.dataset=='visas') return value.topic;
                return value.language;
            });

            for(var l in columns){
                tableTotal.col[columns[l]]= 0;
                var group = groups[columns[l]];
                rows = _.uniq(_.map(group, level));

                for (var r in rows){
                    //                    tableVal[columns[l]][rows[r]] = {};
                    tableTotal.row[rows[r]] = 0;
                }
                for(var g in group){
                    var obj = {
                        col:columns[l],
                        row: group[g].rule,
                        value: group[g].error_count,
                        error_count: group[g].error_count,
                        file_count:group[g].file_count,
                        rule: group[g].rule,
                        category: group[g].category,
                        subcategory: group[g].subcategory,
                        subsubcategory: group[g].subsubcategory,
                        tot_essays: group[g].tot_essays
                    };
                    switch (level){
                        case "rule": obj.row = group[g].rule; break;
                        case "category": obj.row = group[g].category; break;
                        case "subcategory": obj.row = group[g].subcategory; break;
                        case "subsubcategory": obj.row = group[g].subsubcategory; break;
                        default: obj.row = group[g].rule;
                    };
                    //calculating totals per row and col
                    tableTotal.col[columns[l]]+=obj.value;
                    tableTotal.row[obj.row]+=obj.value;

                    array.push(obj);

                }
            }
            //            print(rows);
            rows = _.uniq(_.map(data, level));
            if(param.orderCol=="value")
                columns = orderVal(tableTotal.col);
            if(param.orderRow=="value")
                rows = orderVal(tableTotal.row);

            result = {cols:columns, rows: rows, table: array, tree: tree, langCount: calcTotalLanguage(data)};
        }else{
            result = "File not found. (DB error)";
        }
        res.setHeader('Cache-Control', 'no-cache');
        res.send(result);
    });
});



//-----------------------
// Main function to load the H-Matrix view
// Used to call the database for data
// -Test: load data from .csv file
var colName;
app.post('/loadMatrix', function(req, res) {
    var param = req.body;
    var str = createSQL(param);

    //    str= "select * from aux_toefl_table
    //    str= "select * from aux_toefl_table where (category='Grammar' AND subcategory not in ('missing possessive marking','missing subordinated clause','double article','infinitive vs. gerund','missing Pronoun','wrong subordinating conjunction','extra article','extra genitive','wrong modal','wrong expression','missing verbal argument','semantic restriction','semantic', '???', 'word order', 'wrong article', 'semantic', 'fragment', 'spelling', 'missing copula', 'missing noun')) OR (category<>'Grammar');";
    //    print(str);

    var level = param.level;
    //    query(str, function (data){
    //    d3.csv('data/aux_toefl_table.csv').then( function (data){
    //    fs.readFile('./data/aux_toefl_table.csv', function(err, data){
    //        if (err) print(err);
    //        console.log(data);

//    print(mx_data.matrix_data);
    var data = mx_data.matrix_data;
    var result = data;
    var tableVal = {};
    var rows;
    var tableTotal = {col:{}, row:{}};
    var array = [];

    if(data.length>0){
        var tree = buildTree(data);
        colName = 'language';
        if(param.dataset=='visas') colName = 'topic';
        var columns = _.uniq(_.map(data, colName));
        var groups = _.groupBy(data, function(value){
            if(param.dataset=='visas') return value.topic;
            return value.language;
        });

        for(var l in columns){
            tableTotal.col[columns[l]]= 0;
            var group = groups[columns[l]];
            rows = _.uniq(_.map(group, level));

            for (var r in rows){
                //                    tableVal[columns[l]][rows[r]] = {};
                tableTotal.row[rows[r]] = 0;
            }
            for(var g in group){
                var obj = {
                    col:columns[l],
                    row: group[g].rule,
                    value: group[g].error_count,
                    error_count: group[g].error_count,
                    file_count:group[g].file_count,
                    rule: group[g].rule,
                    category: group[g].category,
                    subcategory: group[g].subcategory,
                    subsubcategory: group[g].subsubcategory,
                    tot_essays: group[g].tot_essays
                };
                switch (level){
                    case "rule": obj.row = group[g].rule; break;
                    case "category": obj.row = group[g].category; break;
                    case "subcategory": obj.row = group[g].subcategory; break;
                    case "subsubcategory": obj.row = group[g].subsubcategory; break;
                    default: obj.row = group[g].rule;
                };
                //calculating totals per row and col
                tableTotal.col[columns[l]]+=obj.value;
                tableTotal.row[obj.row]+=obj.value;

                array.push(obj);

            }
        }
        //            print(rows);
        rows = _.uniq(_.map(data, level));
        if(param.orderCol=="value")
            columns = orderVal(tableTotal.col);
        if(param.orderRow=="value")
            rows = orderVal(tableTotal.row);

        result = {cols:columns, rows: rows, table: array, tree: tree, langCount: calcTotalLanguage(data)};
    }else{
        result = "File not found. (DB error)";
    }
    res.setHeader('Cache-Control', 'no-cache');
    //        res.send(calculateGscore(result));
    res.send(result);
    //    });
});


//function calculateGscore(data){
//
//
//
//    return data;
//}
//
//function totalCount(data){
//    var totalRule = {};
//    var totalCategory = {};
//    var totalSubegory = {};
//    var totalSubsubtegory = {};
//    var totalLanguage = {};
//    _.forEach(data, function(d, i){
//        totalRule[d.rule] =
//    });
//
//}

function orderVal(total){
    var array=[];
    for(key in total){
        array.push({key: key, value: total[key]});
    }
    array  = _.orderBy(array, 'value', 'desc');
    var lb=[];
    for(o in array){
        lb.push(array[o].key);
    }
    return lb;
}

function calcTotalLanguage(data){
    var aggregate = _(data)
    .groupBy(colName)
    .map((objs, key)=>({
        'column': key,
        'totError': _.sumBy(objs, 'error_count'),
        'totFile': _.sumBy(objs, 'file_count'),
        'sumGScore': 0
    }))
    .value();

    //    print(aggregate);
    var obj = {};
    _.forEach(aggregate, (d, i)=>{
        obj[d.column] = {key: d.column, totError: d.totError, totFile: d.totFile};
    });
    return obj;
}


//This function formats and calculates all the aggregate data for the error category hierarchy

function buildTree(data){
    var uniq = _.uniqBy(data, 'rule');

    var aggregate = _(data)
    .groupBy('rule')
    .map((objs, key)=>({
        'rule': key,
        'totError': _.sumBy(objs, 'error_count'),
        'totFile': _.sumBy(objs, 'file_count'),
        weight : 1,
        order : null
    }))
    .value();

    var filter = _.map(uniq, function(obj){
        return _.assign(obj, _.find(aggregate, {rule: obj.rule}));
    });

    filter = _.sortBy(filter, ['category', 'subcategory', 'subsubcategory']);

    var tree = _.groupBy(filter, function(d){
        return d.category;
    });

    var root = {totError: _.sumBy(filter, 'totError'),
                totFile: _.sumBy(filter, 'totFile'),
                weight: 1};

    // calculate statistics on all categories
    var aggregateCategory = _(filter)
    .groupBy('category')
    .map((objs, key)=>({
        'category': key,
        'totError': _.sumBy(objs, 'totError'),
        'totFile': _.sumBy(objs, 'totFile'),
        weight: 1,
        order:null
    }))
    .value();
    // calculate statistics on all subcateogies
    var aggregateSubcategory = _(filter)
    .groupBy('subcategory')
    .map((objs, key)=>({
        'key': key,
        'totError': _.sumBy(objs, 'totError'),
        'totFile': _.sumBy(objs, 'totFile'),
        weight: 1,
        order:null
    }))
    .value();
    // calculate statistics on all subsubcategories
    var aggregateSubsubcategory = _(filter)
    .groupBy('subsubcategory')
    .map((objs, key)=>({
        'key': key,
        'totError': _.sumBy(objs, 'totError'),
        'totFile': _.sumBy(objs, 'totFile'),
        weight: 1,
        order:null
    }))
    .value();
    // make all grammar nodes without a sub, be part of Other
    var grammar = _.groupBy(tree.Grammar, function(d){
        return (d.subcategory!=null ? d.subcategory : "Other");
    });
    // make all grammar nodes without a sub sub node, be part of Other
    _.forEach(grammar, function(value, key) {
        grammar[key] = _.groupBy(grammar[key], function(d) {
            return (d.subsubcategory!=null ? d.subsubcategory : "Other");
        });
    });

    // get all the children for grammar
    var gramChildren = [];
    _.forEach(grammar, function(value, key){
        var array = [];
        _.forEach(value, function(v, k){
            array.push({name: k, _children: v});
        });
        gramChildren.push({name:key, _children: array});
    });

    // separate out children with and without sub categories
    // also make sure last level nodes are not duplicate
    var nonsub = [], sub = [];
    _.forEach(gramChildren, function(value, key){
        if((value._children.length == 1) && (value.name == value._children[0].name)){
            gramChildren[key]._children = value._children[0]._children;
            nonsub.push(gramChildren[key]);
        }else{
            sub.push(gramChildren[key]);
        }
    });

    gramChildren = [];
    gramChildren = _.concat(sub, nonsub);

    // calculate statistics for all grammar children
    _.forEach(gramChildren, function(obj, key){
        if (obj.name=='Other'){
            var totals = _.find(aggregateSubcategory, {key: 'null'});          }
        else
            var totals = _.find(aggregateSubcategory, {key: obj.name});
        if(totals){
            gramChildren[key].totError = totals.totError;
            gramChildren[key].totFile = totals.totFile;
            gramChildren[key].weight = totals.weight;
        }
        if(gramChildren[key]._children)
            if(gramChildren[key]._children[0]._children)
                _.forEach(gramChildren[key]._children, function(o, k){
                    var tots = _.find(aggregateSubsubcategory, {key: o.name});
                    gramChildren[key]._children[k].totError = tots.totError;
                    gramChildren[key]._children[k].totFile = tots.totFile;
                    gramChildren[key]._children[k].weight = tots.weight;
                });
    });

    // THIS PIECE IS NEW - UNIVERSAL SUB CATEGORIES
    // we need to get all the children for each category, excluding grammar
    var catChildren = {};
    _.forEach(tree, function(value, key){
        if(key!="Grammar") {
            var keyGroup = _.groupBy(value, function(d) {
                return d.subcategory!=null ? d.subcategory : key;
            });
            _.forEach(keyGroup, function(value, key) {
                keyGroup[key] = _.groupBy(keyGroup[key], function(d) {
                    return d.subsubcategory!=null ? d.subsubcategory : key;
                })
            })

            var keyGroupChildren = [];
            _.forEach(keyGroup, function(val, k){
                var array = [];
                _.forEach(val, function(v, j){
                    array.push({name: j, _children: v});
                });
                keyGroupChildren.push({name:k, _children: array});
            });
            if(keyGroupChildren.length==1 && keyGroupChildren[0].name == key) {
                keyGroupChildren = keyGroupChildren[0]._children;
            }
            if(typeof(catChildren[key])=="undefined") {
                catChildren[key] = [];
            }
            catChildren[key].push({name:key, _children: keyGroupChildren});   
        }
    });
    _.forEach(catChildren, function(val, k){
        var newNonSub = [], newSub = [];
        _.forEach(val, function(value, key) {
            if((value._children.length == 1) && (value.name == value._children[0].name)){
                catChildren[k][key]._children = value._children[0]._children;
                newNonSub.push(catChildren[k][key]);
            }else{
                //                print(catChildren[k][key])
                for(var i=0; i<catChildren[k][key]._children.length;i++) {
                    var child = catChildren[k][key]._children[i];
                    if(child._children.length == 1 && child.name == child._children[0].name) {
                        catChildren[k][key]._children[i] = child._children[0];
                    }
                }
                newSub.push(catChildren[k][key]);
            }  
        })
        catChildren[k] = [];
        catChildren[k] = _.concat(newSub, newNonSub);
        _.forEach(catChildren[k], function(obj, key){
            if (obj.name==k){
                var totals = _.find(aggregateSubcategory, {key: 'null'});          }
            else
                var totals = _.find(aggregateSubcategory, {key: obj.name});
            if(totals){
                catChildren[k][key].totError = totals.totError;
                catChildren[k][key].totFile = totals.totFile;
                catChildren[k][key].weight = totals.weight;
            }
            if(catChildren[k][key]._children.length > 0)
                if(catChildren[k][key]._children[0]._children)
                    _.forEach(catChildren[k][key]._children, function(o, j){
                        var tots = _.find(aggregateSubsubcategory, {key: o.name});
                        if(tots) {
                            catChildren[k][key]._children[j].totError = tots.totError;
                            catChildren[k][key]._children[j].totFile = tots.totFile;
                            catChildren[k][key]._children[j].weight = tots.weight;   
                        }
                    });
        });
    });


    var uniqCategory = _.uniqBy(data, 'category').map((d)=>d.category);
    //    console.log(uniqCategory);
    // build tree
    var result = {name:"Errors", children: [], totError: root.totError, totFile: root.totFile, weight: root.weight};

    _.forEach(tree, function(value, key){
        var totals = _.find(aggregateCategory, {category: key});
        if(key == "Grammar") {
            //            print(gramChildren)
            result.children.push({name:key, _children: gramChildren, totError: totals.totError, totFile: totals.totFile, ix: uniqCategory.indexOf(key), weight: totals.weight, order:null});
        } else {
            // for whatever reason, our data structure got all messy
            // so we have to go into the children of the array
            if(catChildren[key][0]._children[key]) {
                result.children.push({name:key, _children: value, totError: totals.totError, totFile: totals.totFile, ix: uniqCategory.indexOf(key), weight: totals.weight, order:null});
            } else {
                result.children.push({name:key, _children: catChildren[key][0]._children, totError: totals.totError, totFile: totals.totFile, ix: uniqCategory.indexOf(key), weight: totals.weight, order:null});    
            }
        }
    });

    // make sure grammar appears first


    for(key in result.children){
        // print(result.children[key].name);
        if(result.children[key].name=="Grammar" && key!=0){
            var grammar = result.children[key];
            result.children[key] = result.children[0];
            result.children[0] = grammar;
            //            break;
        }
        if(result.children[key].name=="Orthography" && key!=1){
            var grammar = result.children[key];
            result.children[key] = result.children[1];
            result.children[1] = grammar;
            //            break;
        }
        if(result.children[key].name=="Style" && key!=2){
            var grammar = result.children[key];
            result.children[key] = result.children[2];
            result.children[2] = grammar;
            //            break;
        }

    }
    // print(result);
    return result;
}


//-------------------------- Script Code ------------------------------
// Below there are scripts used for converting data and inserting into the DB
//---------------------------------------------------------------------

var stopwords=[];
function loadStopWord(){
    fs.readFile("stopword.txt","utf8", function(err, d){
        return d;
    });
}

var styleFeatureData;
app.post('/saveStyleFeature', function(req, res) {
    var styleFeatureData = req.body;
    //    console.log(styleFeatureData);

    console.log("Teste postive");
    res.send({data:[{obj: 1, val:'text'}, {obj: 2, val:'text'}], id:2});
});

app.get('/print', function(req, res) {
    print(styleFeatureData);
    res.send(styleFeatureData);
});

app.get('/countTerms', function(req, res) {
    loadStopWord();
});

function countTermUsage(essays){

    for(i in essays){
        var essay = essays[i];
        //count the keywords in text and add to the obj
        saveCount(essay);
    }
}

function saveCount(essay){
    var str = "INSERT ";
    var param = [essay.id, essay.dataset, essay.count];
    queryP(str, param, function(res){
        return;
    });
}

function addNumberMatches(id, errors, corpora){
    if (corpora==0)
        var str = "UPDATE icle SET error=? where id=?";
    else if (corpora==1)
        var str = "UPDATE toefl SET error=? where id=?";
    else if (corpora==2)
        var str = "UPDATE visas SET error=? where id=?";
    var param = [errors,id];
    var data = queryP(str, param, function(data){
        return data;
    });
}

function verifyMatches(id, errors, corpora, callback){

    if(corpora==0){
        query("UPDATE icle INNER JOIN (select file_id, count(1) as err from error_matches where essay_set=0 group by file_id)  as b ON b.file_id = icle.id SET icle.auto_error = b.err;", function(res){
            var str = "select auto_error as count from icle where id=?";
            var param = [id];
            queryP(str, param, function(data){
                var count = data[0].count;
                var result = null;
                if (count==null || parseInt(count)!=parseInt(errors.length)) {
                    result = {
                        id: id,
                        data: errors
                    };
                }
                //        print(errors+" count "+count+" res "+result);
                callback(result);
            });

        });}else if (corpora ==1){
            query("UPDATE toefl INNER JOIN (select file_id, count(1) as err from error_matches where essay_set=1 group by file_id)  as b ON b.file_id = toefl.id SET toefl.auto_error = b.err;", function(res){
                var str = "select auto_error as count from toefl where id=?";
                var param = [id];
                queryP(str, param, function(data){
                    var count = data[0].count;
                    var result = null;
                    if (count==null || parseInt(count)!=parseInt(errors.length)) {
                        result = {
                            id: id,
                            data: errors
                        };
                    }
                    //        print(errors+" count "+count+" res "+result);
                    callback(result);
                });

            });
        } else if(corpora==2){
            query("UPDATE visas INNER JOIN (select file_id, count(1) as err from error_matches where essay_set=2 group by file_id)  as b ON b.file_id = visas.id SET visas.auto_error = b.err;", function(res){
                var str = "select auto_error as count from visas where id=?";
                var param = [id];
                queryP(str, param, function(data){
                    var count = data[0].count;
                    var result = null;
                    if (count==null || parseInt(count)!=parseInt(errors.length)) {
                        result = {
                            id: id,
                            data: errors
                        };
                    }
                    //        print(errors+" count "+count+" res "+result);
                    callback(result);
                });

            });
        }

}

app.get('/database', function(req, res) {
    // make sure we can't call this hook again if it is already running
    if(running_script) {
        return;
    } else {
        running_script = true;
    }
    var str= 'select icle.id as id, content from icle  WHERE (icle.error is NULL) OR ((icle.auto_error is NULL) OR (icle.error<>icle.auto_error)) AND (icle.error<>0) ';
    var errors = "AND (icle.id not in (119,646,647,648,649))";
    var data = query(str+errors, function(data){
        res.setHeader('Cache-Control', 'no-cache');
        var rows = [];
        for (i in data){
            row = {};
            var buffer = new Buffer(data[i]["content"]);
            row.text = buffer.toString("utf8").replace("<(.)+>","");
            row.id = data[i]["id"];
            rows.push(row);
        }
        var notUsed = [];
        print("got data from db");
        //                for(i in rows){
        i = 0;
        var n = 0;
        //        i=3;
        var bytes_sent = 0, throttle_times = 1, throttle_n = 60;
        var file_size_limit = 45000;
        var failed = false, waiting = false;
        var done = {};
        var loop_interval = setInterval(function() {
            var file_size = byteCount(rows[i].text);
            if (bytes_sent < file_size_limit) {
                if(waiting) {
                    waiting = false;
                    print("continuing now ...");
                }
                var strText = rows[i].text.replace(/<(.)+>/,"");
                if(file_size>file_size_limit || strText.length > 20000){
                    // skip files that exceed our file size limit or length limit
                    notUsed.push(rows[i].id);
                    print("Not requested file:" + notUsed);
                    i++; // try the next file instead
                }else{
                    // search for next file that has not been requested already
                    while(rows[i].id in done) {
                        i++;
                    }
                    done[rows[i].id] = "1";
                    bytes_sent += file_size;
                    requestMatches(strText, rows[i].id, function(throttle) {
                        // we failed, make sure we wait
                        // so we do not get throttled permanently
                        if(throttle) {
                            bytes_sent = file_size_limit;
                            print("throttle limit reached " + throttle_times);
                            // if we fail multiple times in a row
                            // progressively increase wait time by 50%
                            throttle_times += 0.5;
                            throttle_n = throttle_n * throttle_times;
                        } else {
                            // reset progressive wait time
                            throttle_times = 1;
                            throttle_n = 60;
                        }
                    });
                }
            } else {
                if(!waiting) {
                    waiting = true;
                    print("waiting ... " + (n % throttle_n));
                }
            }

            if((n % throttle_n) == 0) {
                bytes_sent = 0;
            }
            if(i==rows.length) {
                clearInterval(loop_interval);
                print("Not requested end:" + notUsed);
            }
            n++;
        }, 1000);

        //        print("Not requested:" + notUsed);
    });
});

var folder = "Buffer/";

app.get('/APIrequestTest', function(req, res) {

    // make sure we can't call this hook again if it is already running
    if(running_script) {
        return;
    } else {
        running_script = true;
    }
    var str= 'select id, content from toefl';
    //    var str= 'select id, content from toefl  WHERE (error is NULL) OR ((auto_error is NULL) OR (error<>auto_error)) AND (error<>0) ';
    var errors = "AND (id not in (119,646,647,648,649))";
    var data = query(str, function(data){
        res.setHeader('Cache-Control', 'no-cache');
        var rows = [];
        for (i in data){
            row = {};
            var buffer = new Buffer(data[i]["content"]);
            row.text = buffer.toString("utf8").replace("<(.)+>","");
            row.text = row.text.trim();
            row.id = data[i]["id"];
            rows.push(row);
        }
        var corpora = 1;
        var notUsed = [];
        var exist = [];
        print("got data from db");
        //                for(i in rows){
        i = 0;
        var n = 0;
        //        i=3;
        var bytes_sent = 0, throttle_times = 1, throttle_n = 60;
        var file_size_limit = 45000;
        var failed = false, waiting = false;
        var done = {};
        var loop_interval = setInterval(function() {
            var file_size = byteCount(rows[i].text);
            if (bytes_sent < file_size_limit) {
                if(waiting) {
                    waiting = false;
                    print("continuing now ...");
                }
                var strText = rows[i].text.replace(/<(.)+>/,"");
                let fileExists = false;
                try {
                    if (fs.existsSync(folder+rows[i].id+".json")) {
                        //file exists
                        fileExists = true;
                    }
                } catch(err) {
                    console.error(err)
                }
                if(file_size>file_size_limit || strText.length > 20000 || fileExists){
                    // skip files that exceed our file size limit or length limit
                    notUsed.push(rows[i].id);
                    exist.push(rows[i].id);
                    print("Not requested file:" + notUsed);
                    print("Exists file:" + exist);
                    i++; // try the next file instead
                }else{
                    // search for next file that has not been requested already
                    while(rows[i].id in done) {
                        i++;
                    }
                    done[rows[i].id] = "1";
                    bytes_sent += file_size;
                    requestMatches(strText, rows[i].id, corpora, function(throttle) {
                        // we failed, make sure we wait
                        // so we do not get throttled permanently
                        if(throttle) {
                            bytes_sent = file_size_limit;
                            print("throttle limit reached " + throttle_times);
                            // if we fail multiple times in a row
                            // progressively increase wait time by 50%
                            throttle_times += 0.5;
                            throttle_n = throttle_n * throttle_times;
                        } else {
                            // reset progressive wait time
                            throttle_times = 1;
                            throttle_n = 60;
                        }
                    });
                }
            } else {
                if(!waiting) {
                    waiting = true;
                    print("waiting ... " + (n % throttle_n));
                }
            }

            if((n % throttle_n) == 0) {
                bytes_sent = 0;
            }
            if(i==rows.length) {
                clearInterval(loop_interval);
                print("Not requested end:" + notUsed);
            }
            n++;
        }, 1000);

        //        print("Not requested:" + notUsed);
    });
});

app.get('/databaseTOEFL', function(req, res) {
    // make sure we can't call this hook again if it is already running
    if(running_script) {
        return;
    } else {
        running_script = true;
    }
    var str= 'select id, content from toefl  WHERE (error is NULL) OR ((auto_error is NULL) OR (error<>auto_error)) AND (error<>0) ';
    //    var str= 'select id, content from toefl  WHERE (error is NULL) OR ((auto_error is NULL) OR (error<>auto_error)) AND (error<>0) ';
    var errors = "AND (id not in (119,646,647,648,649))";
    var data = query(str, function(data){
        res.setHeader('Cache-Control', 'no-cache');
        var rows = [];
        for (i in data){
            row = {};
            var buffer = new Buffer(data[i]["content"]);
            row.text = buffer.toString("utf8").replace("<(.)+>","");
            row.text = row.text.trim();
            row.id = data[i]["id"];
            rows.push(row);
        }
        var corpora = 1;
        var notUsed = [];
        print("got data from db");
        //                for(i in rows){
        i = 0;
        var n = 0;
        //        i=3;
        var bytes_sent = 0, throttle_times = 1, throttle_n = 60;
        var file_size_limit = 45000;
        var failed = false, waiting = false;
        var done = {};
        var loop_interval = setInterval(function() {
            var file_size = byteCount(rows[i].text);
            if (bytes_sent < file_size_limit) {
                if(waiting) {
                    waiting = false;
                    print("continuing now ...");
                }
                var strText = rows[i].text.replace(/<(.)+>/,"");
                if(file_size>file_size_limit || strText.length > 20000){
                    // skip files that exceed our file size limit or length limit
                    notUsed.push(rows[i].id);
                    print("Not requested file:" + notUsed);
                    i++; // try the next file instead
                }else{
                    // search for next file that has not been requested already
                    while(rows[i].id in done) {
                        i++;
                    }
                    done[rows[i].id] = "1";
                    bytes_sent += file_size;
                    requestMatches(strText, rows[i].id, corpora, function(throttle) {
                        // we failed, make sure we wait
                        // so we do not get throttled permanently
                        if(throttle) {
                            bytes_sent = file_size_limit;
                            print("throttle limit reached " + throttle_times);
                            // if we fail multiple times in a row
                            // progressively increase wait time by 50%
                            throttle_times += 0.5;
                            throttle_n = throttle_n * throttle_times;
                        } else {
                            // reset progressive wait time
                            throttle_times = 1;
                            throttle_n = 60;
                        }
                    });
                }
            } else {
                if(!waiting) {
                    waiting = true;
                    print("waiting ... " + (n % throttle_n));
                }
            }

            if((n % throttle_n) == 0) {
                bytes_sent = 0;
            }
            if(i==rows.length) {
                clearInterval(loop_interval);
                print("Not requested end:" + notUsed);
            }
            n++;
        }, 1000);

        //        print("Not requested:" + notUsed);
    });
});


app.get('/databaseVISAS', function(req, res) {
    // make sure we can't call this hook again if it is already running
    if(running_script) {
        return;
    } else {
        running_script = true;
    }
    //    var str= 'select id, content from visas  WHERE id=109';
    var str= 'select id, content from visas  WHERE (error is NULL) OR ((auto_error is NULL) OR (error<>auto_error)) AND (error<>0) ';
    var errors = "";
    var errors = "AND (id in (1))";

    //    var errors = "AND (id not in (1,2,23,39,53,67,68,69,70,71,72,76,82, 83, 96, 100, 104))";
    var data = query(str+errors, function(data){
        res.setHeader('Cache-Control', 'no-cache');
        var rows = [];
        for (i in data){
            row = {};
            var buffer = new Buffer(data[i]["content"]);
            row.text = buffer.toString("utf8").replace("<(.)+>","");
            row.text = row.text.trim();
            row.id = data[i]["id"];
            rows.push(row);
        }
        var corpora = 2;
        var notUsed = [];
        print("got data from db");
        //        console.log(rows);
        //                for(i in rows){
        i = 0;
        var n = 0;
        //        i=3;
        var bytes_sent = 0, throttle_times = 1, throttle_n = 60;
        var file_size_limit = 45000;
        var failed = false, waiting = false;
        var done = {};
        print(rows);
        var loop_interval = setInterval(function() {
            if (rows.length<=i) return;
            var file_size = byteCount(rows[i].text);
            if (bytes_sent < file_size_limit) {
                if(waiting) {
                    waiting = false;
                    print("continuing now ...");
                }
                var strText = rows[i].text.replace(/<(.)+>/,"");
                if(file_size>file_size_limit || strText.length > 20000){
                    // skip files that exceed our file size limit or length limit
                    notUsed.push(rows[i].id);
                    print("Not requested file:" + notUsed);
                    i++; // try the next file instead
                    if (rows.length<=i) return;
                }else{
                    // search for next file that has not been requested already

                    while(rows[i].id in done) {
                        i++;
                        if (rows.length<=i) return;
                    }
                    done[rows[i].id] = "1";
                    bytes_sent += file_size;
                    requestMatches(strText, rows[i].id, corpora, function(throttle) {
                        // we failed, make sure we wait
                        // so we do not get throttled permanently
                        if(throttle) {
                            bytes_sent = file_size_limit;
                            print("throttle limit reached " + throttle_times);
                            // if we fail multiple times in a row
                            // progressively increase wait time by 50%
                            throttle_times += 0.5;
                            throttle_n = throttle_n * throttle_times;
                        } else {
                            // reset progressive wait time
                            throttle_times = 1;
                            throttle_n = 60;
                        }
                    });
                }

            } else {
                if(!waiting) {
                    waiting = true;
                    print("waiting ... " + (n % throttle_n));
                }
            }

            if((n % throttle_n) == 0) {
                bytes_sent = 0;
            }
            if(i==rows.length) {
                clearInterval(loop_interval);
                print("Not requested end:" + notUsed);
            }
            n++;
        }, 1000);

        //        print("Not requested:" + notUsed);
    });
});


function byteCount(s) {
    return encodeURI(s).split(/%..|./).length - 1;
}

function requestMatches(essay, essayID, corpora, callback){
    //        print(essay);
    var str='https://languagetool.org/api/v2/check';
    //    print(str);
    var formData = {
        text : essay,
        language : 'en',
        enabledOnly : false
    };
    //    print(str);
    request.post({url:str, form: formData}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return;
            //            throw err;
        }
        var data;
        try {
            data = JSON.parse(body)
        } catch(err) {
            print("Could not parse " + essayID + ": " + body);
            callback(true);
            return;
        }
        //        print(data);
        fs.appendFile(folder+essayID+'.json', JSON.stringify(data), function (err) {
            if (err) throw err;
            print("Saved matches for: " + essayID);
            //            console.log('File is created successfully.');
        });
        //        addNumberMatches(essayID, data.matches.length, corpora);
        //        verifyMatches(essayID, data.matches, corpora, function(result) {
        //            if(result==null) {
        //                print("Don't need this: " + essayID);
        //                return
        //            }
        //            for(i in result.data){
        //                var error = result.data[i];
        //                var cat = saveErrorCategory(error, error.rule.category, result.id, corpora);
        //            }

        callback(false);
        //    });
    });

}



function getCategoryID(cat, error, essayID, corpora){
    //    print("getCategoryID");
    var str = 'SELECT id FROM error_category where text_id like "%'+cat.id+'%" AND name like "%'+cat.name+'";';
    //    print(str);
    query(str, function (data){
        //        return(data.insertId);
        //        print(data);
        saveErrorRule(error.rule, data[0].id, essayID, error, corpora);
    });

}


function getErrorRuleID(rule, category, essayID, error, corpora){
    //    print("getErrorRuleID");
    var str = 'SELECT id FROM error_rule where text_id like ? AND description like ? AND issue_type like ? AND category_id=?;';
    //    print(str);
    queryP(str,[rule.id,rule.description, rule.issueType, category], function (data){
        //        return(data.insertId);
        //        print(data);
        saveError(error, data[0].id, essayID, corpora);
    });

}

function saveErrorCategory(error, cat, essayID, corpora){
    //        print("saveErrorCategory");
    var str = 'INSERT IGNORE INTO error_category (text_id, name) VALUES (?,?);';
    //    print(str);
    //    print("\n\n" +cat);
    queryP(str,[cat.id,cat.name], function (data){
        var catID=0;
        if(data.affectedRows>0){
            catID = data.insertId;
            var rule = saveErrorRule(error.rule, catID, essayID, error, corpora);
        }
        else{
            catID = getCategoryID(error.rule.category, error, essayID, corpora);
        }
    });

}

function saveErrorReplacement(rule_id, file, context, text, corpora){
    //        print("saveErrorReplacements");
    //    print("\n here\n"+error +"  "+text);
    var strError = "select id from error_matches where rule_id=? and file_id=? and context_text like ? and essay_set=?";
    queryP(strError, [rule_id, file, context, corpora], function(res){
        //        print(res[0].id);
        //        print(text[0].value);
        for(i=0;i<text.length;i++){
            var str = 'INSERT INTO error_replacement (error_id, text) VALUES (?,?);';
            //        print(str);
            queryP(str,[res[0].id, text[i].value], function (data){
                //           print("inside");
                return(data);
            });
        }
    });


}


function saveErrorRule(rule, category, essayID, error, corpora){
    //    print("saveErrorRule");
    var str = 'INSERT IGNORE INTO error_rule (text_id, description, issue_type, category_id) VALUES (?,?,?,?);';
    //    print(str);
    queryP(str,[rule.id,rule.description,rule.issueType,category], function (data){
        if(data.affectedRows>0)
            var match = saveError(error, data.insertId, essayID, corpora);
        else
            getErrorRuleID(rule, category, essayID, error, corpora);
    });
}

function saveError(err, rule_id, file, corpora){
    var str = "INSERT IGNORE INTO error_matches (message, short_message, offset, length, context_text, context_offset, context_length, sentence, rule_id, file_id, essay_set) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    var param = [err.message, err.shortMessage, err.offset, err.length, err.context.text, err.context.offset, err.context.length, err.sentence, rule_id, file, corpora];
    //    print(param);
    queryP(str, param, function (data){
        //        print(""+err.replacements);
        if (err.replacements.length>0){

            saveErrorReplacement(rule_id, file, err.context.text, err.replacements, corpora);

        }
        return(data);
    });
}
var port = 8080;

app.listen(port);
print("Listening to port "+port);
