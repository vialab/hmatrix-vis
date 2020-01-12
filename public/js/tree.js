//goog.provide('visas.Matrix');

//function Matrix(_table, _margin, _maxRowLabel, _normal){
//global variables
var cluster, svg, table, margin, maxRowLabel, root, max, min, colorScale;
//var d3slider = d3slider.d3slider;
var globalNormal = d3.scale.log().domain([0, 36]).range([0, 1]), normal;
var duration = 2000, rowHeight = 14;
var widthRow, displayVal = "gscore";
var start_color = 'seashell',
    end_color = '#1f1b84'; 
var cellSize = 10;
var colors = [start_color, end_color];
var circleRadius = 6;
var alpha = true;
var diagonal = d3.svg.diagonal()
.projection(function(d) { return [d.y, d.x]; });
var c20 = d3.scale.ordinal()
.range(['#e377c2', '#ff7f0e', '2ca02c', '#9467bd', '#bcbd22', '#8c564b']);
//var c20 = d3.scale.category10();
var valColumns = [], APIURL= "", $http;
var savedSelectedCells = new Set(), widthCategory = 200, categoryLevels = 2;
var treeWidth = 900;
//var treeWidth = widthCategory * categoryLevels;
var selectedColLang = "", colorScheme = "divergent", dict = {}, maxDepth=1;
// var color_divergent = d3.scaleSequential(d3.interpolatePuOr)
//         .domain([-1, 1]);
//indexing functions
function key(d){
    return d.name ? d.name : d.rule;
}

function keyLink(d){
    var source = d.source.name ? d.source.name : d.source.rule;
    var target = d.target.name ? d.target.name : d.target.rule;
    return source+'-'+target;
}

function strokeWidth(d){
    var width = (4*d.source.weight);
    return width+"px";
}

function colorLink(d){
    var category = d.source;
    if(category.depth==0) return "#ddd";
    while(category.depth!=1) category=category.parent;
    // console.log(category);
    return c20(category.name);
}

function keyCell(d){
    return d.row+'-'+d.col;
}

//---------------------MAIN FUNCTION---------------------------------

function drawTree(_table, _margin, _maxRowLabel, _normal, _APIURL){
    var width = treeWidth,
        height = _table.tree.children.length*rowHeight;
    //        height = _table.rows.length*rowHeight;
    console.log("top");
    normal = _normal;
    table = _table;
    margin = _margin;
    APIURL = _APIURL;
    // $http = _$http;

    table.cols = _.sortBy(table.cols);
    min = 0;
    max= 36;


    console.log("inside");

    colorScale = d3.scale.log()
        .domain([min, max])
        .range(colors).base(10);

    maxRowLabel = _maxRowLabel;

    $('#mainSVG').attr('height', height + 450);

    var tree = table.tree;
    cluster = d3.layout.cluster()
        .size([height, width - 160])
        .separation(function(a,b){
        return 1;
    });

    var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y-100, d.x]; });

    svg = d3.select("#mainSVG")
        .append("g")
        .attr("id", "tree")
        .attr("transform", "translate(40,"+margin.top+")");

    root = tree;

    var nodes = cluster.nodes(root),
        links = cluster.links(nodes);


    var grammar = -1;
    nodes.forEach((d)=>{ 
        if((d.children!=null)){ //not a leaf
            if(key(d)=="Errors"){
                grammar = d.y+200;
                //                d.y = -100;
            }
            //            if(key(d)=="Grammar")
            //                grammar=d.y;
            if(d.children[0].children==null)
                d.y += 100; 
            if(d.parent==root)
                if(grammar!=-1)
                    d.y = grammar;
        }       
    });

    let link_levels = [];
    for(let i=0; i < links.length; i++) {
        if(!link_levels.includes(links[i].source.y)) {
            link_levels.push(links[i].source.y);
        } 
        if(!link_levels.includes(links[i].target.y)) {
            link_levels.push(links[i].target.y);
        }
    }
    let sorted_levels = {};
    link_levels = link_levels.sort(function(a,b) { return b-a; });
    for(let i=0; i<link_levels.length; i++) {
        sorted_levels[link_levels[i]] = i+1;
    }

    var link = svg.selectAll(".link")
    .data(links, keyLink)
    .enter().append("path")
    .attr("class", "link")
    .style("stroke", (d)=>colorLink(d))
    .style("stroke-width", (d)=>strokeWidth(d))
    .attr("d", function(d) {
        let s = d.source
        , t = d.target;
        //            console.log(d);
        return customDiagonal(s,t,sorted_levels);
    })
    .on("mouseover", function(d){
        unhighlight();
        highlightFamily(d.target);
    })
    .on("mouseout", function(d){        
        unhighlight();
    });

    var node = svg.selectAll(".node")
    .data(nodes, key)
    .enter().append("g")
    .attr("class", "node")
    .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
    .on("mouseover", function(d){
        showSlider(d);
        unhighlight();
        highlightFamily(d);
    })
    .on("mouseout", function(d){
        unhighlight();
        mouseExit = true;
        hideSlider();
    })
    .on("dblclick", function(d){(d.children) ? null : dblClick(d)});

    //    node.each((d)=>{console.log(d); createSlider(d);});

    widthRow = (18+maxRowLabel) + (cellSize+1)*table.cols.length;
    calculateMaxMinColumns();
    createRowsAndCells(node);
    createNodeCircle(node);
    appendNodeText(node); 
    bindRightClickMenu(node);
    //    nodeOverview();
    //    callback();
    recalculateScoreScale();
    //    createHeader(svg);   

    d3.select(self.frameElement).style("height", height + "px"); 

}

function reorderRowsCol(col){
    console.log(col);
    var nodeUpdate = d3.selectAll('.node').filter((d)=>{return (d.children) ? false : true;});


    var colCells = d3.selectAll('.cell').filter((d)=>{return d.col==col;}).data();
    colCells = _.sortBy(colCells.map((d)=>d.normal));

    var t = d3.selectAll('.node').filter((d)=>{return (d.children) ? false : 
    true;}).data();

    t.forEach((d)=>{
        var cData = d3.selectAll('.cell').filter((r)=>{return r.col==col ? (r.row==key(d) ? true : false): false}).data(); 

        d.order = cData[0] ? cData[0].normal : -1;
    });

    var nodeX = _.sortBy(d3.selectAll('.node').filter((d)=>{return (d.children) ? false : true;}).data().map((d)=>d.x));

    var dataUpdate = _.orderBy(t, 'order', 'desc'); 
    //    var dataUpdate = _.orderBy(d3.selectAll('.node').filter((d)=>{return (d.children) ? false : true;}).data(), 'sumGscore', 'desc');
    var pair = {};

    dataUpdate.forEach((d,i)=>{pair[d.x] = nodeX[i]; d.x=nodeX[i];}); 

    var link = d3.selectAll("path.link")
    .filter((d)=>d.target.children ? false : true)[0];
    //    console.log(pair);

    var links = d3.selectAll(link).each((d,i)=>{         
        var val = _.filter(dataUpdate, {rule: d.target.rule});  
        if (val.length==0) var val = _.filter(dataUpdate, {name: d.target.name});
        d.target.x = val[0].x;               
    });


    nodeUpdate.selectAll('rect').remove();
    nodeUpdate.selectAll('circle').remove();
    nodeUpdate.selectAll('text').remove();
    nodeUpdate.selectAll('.cell').remove();
    nodeUpdate.selectAll('g').remove();
    unhighlight();    

    createRowsAndCells(nodeUpdate);  
    createNodeCircle(nodeUpdate);
    appendNodeText(nodeUpdate);
    bindRightClickMenu(nodeUpdate);

    nodeUpdate.transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; }); 


    links.transition()
        .duration(duration)
        .attr("d", diagonal);
    links.classed('rank', true);


    recalculateScoreScale();
    //    links.attr('stroke-opacity', '0.05');

    //    nodeOverview();
}

function returnMaxMinScore(cells){
    var score = [];    
    var weight = getHierarchicalWeight(d3.selectAll('.node').filter((r)=>key(r)==(cells[0] ? cells[0].row : cells.row)).data()[0]);

    _.forEach(cells, function(d, i){          
        // score.push(weight*d.gscore);
        switch(displayVal){
            case "gscore":
                score.push(weight*d.gscore);
                break;
            case "freq":
                score.push(weight*d.error_count);
                break;
        }
        //        score.push(weight*d.gscore);
    });    
    return { min: d3.min(score), max: d3.max(score)};    
}

function returnMaxMinScoreGlobal(cells){
    var score = [];        
    _.forEach(cells, function(d, i){
        var leaf = d3.selectAll('.node').filter((r)=>key(r)==d.row).data()[0];
        var famWeight = getHierarchicalWeight(leaf)*leaf.weight;
        switch(displayVal){
            case "gscore":
                score.push(famWeight*d.gscore);
                break;
            case "freq":
                score.push(famWeight*d.error_count);
                break;
        }

    });    
    return { min: d3.min(score), max: d3.max(score)};     
}



function returnColorScale(cell, cells=[]){ 
    var nodeLeaf = d3.selectAll('.node').filter((d)=>key(d)==cell.row).data()[0];
    //    console.log(nodeLeaf);
    var familyWeight = getHierarchicalWeight(nodeLeaf)*nodeLeaf.weight;   
    var cellDisplayVal = cell.gscore;
    switch(displayVal){
        case "gscore":
            cellDisplayVal = cell.gscore;
            break;
        case "freq":
            cellDisplayVal = cell.error_count;
            break;
    }

    switch(normal){
        case "global":  
            cell.wscore = familyWeight*cellDisplayVal;
            cell.normal = globalNormal(cell.wscore);
            //            console.log(cell.wscore);
            //            return colorScale(familyWeight*globalNormal(cell.gscore)); break;
            if(colorScheme=='divergent')        
                return colorScale((globalNormal(cell.wscore) * (cell.expect<0 ? -1 : 1)));            
            return colorScale(globalNormal(cell.wscore)); 
            break;
        case "none":  
            cell.wscore = familyWeight*cellDisplayVal;
            cell.normal = familyWeight*cellDisplayVal;            
            return colorScale(familyWeight*cellDisplayVal); break;
        case "row":
            //            console.log(cells);
            cell.wscore = familyWeight*cellDisplayVal;
            cell.normal = familyWeight*cellDisplayVal;
            if(familyWeight!=0){
                if(cells.length<=0)
                    cells = d3.selectAll('.cell').filter((d)=> {return(d.row==cell.row);}).data();
                var val = returnMaxMinScore(cells); 
                var scale = d3.scale.linear().domain([val.min, val.max]).range([0, 1]); 
                cell.normal = scale(cell.wscore);
                if(colorScheme=='divergent')  
                    return colorScale((scale(cell.wscore) * (cell.expect<0 ? -1 : 1))); 
                return colorScale(scale(cell.wscore));
            } else {

                return colorScale(cell.wscore);
            } break;  
        case "column":  
            cell.wscore = familyWeight*cellDisplayVal;
            cell.normal = familyWeight*cellDisplayVal;
            if(familyWeight==0){
                //                calculateMaxMinColumns();                
                return colorScale(cell.wscore);      
                break;
            }
            var scale = d3.scale.linear().domain([valColumns[cell.col].min, valColumns[cell.col].max]).range([0, 1]);
            cell.normal = scale(cell.wscore);
            if(colorScheme=='divergent')  
                return colorScale((scale(cell.wscore) * (cell.expect<0 ? -1 : 1))); 
            return colorScale(scale(cell.wscore)); break;        
    }
}

function getMaxMinScoreColumn(col){
    var cells = d3.selectAll('.cell').filter((d)=> {return(d.col==col);}).data();

    var score = [];    

    _.forEach(cells, function(d, i){             
        var node = d3.selectAll('.node').filter((r)=>key(r)==d.row).data()[0];
        var weight = getHierarchicalWeight(node)*(node.weight); 
        //        score.push(getHierarchicalWeight(d3.selectAll('.node').filter((r)=>key(r)==d.row).data()[0])*d.gscore);
        switch(displayVal){
            case "gscore":
                score.push(weight*d.gscore);
                break;
            case "freq":
                score.push(weight*d.error_count);
                break;
        }

    });  

    return { min: d3.min(score), max: d3.max(score)};    
    //    return returnMaxMinScoreGlobal(cells.data());
}


function calculateMaxMinColumns(){
    _.forEach(table.cols, (col,i)=>{        
        valColumns[col] = getMaxMinScoreColumn(col);;
    });
}

function calculateRowGScore(node, d){
    var cells = d3.select(node).selectAll(".cellg")
    .data(table.table.filter((r)=>{ return r.row==d.rule; }))
    .enter()
    .append("rect")
    .attr('class', 'cell')
    .attr("x", function(r, ri) {
        return (cellSize+1)*table.cols.indexOf(r.col); })
    .attr("y", 0)
    .attr("width", cellSize)
    .attr("height", cellSize);

    cells.style("fill", function(r) {            
        var gscore = gScore(r.error_count, d.totError, countOtherLang(r.col), table.langCount[r.col].totError); 
        r.gscore = gscore.G;
        r.expect = gscore.expect;
        //        console.log(cells.data());
        //        console.log(returnColorScale(r, cells.data()));
        //        return "red"; 
        return returnColorScale(r, cells.data()); 
    })
        .on("click", (d)=>selectCell(d))
        .on("mouseover", function(d){
        d3.selectAll(".colLabel").classed("text-highlight",function(c,ci){             
            return ci==(table.cols.indexOf(d.col));
        });
        d3.select("#tooltip_matrix")
            .style("width","200px")            
            .style("left", (d3.event.pageX+10) + "px")            
            .style("top", (d3.event.pageY-100) + "px")
            .style("white-space", "pre-line")
            .select("#value")        
            .text("Error: "+d.row+" \n Column: "+d.col+"  \n Error count:"+d.value.toFixed(2)+" \n G-score:"+d.gscore.toFixed(2)+(d.wscore ? " \n Weighted score:"+d.wscore.toFixed(4) : "")+" \n Normalized score: "+d.normal.toFixed(2)+" \n Expectation:"+d.expect.toFixed(2)); 
        //Show the tooltip
        d3.select("#tooltip_matrix").classed("hidden", false);
    })
        .on("mouseout", function(){
        d3.select(this).classed("cell-hover",false);
        d3.selectAll(".row").classed("text-highlight",false);
        d3.selectAll(".colLabel").classed("text-highlight",false);        
        d3.select("#tooltip_matrix").classed("hidden", true);
        d3.selectAll(".node").classed("text-highlight",false);
    });
    //    recalculateScoreScale();
}




function createRowsAndCells(node){
    node.filter((d)=>{return (d.children) ? false : true;})
        .append("rect")
        .attr('class', 'backRowEven')        
        .attr("y", -5)
        .attr("x", 5)
        .attr("width", widthRow)
        .attr("height", cellSize);

    node.filter((d)=>{return (d.children) ? false : true;})
        .append("g")
        .attr("class",function(d) { return "heatMapRow"; })
        .attr("transform", "translate(" + (18+maxRowLabel) + ",-5)")
        .each(function(d){
        d3.select(this).selectAll(".cell").remove();
        if(d._children){ 
            aggregateGscore(this, d);
        }
        else   
            calculateRowGScore(this, d);
    });//each function

}

function createNodeCircle(node){
    var drag = d3.behavior.drag()
    .origin(function(d) { return d; })
    .on("dragstart", dragstarted)
    .on("drag", dragged)
    .on("dragend", dragended);

    createSlider(node.filter((d)=>{return d.parent ? true : false}));
    //    createSlider(node.filter((d)=>{return d.children ? false : true}));

    node//.filter((d)=>{return (d.children || d._children) ? true : false;})
        .append("circle")        
        .attr("r", (d)=>{return d.parent ? circleRadius : 10})
        .attr("y", (d)=>{return d.parent ? 0 : -100})
        .attr("stroke-width", function(d) { return d._children ? "2.0px" : "1.0px"; })
        .attr("stroke", "#666")
        .on("mouseover", function(d){d.parent ? showSlider(d) : null;})        
        .on("click", function(d){click(d);})
        .call(drag);

}

//----------------------------------SLIDE

function dragstarted(d) {    
    d3.event.sourceEvent.stopPropagation();
    d3.select(this).classed("dragging", true);
    isDragging = true;
}

function dragged(d) {
    var slider = d3.selectAll('.slider').filter((r)=>{return key(r)==key(d)});
    var rect = slider.select("#sliderRect");
    var text = slider.select("text");
    var line = slider.select("line");

    var diff = d3.event.y-d.y;    
    //    console.log(d3.event.y+"  "+d.y+"  "+ diff+ "  "+d3.event.dy);

    if((diff>0) && (d.weight<=0)) {
        d.weight=0;
        text.text(d.weight.toFixed(2)); 
        rect.attr("y", (d)=>returnSliderRectY(d.weight)); 
        line.attr("y1", (d)=>returnSliderY1(d.weight)); 
        line.attr("y2", (d)=>returnSliderY2(d.weight)); 
        return;
    }

    if(diff<0 && d.weight>=1) {
        d.weight=1;
        text.text(d.weight.toFixed(2)); 
        rect.attr("y", (d)=>returnSliderRectY(d.weight)); 
        line.attr("y1", (d)=>returnSliderY1(d.weight)); 
        line.attr("y2", (d)=>returnSliderY2(d.weight)); 
        return;
    }

    d.weight-=d3.event.dy/100;   

    text.text(d.weight.toFixed(2));
    rect.attr("y", parseFloat(rect.attr("y"))-parseFloat(d3.event.dy)); 
    line.attr("y1", parseFloat(line.attr("y1"))-parseFloat(d3.event.dy)); 
    line.attr("y2", parseFloat(line.attr("y2"))-parseFloat(d3.event.dy));     
}

function dragended(d) {
    isDragging = false;
    d3.select(this).classed("dragging", false); 
    //    console.log("dragEND");

    if(d.weight==0 && d.children) 
        click(d);
    else{
        recalculateScoreScale();
    }


    if (mouseExit){
        mouseExit = false;
        hideSlider();
    }
}

var slackHeight = 12, sliderGuide = 100, isDragging=false, mouseExit = false;


function createSlider(node){
    //    console.log("create slide");
    var slider = node.append("g")
    .attr("class", "slider");


    var sliderHeight = sliderGuide+slackHeight, sliderWidth = 30;

    slider.append('rect')
        .attr("id", "sliderRect")
        .attr("width", sliderWidth)
        .attr("height", sliderHeight)
        .attr("x", -(sliderWidth/2))
        .attr("y", (d)=>returnSliderRectY(d.weight))
        .fill("white");

    slider.append("line")
        .attr("x1", 0)
        .attr("y1", (d)=>returnSliderY1(d.weight))  
        .attr("x2", 0)
        .attr("y2", (d)=>returnSliderY2(d.weight))  
        .attr("stroke-width", 2)
        .attr("stroke", "grey");

    slider.append('rect')
        .attr("id", "backsplash")
        .attr("width", 30)
        .attr("height", 15)
        .attr("y", -8)
        .attr("x", 6.5);

    slider.append('text')        
        .attr("dy", 3)
        .attr("dx", 7)      
        .style("text-anchor",  "start" )
        .text(function(d){ return (d.weight) ? d.weight.toFixed(2): "0.00"});

}

function returnSliderRectY(w){
    var yWeight1 = -slackHeight/2;
    var diff = 1-w;
    return parseInt(yWeight1-(diff*100));
}

function returnSliderY1(w){
    var yWeight1 = slackHeight/2;
    var diff = 1-w;
    return parseInt(yWeight1-(diff*100));
}

function returnSliderY2(w){
    var yWeight1 = sliderGuide - slackHeight/2;
    var diff = 1-w;
    return parseInt(yWeight1-(diff*100));
}


function hideSlider(slide){
    if(isDragging) return;
    $('#sliderVisible').attr("id", null);
}
//------------------------------------------------------------------------

function showSlider(d){
    if (isDragging==false){
        var slider = d3.selectAll('.slider').filter((r)=>{return key(r)==key(d)});
        slider.attr("id","sliderVisible");
    }
}



var gsc = [];

function dblClick(d){
    // d3.selectAll('.colTriangleSelected').attr("class", "colTriangle");
    reorderRows();
    reloadSelectedCells();
}

function clickCol(d){ 
    // d3.selectAll('.colTriangle').filter((r)=>r==d).attr('class', 'colTriangleSelected');
    selectedColLang = d;
    reorderRowsCol(d);
    reloadSelectedCells();
}


function sibblingCollapse(data){    
    console.log("sibColapse");    
    _.forEach(data.parent.children, (sib, i)=>{ click(sib)});  
}


function reorderRows(){
    var nodeUpdate = d3.selectAll('.node').filter((d)=>{return (d.children) ? false : true;});

    var nodeX = _.sortBy(d3.selectAll('.node').filter((d)=>{return (d.children) ? false : true;}).data().map((d)=>d.x));

    var dataUpdate = _.orderBy(d3.selectAll('.node').filter((d)=>{return (d.children) ? false : true;}).data(), 'normalWScore', 'desc'); 
    //    var dataUpdate = _.orderBy(d3.selectAll('.node').filter((d)=>{return (d.children) ? false : true;}).data(), 'sumGscore', 'desc');
    var pair = {};

    dataUpdate.forEach((d,i)=>{pair[d.x] = nodeX[i]; d.x=nodeX[i];}); 

    var link = d3.selectAll("path.link")
    .filter((d)=>d.target.children ? false : true)[0];
    //    console.log(pair);

    var links = d3.selectAll(link).each((d,i)=>{         
        var val = _.filter(dataUpdate, {rule: d.target.rule});  
        if (val.length==0) var val = _.filter(dataUpdate, {name: d.target.name});
        d.target.x = val[0].x;               
    });


    nodeUpdate.selectAll('rect').remove();
    nodeUpdate.selectAll('circle').remove();
    nodeUpdate.selectAll('text').remove();
    nodeUpdate.selectAll('.cell').remove();
    nodeUpdate.selectAll('g').remove();
    unhighlight();    

    createRowsAndCells(nodeUpdate);  
    createNodeCircle(nodeUpdate);
    appendNodeText(nodeUpdate);
    bindRightClickMenu(nodeUpdate);

    nodeUpdate.transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; }); 

    links.transition()
        .duration(duration)
        .attr("d", diagonal);
    links.classed('rank', true);
    recalculateScoreScale();

    //    nodeOverview();
}

function aggregateGscore(node, d){   
    //    console.log(node);
    d3.select(node).selectAll(".cell").remove();
    var leaves = returnLeaves(d._children);    
    var cells = d3.select(node).selectAll(".cell")
    .data(getAggregatedCell(leaves, d.name))
    .enter()
    .append("rect")
    //    .each((d,i)=>console.log(d))
    .attr('class', 'cell')
    .attr("x", function(r, ri) {
        return (cellSize+1)*table.cols.indexOf(r.col); 
    })
    .attr("y", 0)
    .attr("width", cellSize)
    .attr("height", cellSize);

    cells.style("fill", function(r) {   
        var gscore = gScore(r.error_count, d.totError, countOtherLang(r.col), table.langCount[r.col].totError);         

        r.gscore = gscore.G;
        r.expect = gscore.expect;
        return "green"; 
        //        return returnColorScale(r, cells.data()); 
    })
        .on("click", (d)=>selectCell(d))
        .on("mouseover", function(d){       
        d3.selectAll(".colLabel").classed("text-highlight",function(c,ci){             
            return ci==(table.cols.indexOf(d.col));
        });
        d3.select("#tooltip_matrix")
            .style("left", (d3.event.pageX+30) + "px")
            .style("top", (d3.event.pageY-100) + "px")
            .style("white-space", "pre-line")
            .select("#value")
            .text("Error: "+d.row+" \n Column: "+d.col+"  \n Error count:"+d.error_count.toFixed(2)+" \n G-score:"+d.gscore.toFixed(2)+(d.wscore ? " \n Weighted score:"+d.wscore.toFixed(4) : "")+" \n Normalized score: "+d.normal.toFixed(2)+" \n Expectation:"+d.expect.toFixed(2)); 
        //Show the tooltip
        d3.select("#tooltip_matrix").classed("hidden", false);
    })
        .on("mouseout", function(){
        d3.select(this).classed("cell-hover",false);
        d3.selectAll(".row").classed("text-highlight",false);
        d3.selectAll(".colLabel").classed("text-highlight",false);        
        d3.select("#tooltip_matrix").classed("hidden", true);
        d3.selectAll(".node").classed("text-highlight",false);
    });

    //    r.gscore = gScore(r.error_count, d.totError, countOtherLang(r.col), table.langCount[r.col].totError);
    //    console.log(leaves);
}

function getAggregatedCell(leaves, row){
    var rows = new Set();
    _.forEach(leaves, (l, i)=>{ rows.add(l.rule);});
    //    console.log(rows);
    var data = table.table.filter((r)=>{ return rows.has(r.row)});      
    var aggregate = _(data)
    .groupBy('col')
    .map((objs, key)=>({
        'col': key, 
        'row': row,
        'error_count': _.sumBy(objs, 'error_count'),
        'file_count': _.sumBy(objs, 'file_count')
    }))
    .value();   
    //    console.log(aggregate);
    //    if(aggregate.length<table.cols.length){
    //        var exist = new Set();
    //        _.forEach(aggregate, (g)=>exist.add(aggregate[i].col));;
    //        _.forEach(table.cols, (c)=>{
    //            if (!exist.has(c)){
    //                aggregate.push({
    //                    'col': c, 
    //                    'row': row,
    //                    'error_count': _.sumBy(0, 'error_count'),
    //                    'file_count': _.sumBy(0, 'file_count')
    //                });
    //            }
    //        });
    //    }
    return aggregate;
}

function aggregateWeight(objs){
    var weight = 1;
    _.forEach(objs, (d)=>weight*getHierarchicalWeight(d));
    return weight;
}

function returnLeaves(children){
    var leaf = [], kid = [];
    for(i in children){
        if(children[i]._children)
            for(c in children[i]._children)
                kid.push(children[i]._children[c]);
        else{
            if(children[i].children)
                for(c in children[i].children)
                    kid.push(children[i].children[c]);
            else
                leaf.push(children[i]);
        }           
    }
    while(kid.length>0){
        var aux = kid.pop();
        if(aux._children)
            for(c in aux._children)
                kid.push(aux._children[c]);            
        else if(aux.children)
            for(c in aux.children)
                kid.push(aux.children[c]);
        else
            leaf.push(aux);
    }
    return leaf;
}

function gScore(A, sumAB, D, C){
    var B = sumAB - A;
    var sumCD = C + D;
    var E1 = C*sumAB/sumCD;
    var E2 = D*sumAB/sumCD;
    if(B>0)
        var G = 2*(A*Math.log(A/E1)+B*Math.log(B/E2));
    else
        var G = 2*(A*Math.log(A/E1));

    //    console.log(" A "+A+"B "+B+" C "+C+" D "+D+" E1 "+E1+" E2 "+E2+" G "+G);
    gsc.push(G);
    //    console.log(gsc);
    if (isNaN(G))
        G = 0;
    return {'G': G, 'expect': A-E1};    
}

function countOtherLang(language){
    var count = 0;
    for(i in table.langCount){
        if(i!=language)
            count+=table.langCount[i].totError;
    }
    return count;
}

function orderCols(numNodes=0){

    alpha = !alpha; 
    selectedColLang = "";
    if(alpha){
        table.cols = _.sortBy(table.cols);
    }else{            
        table.cols = _.orderBy(table.langCount, 'sumGscore', 'desc').map(d => d.key);
    }
    update(numNodes);
    //    createHeader(svg);
}

function createHeader(svg){
    d3.select('#gcolHeader').remove();
    d3.select('#leg').remove();
    d3.select('#controlPanel').remove();

    var g = d3.selectAll('.node').filter((d)=>{return (d.children) ? false :  ((d._children) ? false : true);})[0];

    if(g.length>0)
        var marginLeft = d3.transform(d3.select(g[0]).attr("transform")).translate[0];
    else
        var marginLeft = treeWidth-160;

    var header = svg.append("g").attr("id", "gcolHeader");
    header.append("rect")
        .attr("id","colHeader")
        .attr("fill", "white")
        .attr("width", margin.top)
        .attr("height",  2000)
        .attr("transform", "rotate (-90)")    
        .attr("x",0)
        .attr("y",0);


    var colLabels = header.selectAll("collGlabel")
    .data(table.cols)
    .enter()
    .append('g')
    .attr("class","colGlabel").on("dblclick", function(d){ orderCols(); });

    colLabels
        .append("text")
        .text(function (d) { return d; })
        .attr("x", 0)
        .attr("y", function (d, i) { return ((i) * (cellSize+1)); })
    // .style("text-anchor", "left")    
        .attr("transform", "translate("+(marginLeft+(18+maxRowLabel)+(cellSize)/2+2) + ",-18) rotate (-90)")
        .attr("class",  function (d,i) { return "colLabel"+i;} )
        .on("mouseover", function(d) {d3.select(this).classed("text-hover",true);})
        .on("mouseout" , function(d) {d3.select(this).classed("text-hover",false);})
        .on("click", function(d){ selectCellsByCol(d); });


    colLabels.append('path')
    // .attr('fill', 'red')
        .attr('class', 'colTriangle')
        .attr("d", d3.svg.symbol().type("triangle-up").size(cellSize*3))
        .attr("transform", function (d, i) {
        if(d==selectedColLang) 
            return "translate("+((marginLeft+(18+maxRowLabel)+(cellSize)/2) + ((i)*(cellSize+1))) + ",-8) rotate (60)"
        else
            return "translate("+((marginLeft+(18+maxRowLabel)+(cellSize)/2) + ((i)*(cellSize+1))) + ",-8) rotate (0)"
    })
        .classed("selectedCol", function(d) {
        return d==selectedColLang ? true:false;
    });

    colLabels.append("rect")
        .attr("class", "triangleBox")
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("fill", "transparent")
        .attr("transform", function (d, i) {
        return "translate("+((marginLeft+(12+maxRowLabel)+(cellSize)/2) + ((i)*(cellSize+1))) + ",-12)"
    })
        .on("click", clickCol);


    var legend = svg.append("g").attr("id","leg")
    .attr("class", "legendLog")
    .attr("transform", "translate("+(marginLeft+widthRow+50)+","+(displayVal=='gscore' ? 60 :30)+")");

    //    svg.append('text').value("TEST");

    var titleLegend = legend.append('text')
    .attr('dx', '0')
    .attr('dy', '-30');

    if( displayVal=='gscore'){
        "G-Score: deviation\n from expected frequency"
        titleLegend
            .append('tspan')
            .text("G-Score:")
            .attr('dx', '0')
            .attr('dy', '-40');
        titleLegend
            .append('tspan')
            .text("deviation from")
            .attr('x', '0')
            .attr('dy', '15');

        titleLegend
            .append('tspan')
            .text("expected frequency")
            .attr('x', '0')
            .attr('dy', '15');
    }
    else
        titleLegend    
            .append('tspan')
            .text("Error Frequency")
            .attr('dx', '0')
            .attr('dy', '-10');

    if(colorScheme!="sequential"){
        titleLegend
            .append('tspan')
            .text("More than expected")
            .attr('x', '60')        
            .attr('dy', '15')
            .attr('fill', colorScale(.8));
        titleLegend
            .append('tspan')
            .text("Less than expected")
            .attr('x', '60')
            .attr('dy', '180')
            .attr('fill', colorScale(-.8));
    }


    var logLegend = d3.legend.color()
    .cells(11)
    .scale(colorScale);

    svg.select(".legendLog")
        .call(logLegend);

    var controlPane = svg.append('g').attr("id", "controlPanel")
    .attr("transform", "translate("+(marginLeft+widthRow+50)+",270)");


    controlPane.append('text')
        .attr("id", "txSelectAll")
        .attr("class", "hipLink")
        .attr("class", "clickable")
        .text("Select all")
        .attr("dx", "0")
        .attr("dy", "0")
        .on("click", (d)=>{
        d3.selectAll('.cell').filter((r)=>r.row).classed('selectedCell', true);
        d3.selectAll('.node').filter((r)=>{return r.children?false:true;}).classed('selectedLbl', true);
        d3.selectAll('.cell').filter((r)=>r.row).data().forEach((obj, i, array)=>{
            savedSelectedCells.add(keyCell(obj));
        });

    });

    controlPane.append('text')
        .attr("id", "txDeselectAll")
        .attr("class", "hipLink")
        .attr("class", "clickable")
        .text("Clear selection")
        .attr("dx", "0")
        .attr("dy", "15")
        .on("click", (d)=>{
        d3.selectAll('.cell').filter((r)=>r.row).classed('selectedCell', false);       
        d3.selectAll('.node').filter((r)=>{return r.children?false:true;}).classed('selectedLbl', false);
        savedSelectedCells = new Set();
    });


    controlPane.append('rect')
        .style('stroke', 'black')
        .style('fill', 'none')
        .attr("class", "hipLink")
        .attr("class", "clickable")
        .attr('height', '30px')
        .attr("dx", "0")
        .attr("y", "35px")
        .attr('width', '100px');

    controlPane.append('text')
        .attr('id', 'btFilter')
        .style('fill', 'black')
        .attr("class", "hipLink")
        .attr("class", "clickable")
        .attr("dx", "30")
        .attr("dy", "53")
        .text("Filter")
        .on('click', (d)=>{clickFilter();});



    reloadSelectedCells();

    //treating scroll for freezing the header
    $("#chart").on("scroll", function(){ 
        $('#colHeader').attr('x', cellSize - this.scrollTop);
        colLabels.selectAll('text').attr('x', cellSize - this.scrollTop);
        var scroll = this.scrollTop;
        colLabels.selectAll('path').each(function(d,i){
            $(this).attr("transform", function (di, ii) {            
                var trans = ii.split(",")[0] + ","+(-16+scroll)+")";           
                return trans;
            });
        });
        colLabels.selectAll('rect').each(function(d,i){
            $(this).attr("transform", function (di, ii) {            
                var trans = ii.split(",")[0] + ","+(-16+scroll)+")";           
                return trans;
            });
        });
        // colLabels.selectAll('rect').attr('x', cellSize - this.scrollTop);
        legend.attr("transform", "translate("+(marginLeft+widthRow+50)+","+(this.scrollTop+(displayVal=='gscore' ? 60 :30))+")");  
        controlPane.attr("transform", "translate("+(marginLeft+widthRow+50)+","+(210+(displayVal=='gscore' ? 60 :30)+this.scrollTop)+")");  
    });
}

function clickFilter(){
    //    $('#load-overlay').show();
    //    $("#textview-tab").trigger('click');
    //    window.location.hash = '#datatable';
    var cells = d3.selectAll('.selectedCell');
    if (cells.size()>0){
        var cellKey = [];
        cells.data().forEach((obj, i, array)=>{
            cellKey.push({row: obj.row, col:obj.col});
        });

        var p = {cells: cellKey};
        $('#pnEssay').html("");
        console.log(p);
        $('#essayTitle').html("Choose a file to display.");
        $.post(APIURL + "/standReqEssays/db/toefl",  p, function(essay){        	
            var table = $('#datatable').DataTable();
            table.clear();
            table.rows.add(essay).draw();
            //            let search = _.map(essay, 'id');
            //            console.log(search.join('|'));
            //            table.columns(6).search(search.join('|')).draw();
            $("#textview-tab").trigger('click');
            //            $('#load-overlay').hide();        
        });

    }else{
        $('#load-overlay').hide();
        alert("You must select data first!");
    }

}

function selectCellsByCol(col){
    var colLabel = d3.selectAll('.colGlabel').filter((d)=>d==col);
    colLabel.classed('selectedLbl', !(colLabel.classed('selectedLbl')));
    var cells = d3.selectAll('.cell').filter((d)=>d.col==col);
    cells.classed('selectedCell', (colLabel.classed('selectedLbl')));
    cells.data().forEach(function(d) {        
        if(savedSelectedCells.has(keyCell(d))) {
            savedSelectedCells.delete(keyCell(d));
        } else {
            savedSelectedCells.add(keyCell(d));
        }
    })   
}

//returns weights for parents of nodes not included itself
function getHierarchicalWeight(node){
    var familyWeight = [];   

    while(node.parent){
        familyWeight.push(node.parent.weight);
        node = node.parent;
    }
    var globalWeight = 1;
    _.forEach(familyWeight, function(d,i){
        globalWeight*=d;
    });

    return globalWeight;
}

function getHierarchicalWeight2(node){
    var familyWeight = [];   
    //    console.log(node);

    while(node.parent){
        familyWeight.push(node.parent.weight);
        node = node.parent;
    }
    //    console.log(familyWeight);
    var globalWeight = 1;
    _.forEach(familyWeight, function(d,i){        
        globalWeight*=d;
    });
    //    console.log(globalWeight);
    return globalWeight;
}

d3.selection.prototype.moveToFront = function() {  
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

function unhighlight(){   
    //    d3.selectAll('.link').filter((d)=> key(d.source)=='Errors').style('stroke', '#fff');
    d3.selectAll('.highlightRow').attr('class', "backRowEven");
    d3.selectAll(".node").classed("text-highlight",false);
    d3.selectAll(".link").classed("highlink",false);
}

function highlightAncestors(node){         
    var family = new Set();
    while (node.depth>0){//highlighting family
        family.add(node);                 
        node = node.parent;                
    }
    family.add(node);
    var nodes = d3.selectAll('.node')
    .filter(function(d, i){return family.has(d);});   

    nodes.classed("text-highlight", "true");

    var rows = d3.selectAll('.node')
    .filter(function(d, i){return (family.has(d) && !d.children);});

    rows.selectAll('.backRowEven').attr('class', "highlightRow");

    var links = d3.selectAll('.link')
    .filter(function(d, i){return family.has(d.target);});  
    //add color to root node links
    d3.selectAll('.link').filter((d)=> key(d.source)=='Errors'&&family.has(d.target)).style('stroke', '#ddd');
    links.classed("highlink", "true");    
}

function highlightFamily(node){      
    if(node.children==null)
        highlightAncestors(node);
    else{        
        for(i in node.children)
            highlightFamily(node.children[i]);             
    }     
}

function click(d) {
    var numNodes = 0;
    alpha = false;
    if (!d.parent)
        return collapse(d);
    if (d.children) {
        d._children = d.children;
        numNodes = -1*d.children.length;
        d.children = null;        
    } else {
        d.children = d._children;
        numNodes = d._children.length;
        d._children = null;
    }        
    orderCols(numNodes);  
    reloadSelectedCells();  
}

//function initialCollapse(root){    
//    //        if(root.children){            
//    //            for(i in root.children)
//    //                initialCollapse(root.children[i]);
//    //            click(root);
//    //        }
//    //        
//}



function collapse(root){
    console.log(root);
    for(i in root.children)
        //        if(!root.children[i]._children)
        click(root.children[i]);
}

function countLeaves(nodes){
    var count = 0, maxLabel = 0;

    nodes.forEach(function(d, i){
        if(!d.children){ //if leaf
            count++;
            var width = getWidth(d.name ? d.name : d.rule);
            maxLabel = maxLabel>width ? maxLabel : width;
        }
    });
    // maxRowLabel = maxLabel;
    return count;    
}

function customDiagonal(s, d, levels) {
    let offset = (d.y-s.y) / 2, diff = levels[s.y]-levels[d.y];
    if(diff == 1 && levels[d.y] == 1) offset = 0;
    else if(diff == 1 && levels[d.y] > 1) offset = offset * 0.5;
    //    if(levels[s.y] > 2) offset = offset + (offset*0.1);
    path = `M ${s.y} ${s.x}
C ${s.y} ${s.x},
${(s.y + d.y) / 2 - offset} ${d.x},
${d.y} ${d.x}`
    //    path = "M" + s.x + "," + s.y
    //    + "C" + s.x + "," + (s.y + d.y) / 2
    //    + " " + d.x + "," +  (s.y + d.y) / 2
    //    + " " + d.x + "," + d.y;
    return path;
}

function calculateTreeDepth(){
    let res = _.maxBy(d3.selectAll('.node').filter((d)=>d.children==null).data(), 'depth');
    console.log(res.depth);
    return res.depth+2;
}

function countDataLeaves(r) {
    if (!r.children) return 1;
    let count = 0;
    for(let c of r.children) {
        count += countDataLeaves(c);
    }
    return count;
}

function update(delta=0) {    
    //    calculateTreeDepth();
    //    treeWidth = calculateTreeDepth() * widthCategory;
    //    console.log(treeWidth);
    var width = treeWidth;        
    let nd = d3.selectAll('.node').filter((d)=>d.depth==1).data();
    console.log(nd);
    let countNode = countDataLeaves({children : nd});
    console.log(countNode);
    height = (countNode)*rowHeight;
    console.log(height);

    console.log(countLeaves(d3.selectAll('.node').data()));
    //        height = (delta+countLeaves(d3.selectAll('.node').data()))*rowHeight;
    //    height = table.rows.length*rowHeight;

    $('#mainSVG').attr('height', height +450);

    var diagonal = d3.svg.diagonal()
    .projection(function(d) {
        let y = d.y;
        return [y, d.x]; 
    });

    cluster = d3.layout.cluster()
        .size([height, width - 160])
        .separation(function(a,b){
        return 1;
    });
    d3.selectAll('.cell').remove();
    var nodes = cluster.nodes(table.tree),
        links = cluster.links(nodes); 
    //placing the category nodes int he same position
    var grammar = -1;
    nodes.forEach((d)=>{ 
        if((d.children!=null)){ //not a leaf
            if(key(d)=="Errors"){
                grammar = d.y+200;
                //                d.y = -100;
            }
            //            if(key(d)=="Grammar")
            //                grammar=d.y;
            if(d.children[0].children==null)
                d.y += 100; 
            if(d.parent==root)
                if(grammar!=-1)
                    d.y = grammar;
        }       
    });

    var node = svg.selectAll(".node").data(nodes, key);

    var nodeEnter = node.enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
    .on("mouseover", function(d){
        showSlider(d);
        unhighlight();
        highlightFamily(d);
    })
    .on("mouseout", function(d){
        unhighlight();
        mouseExit = true;
        hideSlider();
    })
    .on("dblclick", function(d){(d.children) ? null : dblClick(d)});

    let res = _.maxBy(nodeEnter.filter((d)=>d.children==null).data(), 'depth');
    if(maxDepth<res) maxDepth=res;

    createRowsAndCells(nodeEnter);
    createNodeCircle(nodeEnter);
    appendNodeText(nodeEnter);
    bindRightClickMenu(nodeEnter);



    //--------------------------------------------



    // Transition nodes to their new position.
    var nodeUpdate = node;

    nodeUpdate.selectAll('rect').remove();
    nodeUpdate.selectAll('circle').remove();
    nodeUpdate.selectAll('text').remove();
    nodeUpdate.selectAll('g').remove();
    nodeUpdate.selectAll('.cell').remove();
    unhighlight();    


    createRowsAndCells(nodeUpdate);
    createNodeCircle(nodeUpdate);
    appendNodeText(nodeUpdate);
    bindRightClickMenu(nodeUpdate);

    nodeUpdate.transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
    ;        

    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().remove();    

    // Update the links…
    var link = svg.selectAll("path.link")
    .data(links, keyLink);

    d3.selectAll('.link').classed('rank',false);

    // get the depth level info by y (x) value
    let link_levels = [];
    for(let i=0; i < links.length; i++) {
        if(!link_levels.includes(links[i].source.y)) {
            link_levels.push(links[i].source.y);
        } 
        if(!link_levels.includes(links[i].target.y)) {
            link_levels.push(links[i].target.y);
        }
    }
    let sorted_levels = {};
    link_levels = link_levels.sort(function(a,b) { return b-a; });
    for(let i=0; i<link_levels.length; i++) {
        sorted_levels[link_levels[i]] = i+1;
    }
    console.log(sorted_levels);
    // Enter any new links at the parent's previous position.
    link.enter().insert("path", "g")
        .attr("class", "link")
        .style("stroke", (d)=>colorLink(d))
        .attr("d", function(d) {
        let s = d.source
        , t = d.target;
        //            console.log(d);
        return customDiagonal(s,t,sorted_levels);
    })
        .on("mouseover", function(d){
        unhighlight();
        highlightFamily(d.target);
    })
        .on("mouseout", function(d){        
        unhighlight();
    });


    // Transition links to their new position.
    link.transition()
        .duration(duration)
        .attr("d", function(d) {
        let s = d.source
        , t = d.target;
        //            console.log(d);
        return customDiagonal(s,t,sorted_levels);
    });

    // Transition exiting nodes to the parent's new position.
    link.exit().remove();
    //    updateMatrix(table);

    //    createMatrix(table, margin, maxRowLabel);
    //        createHeader(svg);    

    recalculateScoreScale();
    //    nodeOverview();

    reloadSelectedCells();

    d3.select('#gcolHeader').moveToFront();
}

function bindRightClickMenu(node){
    node.on("contextmenu", function (d) { 
        //        node.classed("text-highlight", true);
        highlightFamily(d);
        // Avoid the real one
        d3.event.preventDefault();    
        personalizeContextMenu(d);
        // Show contextmenu        
        $(".custom-menu").finish().toggle(100).    
        // In the right position (the mouse)
        css({
            top: d3.event.pageY-60 + "px",
            left: d3.event.pageX + "px"
        });
    });
}

function personalizeContextMenu(d){
    var id = (key(d)).replace('"','');
    var html = 
        //        "<li data-action='exMe'>Expand '"+(d.name ? d.name : d.rule)+"' node</li>" +
        (d.name ? "<li onclick=\"exAll('"+id+"');\">Expand all levels of this node</li>" : "") +
        ("<li onclick=\"collAll('"+id+"');\">Collapse all except this node</li>") +
        //        ('<li role="separator" class="divider"></li>')+
        ("<li onclick=\"filterEssay('"+id+"');\">Show essays containing '"+(d.name ? d.name : d.rule)+"' errors</li>");
    $(".custom-menu").html(html);
}

function exAll(k){
    var node = d3.selectAll(".node").filter((d)=>key(d)==k).data();
    var n = expandSubTree(node[0]);
    console.log(n);
    update(n);        
    $(".custom-menu").hide(100);
}

function expandSubTree(node){
    var count = 0;
    if (node._children){
        node.children = node._children;
        node._children = null;
        count = node.children.length;
    }
    if(node.children){
        for(child in node.children){
            if(node.children[child].name)
                count = count + expandSubTree(node.children[child]);                
        }        
    }
    return count;
}

function collapseSubTree(node){
    var count = 0;
    if (node.children){
        node._children = node.children;
        node.children = null;
        count = node._children.length;
    }
    if(node._children){
        for(child in node._children){
            if(node._children[child].name)
                count = count + collapseSubTree(node._children[child]);                
        }        
    }
    return count;
}

function collAll(k){
    let thisNode = d3.selectAll(".node").filter((d)=>key(d)==k).data()[0];
    var node = d3.selectAll(".node").filter((d)=>{
        if((d.parent) && (d.children) && (key(d)!=key(thisNode)))
            if(d.depth<=thisNode.depth)
                if(key(d)!=thisNode.parent)
                    return true;
        return false;
    }).data();
    var n = collapseSubTree({children: node});
    update(-n);        
    $(".custom-menu").hide(100);
}

function filterEssay(k){
    //    var node = d3.selectAll(".node").filter((d)=>key(d)==k).data();
    let filter = [];
    _.forEach(table.cols, (col,i)=>{
        filter.push({row: k,col: col});
    });
    let p = {cells: filter}
    console.log(filter);
    $.post(APIURL + "/standReqEssays/db/toefl",  p, function(essay){        	
        var table = $('#datatable').DataTable();
        table.clear();
        table.rows.add(essay).draw();
        //            let search = _.map(essay, 'id');
        //            console.log(search.join('|'));
        //            table.columns(6).search(search.join('|')).draw();
        $("#textview-tab").trigger('click');
        //            $('#load-overlay').hide();        
    });

//    console.log(node);
    $(".custom-menu").hide(100);
}

function appendNodeText(node){ 

    node.append("rect")
        .attr("class", "labelBack")
        .attr("x", (d)=>{return d.parent ? ((d.children ? -8-getWidth(d.name ? d.name : (d.rule.replace(/_/g,' ')).toLowerCase()) : (8+(maxRowLabel-getWidth(d.name ? d.name : (d.rule.replace(/_/g,' ')).toLowerCase()))))) : -17;})
        .attr("y", -6)
        .attr("width", (d)=>{return getWidth(d.name ? d.name : (d.rule.replace(/_/g,' ')).toLowerCase());})
        .attr("height", 10)
        .fill("#FFF");

    node.append("text")
        .attr("dx", function(d) {return d.parent ? (d.children ? -8: (8+(maxRowLabel-getWidth(d.name ? d.name : (d.rule.replace(/_/g,' ')).toLowerCase())))) : -17; })
        .attr("dy", 3)
        .style("text-anchor", function(d) { return d.parent ? (d.children ? "end" : "start") : 'center'; })
        .attr("class", function(d){ return d.children ? "parent" : "row";})   
        .style("fill", function(d){ 
        if (d.parent)
            if (d.parent.name=='Errors')
                return c20(d.name);
    })   
        .text(function(d){ return (d.children || d._children) ? d.name : (d.rule.replace(/_/g,' ')).toLowerCase();})
        .on("click", function(d){(d.children) ? click(d) : selectRow(d)})
    // .on("dblclick", function(d){(d.children) ? null : dblClick(d)})
        .on("mouseover", function(d){(d.children) ? showSlider(d) : null});
    //        .on("mouseout", function(d){(d.children) ? hideSlider() : null});

}

function reloadSelectedCells(){
    if (savedSelectedCells.size>0){
        var cell = d3.selectAll('.cell').filter((d)=>{return d.row?savedSelectedCells.has(keyCell(d)):false;});
        cell.attr("class", "cell selectedCell");
    }
}



function selectRow(row){    
    var node = d3.selectAll('.node').filter((d)=>key(d)==key(row));
    node.classed('selectedLbl', !(node.classed('selectedLbl')));
    var cells = node.selectAll('.cell');
    cells.classed('selectedCell', (node.classed('selectedLbl')));
    cells.data().forEach(function(d) {        
        if(savedSelectedCells.has(keyCell(d))) {
            savedSelectedCells.delete(keyCell(d));
        } else {
            savedSelectedCells.add(keyCell(d));
        }
    });
}

function selectCell(cellD){    
    var cell = d3.selectAll('.cell').filter((d)=>keyCell(d)==keyCell(cellD));
    var row = d3.selectAll('.node').filter((d)=>key(d)==cellD.row);
    var col = d3.selectAll('.colGlabel').filter((d)=>d.col==cellD.col);
    if (cell.classed('selectedCell')){ //its already selected, so deselect
        cell.classed('selectedCell', false);
        row.classed('selectedLbl', false);
        col.classed('selectedLbl', false);
        savedSelectedCells.delete(keyCell(cell.data()[0]));
    }else{
        savedSelectedCells.add(keyCell(cell.data()[0]));
        if ((row.selectAll('.cell')[0].length)==(row.selectAll('.selectedCell')[0].length+1))
            selectRow(row.data()[0]);
        else
            cell.classed('selectedCell', true);
    } 
}



function recalculateScoreScale(){
    var cells = d3.selectAll('.cell').filter((d)=>d.row);
    var cellsData = cells.data();
    console.log("recalc");            
    var val = returnMaxMinScoreGlobal(cellsData);           
    min = val.min;
    max = val.max;   
    //    console.log(val);
    globalNormal = d3.scale.linear().domain([min, max]).range([0, 1]);
    //    console.log(globalNormal);
    if(normal=="none")
        colorScale = d3.scale.linear().domain([min, max]).range(colors);
    else
        if (colorScheme=="sequential") 
            colorScale = d3.scale.linear().domain([0, 1]).range(colors);
    else
        colorScale = d3.scale.linear().domain([1,.8,.6,.4,.2, 0, -.2, -.4, -.6, -.8, -1]).range(["#67001f","#b2182b","#d6604d","#f4a582","#fddbc7","#f7f7f7","#d1e5f0","#92c5de","#4393c3","#2166ac","#053061"]).interpolate(d3.interpolateHcl)
    if(normal=="column")
        calculateMaxMinColumns();
    cells.style("fill", (d)=>returnColorScale(d));    
    nodeOverview();
    //    treeWidth = calculateTreeDepth() * widthCategory;
}

function nodeOverview(){
    var rows = d3.selectAll('.node').filter((d)=>d.children ? false : true)
    .each(function(d, i){
        var cell = d3.select(this).selectAll(".cell").data();
        switch(displayVal){
            case "gscore":
                d.sumGscore = _.sumBy(cell, 'gscore');
                break;
            case "freq":
                d.sumGscore = _.sumBy(cell, 'error_count');
                break;
        }

        var parent = d.parent;
        while(parent){//find parent in the samel level get min max for normalization
            parent.sumGscore = _.sumBy(parent._children ? parent._children : parent.children, 'sumGscore');
            parent = parent.parent;
        }            
    });

    var nodes = d3.selectAll('.node').data();    
    var rootScore = _.max(nodes.map((d)=>d.sumGscore));   

    //   calculateWeightNormalScore(root);
    calculateWeightPerCategoryLevel(root);

    //calculate weight score for leaves    
    var leaves = d3.selectAll('.node').filter((d)=>{return d.children ? false : true;});    
    var cat = leaves.data();    
    var maxCat = _.max(cat.map((d)=>getHierarchicalWeight(d)*d.sumGscore*d.weight));
    var minCat = _.min(cat.map((d)=>getHierarchicalWeight(d)*d.sumGscore*d.weight));

    leaves.each(function(d, i){
        var normal = d3.scale.linear().domain([minCat, maxCat]).range([0, 1]);
        d.normalWScore = normal(getHierarchicalWeight(d)*d.sumGscore*d.weight);        
    });  

    d3.selectAll('.node circle').attr('r',(d)=> {return d.parent ? circleRadius : 20});    
    d3.selectAll('.node circle').attr('fill',(d)=> {return d.parent ? colorScale(d.normalWScore) : '#fff'});  

    sumGscoreLanguages();
    //    recalculateScoreScale();

}

function calculateWeightPerCategoryLevel(node){
    calculateWeightNormalScore(node);
    _.forEach(node.children, function(kid, i){
        if(kid.children){             
            calculateWeightPerCategoryLevel( kid);
        }            
        calculateWeightNormalScore(kid);        
    });
}

function calculateWeightNormalScore(father){
    var category = d3.selectAll(".node").filter((d)=>{return d.parent==father}).data();
    var maxCat = _.max(category.map((d)=>getHierarchicalWeight(d)*d.sumGscore*d.weight));
    var minCat = _.min(category.map((d)=>getHierarchicalWeight(d)*d.sumGscore*d.weight));
    d3.selectAll(".node").filter((d)=>{return d.parent==father}).each(function(d, i){
        var normal = d3.scale.linear().domain([minCat, maxCat]).range([0, 1]);
        d.normalWScore = normal(getHierarchicalWeight(d)*d.sumGscore*d.weight);  
    });
}

function sumGscoreLanguages(){
    var value = "gscore";
    switch(displayVal){
        case "gscore":
            value = "gscore";
            break;
        case "freq":
            value = "error_count";
            break;
    }
    _.forEach(table.langCount, function(obj, key){        
        var cell = d3.selectAll('.cell').filter((d)=>d.col==key).data();
        obj.sumGscore = _.sumBy(cell, value);
    });    
    createHeader(svg); 
}


function getWidth(str){
    //    $('#widthTest').html(str);
    var span = document.getElementById("widthTest");
    span.innerHTML = str;    
    return span.offsetWidth; 
}

//call contructor
//    constructor();
//}

// Trigger action when the contexmenu is about to be shown
//$(document).bind("contextmenu", function (event) {    
//    // Avoid the real one
//    event.preventDefault();    
//    // Show contextmenu
//    $(".custom-menu").finish().toggle(100).    
//    // In the right position (the mouse)
//    css({
//        top: event.pageY-60 + "px",
//        left: event.pageX + "px"
//    });
//});


// If the document is clicked somewhere
$(document).bind("mousedown", function (e) {    
    // If the clicked element is not the menu
    if (!$(e.target).parents(".custom-menu").length > 0) {        
        // Hide it
        $(".custom-menu").hide(100);
    }
});


// If the menu element is clicked
$(".custom-menu li").click(function(){

    // This is the triggered action name
    switch($(this).attr("data-action")) {

            // A case for each action. Your actions here
        case "first": alert("first"); break;
        case "second": alert("second"); break;
        case "third": alert("third"); break;
    }

    // Hide it AFTER the action was triggered
    $(".custom-menu").hide(100);
});




// var cluster, svg, table, margin, maxRowLabel, root, max, min, colorScale;

// var globalNormal = d3.scale.log().domain([0, 36]).range([0, 1]), normal;
// var duration = 2000, rowHeight = 14;
// var widthRow;
// var start_color = 'seashell',
//     end_color = '#1f1b84';
// var cellSize = 10;
// var colors = [start_color, end_color];
// var circleRadius = 6;
// var alpha = true;
// var diagonal = d3.svg.diagonal()
// .projection(function(d) { return [d.y, d.x]; });
// var c20 = d3.scale.category10();
// var valColumns = [], savedSelectedCells = new Set();

// function key(d){
//     return d.name ? d.name : d.rule;
// }

// function keyLink(d){
//     var source = d.source.name ? d.source.name : d.source.rule;
//     var target = d.target.name ? d.target.name : d.target.rule;
//     return source+'-'+target;
// }

// function keyCell(d){
//     return d.row+'-'+d.col;
// }

// function strokeWidth(d){
//     var width = (4*d.source.weight);
//     return width+"px";
// }

// function colorLink(d){
//     var category = d.source;
//     if(category.depth==0) return "#eee";
//     while(category.depth!=1) category=category.parent;
//     //    console.log(category.ix);
//     return c20(category.ix);
// }

// function returnMaxMinScore(cells){
//     var score = [];
//     var weight = getHierarchicalWeight(d3.selectAll('.node').filter((r)=>key(r)==(cells[0] ? cells[0].row : cells.row)).data()[0]);

//     _.forEach(cells, function(d, i){
//         score.push(weight*d.gscore);
//         //        score.push(weight*d.gscore);
//     });
//     return { min: d3.min(score), max: d3.max(score)};
// }

// function returnMaxMinScoreGlobal(cells){
//     var score = [];
//     _.forEach(cells, function(d, i){
//         var leaf = d3.selectAll('.node').filter((r)=>key(r)==d.row).data()[0];
//         var famWeight = getHierarchicalWeight(leaf)*leaf.weight;
//         score.push(famWeight*d.gscore);

//     });
//     return { min: d3.min(score), max: d3.max(score)};
// }



// function returnColorScale(cell, cells=[]){
//     var nodeLeaf = d3.selectAll('.node').filter((d)=>key(d)==cell.row).data()[0];
//     //    console.log(nodeLeaf);
//     var familyWeight = getHierarchicalWeight(nodeLeaf)*nodeLeaf.weight;
//     switch(normal){
//         case "global":
//             cell.wscore = familyWeight*cell.gscore;
//             //            var cellsData = d3.selectAll('.cell').filter((d)=>d.row).data();
//             //            console.log("recalc");
//             //            var val = returnMaxMinScoreGlobal(cellsData);
//             //            console.log(val);
//             //            globalNormal = d3.scale.linear().domain([val.min, val.max]).range([0, 1]);
//             cell.normal = globalNormal(cell.wscore);
//             //            console.log(cell.wscore);
//             //            return colorScale(familyWeight*globalNormal(cell.gscore)); break;
//             return colorScale(globalNormal(cell.wscore)); break;
//         case "none":
//             cell.wscore = familyWeight*cell.gscore;
//             cell.normal = familyWeight*cell.gscore;
//             return colorScale(familyWeight*cell.gscore); break;
//         case "row":
//             //            console.log(cells);
//             cell.wscore = familyWeight*cell.gscore;
//             cell.normal = familyWeight*cell.gscore;
//             if(familyWeight!=0){
//                 if(cells.length<=0)
//                     cells = d3.selectAll('.cell').filter((d)=> {return(d.row==cell.row);}).data();
//                 var val = returnMaxMinScore(cells);
//                 var scale = d3.scale.linear().domain([val.min, val.max]).range([0, 1]);
//                 cell.normal = scale(cell.wscore);
//                 return colorScale(scale(cell.wscore));
//             } else{
//                 return colorScale(cell.wscore);
//             }break;
//         case "column":
//             cell.wscore = familyWeight*cell.gscore;
//             cell.normal = familyWeight*cell.gscore;
//             if(familyWeight==0){
//                 //                calculateMaxMinColumns();
//                 return colorScale(cell.wscore);
//                 break;
//             }
//             var scale = d3.scale.linear().domain([valColumns[cell.col].min, valColumns[cell.col].max]).range([0, 1]);
//             cell.normal = scale(cell.wscore);
//             return colorScale(scale(cell.wscore)); break;
//     }
// }

// function getMaxMinScoreColumn(col){
//     var cells = d3.selectAll('.cell').filter((d)=> {return(d.col==col);}).data();

//     var score = [];

//     _.forEach(cells, function(d, i){
//         var node = d3.selectAll('.node').filter((r)=>key(r)==d.row).data()[0];
//         var weight = getHierarchicalWeight(node)*(node.weight);
//         //        score.push(getHierarchicalWeight(d3.selectAll('.node').filter((r)=>key(r)==d.row).data()[0])*d.gscore);

//         score.push(weight*d.gscore);
//     });

//     return { min: d3.min(score), max: d3.max(score)};
//     //    return returnMaxMinScoreGlobal(cells.data());
// }


// function calculateMaxMinColumns(){
//     _.forEach(table.cols, (col,i)=>{
//         valColumns[col] = getMaxMinScoreColumn(col);;
//     });
// }

// function saveSelectedCells(){
//     //    console.log("saveSelec");
//     //    savedSelectedCells = new Set();

//     var cells = d3.selectAll('.selected').data();
//     //    cells.forEach((obj, i , array)=>{
//     //        savedSelectedCells.add(keyCell(obj));
//     //    });
//     //    console.log("savedSelectedCells");

// }

// function reloadSelectedCells(){
//     //    console.log("reloadSelectedCells");
//     //    console.log(savedSelectedCells);
//     if (savedSelectedCells.size>0){
//         var cell = d3.selectAll('.cell').filter((d)=>{return d.row?savedSelectedCells.has(keyCell(d)):false;});
//         cell.attr("class", "cell selected");
//     }
// }

// function calculateRowGScore(node, d){
//     var gCells = d3.select(node).selectAll(".cellg")
//     .data(table.table.filter((r)=>{ return r.row==d.rule; }))
//     .enter();

//     var cells = gCells.append("rect")
//     .attr('class', 'cell')
//     .attr("x", function(r, ri) {
//         return (cellSize+1)*table.cols.indexOf(r.col); })
//     .attr("y", 0)
//     .attr("width", cellSize)
//     .attr("height", cellSize);


//     cells.style("fill", function(r) {
//         var gscore = gScore(r.error_count, d.totError, countOtherLang(r.col), table.langCount[r.col].totError);
//         r.gscore = gscore.G;
//         r.expect = gscore.expect;
//         return returnColorScale(r, cells.data());
//     })
//         .on("click", (d)=>selectCell(d))
//         .on("mouseover", function(d){

//         d3.selectAll(".colLabel").classed("text-highlight",function(c,ci){
//             return ci==(table.cols.indexOf(d.col));
//         })
//         displayTooltip(d);
//     })
//         .on("mouseout", function(){
//         //        d3.selectAll(".lbExpect").filter((r)=>{return d==r;}).text("");
//         d3.select(this).classed("cell-hover",false);
//         d3.selectAll(".row").classed("text-highlight",false);
//         d3.selectAll(".colLabel").classed("text-highlight",false);
//         d3.select("#tooltip").classed("hidden", true);
//         d3.selectAll(".node").classed("text-highlight",false);
//     });
//     //    recalculateScoreScale();
// }

// function displayTooltip(d){
//     d3.select("#tooltip")
//         .style("left", (d3.event.pageX-300) + "px")
//         .style("top", (d3.event.pageY-300) + "px")
//         .style("white-space", "pre-line")
//         .select("#value")
//         .text("Error: "+d.row+" \n Column: "+d.col+"  \n Error count:"+d.value.toFixed(2)+" \n G-score:"+d.gscore.toFixed(2)+(d.wscore ? " \n Weighted score:"+d.wscore.toFixed(4) : "")+" \n Normalized score: "+d.normal.toFixed(2)+" \n Expectation:"+d.expect.toFixed(2));
//     //Show the tooltip
//     d3.select("#tooltip").classed("hidden", false);
// }


// function drawTree(_table, _margin, _maxRowLabel, _normal){
//     var width = treeWidth,
//         height = _table.rows.length*rowHeight;
//     normal = _normal;
//     table = _table;
//     margin = _margin;
//     table.cols = _.sortBy(table.cols);

//     min = 0;
//     max= 36;

//     colorScale = d3.scale.log()
//         .domain([min, max])
//         .range(colors).base(10);

//     maxRowLabel = _maxRowLabel;

//     $('#mainSVG').attr('height', height + 250);

//     var tree = table.tree;
//     cluster = d3.layout.cluster()
//         .size([height, width - 160])
//         .separation(function(a,b){
//         return 1;
//     });

//     var diagonal = d3.svg.diagonal()
//     .projection(function(d) { return [d.y, d.x]; });

//     svg = d3.select("#mainSVG")
//         .append("g")
//         .attr("id", "tree")
//         .attr("transform", "translate(40,"+margin.top+")");

//     root = tree;

//     var nodes = cluster.nodes(root),
//         links = cluster.links(nodes);


//     var grammar = -1;
//     nodes.forEach((d)=>{

//         if((d.children!=null)){ //not a leaf
//             if(key(d)=="Grammar")
//                 grammar=d.y;
//             if(d.children[0].children==null)
//                 d.y += 100;
//             if(d.parent==root)
//                 if(grammar!=-1)
//                     d.y = grammar;
//         }
//     });

//     var link = svg.selectAll(".link")
//     .data(links, keyLink)
//     .enter().append("path")
//     .attr("class", "link")
//     .style("stroke", (d)=>colorLink(d))
//     .style("stroke-width", (d)=>strokeWidth(d))
//     .attr("d", diagonal)
//     .on("mouseover", function(d){
//         unhighlight();
//         highlightFamily(d.target);
//     })
//     .on("mouseout", function(d){
//         unhighlight();
//     });

//     var node = svg.selectAll(".node")
//     .data(nodes, key)
//     .enter().append("g")
//     .attr("class", "node")
//     .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
//     .on("mouseover", function(d){
//         showSlider(d);
//         unhighlight();
//         highlightFamily(d);
//     })
//     .on("mouseout", function(d){
//         unhighlight();
//         mouseExit = true;
//         hideSlider();
//     })
//     .on("dblclick", function(d){(d.children) ? null : dblClick(d)});


//     widthRow = (18+maxRowLabel) + (cellSize+1)*table.cols.length;
//     calculateMaxMinColumns();
//     createRowsAndCells(node);
//     createNodeCircle(node);
//     appendNodeText(node);
//     //    nodeOverview();

//     recalculateScoreScale();
//     //    createHeader(svg);

//     d3.select(self.frameElement).style("height", height + "px");
// }

// function createRowsAndCells(node){
//     node.filter((d)=>{return (d.children) ? false : true;})
//         .append("rect")
//         .attr('class', 'backRowEven')
//         .attr("y", -5)
//         .attr("x", 5)
//         .attr("width", widthRow)
//         .attr("height", cellSize);

//     node.filter((d)=>{return (d.children) ? false : true;})
//         .append("g")
//         .attr("class",function(d) { return "heatMapRow"; })
//         .attr("transform", "translate(" + (18+maxRowLabel) + ",-5)")
//         .each(function(d){
//         d3.select(this).selectAll(".cell").remove();
//         if(d._children){
//             aggregateGscore(this, d);
//         }
//         else
//             calculateRowGScore(this, d);
//     });//each function

// }

// function createNodeCircle(node){
//     var drag = d3.behavior.drag()
//     .origin(function(d) { return d; })
//     .on("dragstart", dragstarted)
//     .on("drag", dragged)
//     .on("dragend", dragended);

//     createSlider(node.filter((d)=>{return d.children ? true : false}));
//     createSlider(node.filter((d)=>{return d.children ? false : true}));

//     node//.filter((d)=>{return (d.children || d._children) ? true : false;})
//         .append("circle")
//         .attr("r", circleRadius)
//         .attr("stroke-width", function(d) { return d._children ? "3px" : "1.5px"; })
//         .attr("stroke", "#666")
//         .on("mouseover", function(d){showSlider(d);})
//         .on("click", function(d){ click(d); })
//         .call(drag);
// }

// //----------------------------------SLIDE

// function dragstarted(d) {
//     d3.event.sourceEvent.stopPropagation();
//     d3.select(this).classed("dragging", true);
//     isDragging = true;
// }

// function dragged(d) {
//     var slider = d3.selectAll('.slider').filter((r)=>{return key(r)==key(d)});
//     var rect = slider.select("#sliderRect");
//     var text = slider.select("text");
//     var line = slider.select("line");

//     var diff = d3.event.y-d.y;
//     //    console.log(d3.event.y+"  "+d.y+"  "+ diff+ "  "+d3.event.dy);

//     if((diff>0) && (d.weight<=0)) {
//         d.weight=0;
//         text.text(d.weight.toFixed(2));
//         rect.attr("y", (d)=>returnSliderRectY(d.weight));
//         line.attr("y1", (d)=>returnSliderY1(d.weight));
//         line.attr("y2", (d)=>returnSliderY2(d.weight));
//         return;
//     }

//     if(diff<0 && d.weight>=1) {
//         d.weight=1;
//         text.text(d.weight.toFixed(2));
//         rect.attr("y", (d)=>returnSliderRectY(d.weight));
//         line.attr("y1", (d)=>returnSliderY1(d.weight));
//         line.attr("y2", (d)=>returnSliderY2(d.weight));
//         return;
//     }

//     d.weight-=d3.event.dy/100;

//     text.text(d.weight.toFixed(2));
//     rect.attr("y", parseFloat(rect.attr("y"))-parseFloat(d3.event.dy));
//     line.attr("y1", parseFloat(line.attr("y1"))-parseFloat(d3.event.dy));
//     line.attr("y2", parseFloat(line.attr("y2"))-parseFloat(d3.event.dy));
// }

// function dragended(d) {
//     isDragging = false;
//     d3.select(this).classed("dragging", false);
//     //    console.log("dragEND");
//     if(d.weight==0)
//         click(d);
//     else{
//         recalculateScoreScale();
//     }

//     if (mouseExit){
//         mouseExit = false;
//         hideSlider();
//     }
// }

// var slackHeight = 12, sliderGuide = 100, isDragging=false, mouseExit = false;


// function createSlider(node){
//     //    console.log("create slide");
//     var slider = node.append("g")
//     .attr("class", "slider");


//     var sliderHeight = sliderGuide+slackHeight, sliderWidth = 30;

//     slider.append('rect')
//         .attr("id", "sliderRect")
//         .attr("width", sliderWidth)
//         .attr("height", sliderHeight)
//         .attr("x", -(sliderWidth/2))
//         .attr("y", (d)=>returnSliderRectY(d.weight))
//         .fill("white");

//     slider.append("line")
//         .attr("x1", 0)
//         .attr("y1", (d)=>returnSliderY1(d.weight))
//         .attr("x2", 0)
//         .attr("y2", (d)=>returnSliderY2(d.weight))
//         .attr("stroke-width", 2)
//         .attr("stroke", "grey");

//     slider.append('rect')
//         .attr("id", "backsplash")
//         .attr("width", 30)
//         .attr("height", 15)
//         .attr("y", -8)
//         .attr("x", 6.5);

//     slider.append('text')
//         .attr("dy", 3)
//         .attr("dx", 7)
//         .style("text-anchor",  "start" )
//         .text(function(d){ return (d.weight) ? d.weight.toFixed(2): "0.00"});

// }

// function returnSliderRectY(w){
//     var yWeight1 = -slackHeight/2;
//     var diff = 1-w;
//     return parseInt(yWeight1-(diff*100));
// }

// function returnSliderY1(w){
//     var yWeight1 = slackHeight/2;
//     var diff = 1-w;
//     return parseInt(yWeight1-(diff*100));
// }

// function returnSliderY2(w){
//     var yWeight1 = sliderGuide - slackHeight/2;
//     var diff = 1-w;
//     return parseInt(yWeight1-(diff*100));
// }


// function hideSlider(slide){
//     if(isDragging) return;
//     $('#sliderVisible').attr("id", null);
// }
// //------------------------------------------------------------------------

// function showSlider(d){
//     if (isDragging==false){
//         var slider = d3.selectAll('.slider').filter((r)=>{return key(r)==key(d)});
//         slider.attr("id","sliderVisible");
//     }
// }



// var gsc = [];

// function dblClick(d){
//     reorderRows();
//     reloadSelectedCells();
// }

// function clickCol(d){ 
//     reorderRowsCol(d);
//     reloadSelectedCells();
// }

// function sibblingCollapse(data){ 
//     _.forEach(data.parent.children, (sib, i)=>{ click(sib)});
// }

// function reorderRowsCol(col){
//     saveSelectedCells();
//     var nodeUpdate = d3.selectAll('.node').filter((d)=>{return (d.children) ? false : true;});


//     var colCells = d3.selectAll('.cell').filter((d)=>{return d.col==col;}).data();
//     colCells = _.sortBy(colCells.map((d)=>d.normal));

//     var t = d3.selectAll('.node').filter((d)=>{return (d.children) ? false :
//     true;}).data();

//     t.forEach((d)=>{
//         var cData = d3.selectAll('.cell').filter((r)=>{return r.col==col ? (r.row==key(d) ? true : false): false}).data();

//         d.order = cData[0] ? cData[0].normal : -1;
//     });

//     var nodeX = _.sortBy(d3.selectAll('.node').filter((d)=>{return (d.children) ? false : true;}).data().map((d)=>d.x));

//     var dataUpdate = _.orderBy(t, 'order', 'desc');
//     //    var dataUpdate = _.orderBy(d3.selectAll('.node').filter((d)=>{return (d.children) ? false : true;}).data(), 'sumGscore', 'desc');
//     var pair = {};

//     dataUpdate.forEach((d,i)=>{pair[d.x] = nodeX[i]; d.x=nodeX[i];});

//     var link = d3.selectAll("path.link")
//     .filter((d)=>d.target.children ? false : true)[0];
//     //    console.log(pair);

//     var links = d3.selectAll(link).each((d,i)=>{
//         var val = _.filter(dataUpdate, {rule: d.target.rule});
//         if (val.length==0) var val = _.filter(dataUpdate, {name: d.target.name});
//         d.target.x = val[0].x;
//     });

//     nodeUpdate.selectAll('rect').remove();
//     nodeUpdate.selectAll('circle').remove();
//     nodeUpdate.selectAll('text').remove();
//     nodeUpdate.selectAll('.cell').remove();
//     nodeUpdate.selectAll('g').remove();
//     unhighlight();

//     createRowsAndCells(nodeUpdate);
//     createNodeCircle(nodeUpdate);
//     appendNodeText(nodeUpdate);

//     nodeUpdate.transition()
//         .duration(duration)
//         .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

//     links.transition()
//         .duration(duration)
//         .attr("d", diagonal);
//     recalculateScoreScale();
//     //    nodeOverview();
// }


// function reorderRows(){    
//     saveSelectedCells();
//     var nodeUpdate = d3.selectAll('.node').filter((d)=>{return (d.children) ? false : true;});

//     var nodeX = _.sortBy(d3.selectAll('.node').filter((d)=>{return (d.children) ? false : true;}).data().map((d)=>d.x));

//     var dataUpdate = _.orderBy(d3.selectAll('.node').filter((d)=>{return (d.children) ? false : true;}).data(), 'normalWScore', 'desc');
//     //    var dataUpdate = _.orderBy(d3.selectAll('.node').filter((d)=>{return (d.children) ? false : true;}).data(), 'sumGscore', 'desc');
//     var pair = {};

//     dataUpdate.forEach((d,i)=>{pair[d.x] = nodeX[i]; d.x=nodeX[i];});

//     var link = d3.selectAll("path.link")
//     .filter((d)=>d.target.children ? false : true)[0];
//     //    console.log(pair);

//     var links = d3.selectAll(link).each((d,i)=>{
//         var val = _.filter(dataUpdate, {rule: d.target.rule});
//         if (val.length==0) var val = _.filter(dataUpdate, {name: d.target.name});
//         d.target.x = val[0].x;
//     });

//     nodeUpdate.selectAll('rect').remove();
//     nodeUpdate.selectAll('circle').remove();
//     nodeUpdate.selectAll('text').remove();
//     nodeUpdate.selectAll('.cell').remove();
//     nodeUpdate.selectAll('g').remove();
//     unhighlight();

//     createRowsAndCells(nodeUpdate);
//     createNodeCircle(nodeUpdate);
//     appendNodeText(nodeUpdate);

//     nodeUpdate.transition()
//         .duration(duration)
//         .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

//     links.transition()
//         .duration(duration)
//         .attr("d", diagonal);
//     recalculateScoreScale();
//     //    nodeOverview();
// }

// function aggregateGscore(node, d){
//     //    console.log(node);
//     d3.select(node).selectAll(".cell").remove();
//     var leaves = returnLeaves(d._children);
//     var cells = d3.select(node).selectAll(".cell")
//     .data(getAggregatedCell(leaves, d.name))
//     .enter()
//     .append("rect")
//     //    .each((d,i)=>console.log(d))
//     .attr('class', 'cell')
//     .attr("x", function(r, ri) {
//         return (cellSize+1)*table.cols.indexOf(r.col);
//     })
//     .attr("y", 0)
//     .attr("width", cellSize)
//     .attr("height", cellSize);

//     cells.style("fill", function(r) {
//         var gscore = gScore(r.error_count, d.totError, countOtherLang(r.col), table.langCount[r.col].totError);

//         r.gscore = gscore.G;
//         r.expect = gscore.expect;
//         return "green";
//         //        return returnColorScale(r, cells.data());
//     }).on("click", (d)=>selectCell(d))
//         .on("mouseover", function(d){
//         d3.selectAll(".colLabel").classed("text-highlight",function(c,ci){
//             return ci==(table.cols.indexOf(d.col));
//         });
//         d3.select("#tooltip")
//             .style("left", (d3.event.pageX-300) + "px")
//             .style("top", (d3.event.pageY-300) + "px")
//             .style("white-space", "pre-line")
//             .select("#value")
//             .text("Error: "+d.row+" \n Column: "+d.col+"  \n Error count:"+d.error_count.toFixed(2)+" \n G-score:"+d.gscore.toFixed(2)+(d.wscore ? " \n Weighted score:"+d.wscore.toFixed(4) : "")+" \n Normalized score: "+d.normal.toFixed(2)+" \n Expectation:"+d.expect.toFixed(2));
//         //Show the tooltip
//         d3.select("#tooltip").classed("hidden", false);
//     })
//         .on("mouseout", function(){
//         d3.select(this).classed("cell-hover",false);
//         d3.selectAll(".row").classed("text-highlight",false);
//         d3.selectAll(".colLabel").classed("text-highlight",false);
//         d3.select("#tooltip").classed("hidden", true);
//         d3.selectAll(".node").classed("text-highlight",false);
//     });

//     //    r.gscore = gScore(r.error_count, d.totError, countOtherLang(r.col), table.langCount[r.col].totError);
//     //    console.log(leaves);
// }

// function getAggregatedCell(leaves, row){
//     var rows = new Set();
//     _.forEach(leaves, (l, i)=>{ rows.add(l.rule);});
//     //    console.log(rows);
//     var data = table.table.filter((r)=>{ return rows.has(r.row)});
//     var aggregate = _(data)
//     .groupBy('col')
//     .map((objs, key)=>({
//         'col': key,
//         'row': row,
//         'error_count': _.sumBy(objs, 'error_count'),
//         'file_count': _.sumBy(objs, 'file_count')
//     }))
//     .value();
//     //    console.log(aggregate);
//     return aggregate;
// }

// function aggregateWeight(objs){
//     var weight = 1;
//     _.forEach(objs, (d)=>weight*getHierarchicalWeight(d));
//     return weight;
// }

// function returnLeaves(children){
//     var leaf = [], kid = [];
//     for(i in children){
//         if(children[i]._children)
//             for(c in children[i]._children)
//                 kid.push(children[i]._children[c]);
//         else{
//             if(children[i].children)
//                 for(c in children[i].children)
//                     kid.push(children[i].children[c]);
//             else
//                 leaf.push(children[i]);
//         }
//     }
//     while(kid.length>0){
//         var aux = kid.pop();
//         if(aux._children)
//             for(c in aux._children)
//                 kid.push(aux._children[c]);
//         else if(aux.children)
//             for(c in aux.children)
//                 kid.push(aux.children[c]);
//         else
//             leaf.push(aux);
//     }
//     return leaf;
// }

// function gScore(A, sumAB, D, C){
//     var B = sumAB - A;
//     var sumCD = C + D;
//     var E1 = C*sumAB/sumCD;
//     var E2 = D*sumAB/sumCD;
//     if(B>0)
//         var G = 2*(A*Math.log(A/E1)+B*Math.log(B/E2));
//     else
//         var G = 2*(A*Math.log(A/E1));

//     //    console.log(" A "+A+"B "+B+" C "+C+" D "+D+" E1 "+E1+" E2 "+E2+" G "+G);
//     gsc.push(G);
//     //    console.log(gsc);
//     if (isNaN(G))
//         G = 0;
//     return {'G': G, 'expect': A-E1};
// }

// function countOtherLang(language){
//     var count = 0;
//     for(i in table.langCount){
//         if(i!=language)
//             count+=table.langCount[i].totError;
//     }
//     return count;
// }

// function orderCols(numNodes=0){
//     alpha = !alpha;
//     if(alpha){
//         table.cols = _.sortBy(table.cols);
//     }else{
//         table.cols = _.orderBy(table.langCount, 'sumGscore', 'desc').map(d => d.key);
//     } 
//     update(numNodes);
// }

// function createHeader(svg){
//     d3.select('#gcolHeader').remove();
//     d3.select('#leg').remove();

//     var g = d3.selectAll('.node').filter((d)=>{return (d.children) ? false :  ((d._children) ? false : true);})[0];

//     if(g.length>0)
//         var marginLeft = d3.transform(d3.select(g[0]).attr("transform")).translate[0];
//     else
//         var marginLeft = 1040;

//     var header = svg.append("g").attr("id", "gcolHeader");
//     header.append("rect")
//         .attr("id","colHeader")
//         .attr("fill", "white")
//         .attr("width", margin.top)
//         .attr("height",  2000)
//         .attr("transform", "rotate (-90)")
//         .attr("x",0)
//         .attr("y",0);

//     var colLabels = header
//     .selectAll(".colLabelg")
//     .data(table.cols)
//     .enter()
//     .append("text")
//     .text(function (d) { return d; })
//     .attr("x", 0)
//     .attr("y", function (d, i) { return ((i) * (cellSize+1)); })
//     .style("text-anchor", "left")
//     .attr("transform", "translate("+(marginLeft+(18+maxRowLabel)+(cellSize)/2) + ",-6) rotate (-90)")
//     .attr("class",  function (d,i) { return "colLabel mono c"+i;} )
//     .on("mouseover", function(d) {d3.select(this).classed("text-hover",true);})
//     .on("mouseout" , function(d) {d3.select(this).classed("text-hover",false);})
//     .on("dblclick", function(d){ orderCols();})
//     .on("click", function(d){ clickCol(d);});

//     var legend = svg.append("g").attr("id","leg")
//     .attr("class", "legendLog")
//     .attr("transform", "translate("+(marginLeft+widthRow+50)+","+0+")");

//     var logLegend = d3.legend.color()
//     .cells(10)
//     .scale(colorScale);

//     svg.select(".legendLog")
//         .call(logLegend);

//     var controlPane = svg.append('g').attr("id", "controlPanel")
//     .attr("transform", "translate("+(marginLeft+widthRow+50)+",210)");

//     controlPane.append('text')
//         .attr("id", "txSelectAll")
//         .attr("class", "hipLink")
//         .attr("class", "clickable")
//         .text("Select all")
//         .attr("dx", "0")
//         .attr("dy", "0")
//         .on("click", (d)=>{
//         d3.selectAll('.cell').filter((r)=>r.row).classed('selected', true);
//         d3.selectAll('.node').filter((r)=>{return r.children?false:true;}).classed('selectedLbl', true);
//         d3.selectAll('.cell').filter((r)=>r.row).data().forEach((obj, i, array)=>{
//             savedSelectedCells.add(keyCell(obj));
//         });

//     });

//     controlPane.append('text')
//         .attr("id", "txDeselectAll")
//         .attr("class", "hipLink")
//         .attr("class", "clickable")
//         .text("Clear selection")
//         .attr("dx", "0")
//         .attr("dy", "15")
//         .on("click", (d)=>{
//         d3.selectAll('.cell').filter((r)=>r.row).classed('selected', false);       
//         d3.selectAll('.node').filter((r)=>{return r.children?false:true;}).classed('selectedLbl', false);
//         savedSelectedCells = new Set();
//     });


//     controlPane.append('rect')
//         .style('stroke', 'black')
//         .style('fill', 'none')
//         .attr("class", "hipLink")
//         .attr("class", "clickable")
//         .attr('height', '30px')
//         .attr("dx", "0")
//         .attr("y", "35px")
//         .attr('width', '100px');

//     controlPane.append('text')
//         .attr('id', 'btFilter')
//         .style('fill', 'black')
//         .attr("class", "hipLink")
//         .attr("class", "clickable")
//         .attr("dx", "30")
//         .attr("dy", "53")
//         .text("Filter")
//         .on('click', (d)=>{clickFilter();});



//     reloadSelectedCells();

//     //treating scroll for freezing the header
//     $("#chart").on("scroll", function(){
//         $('#colHeader').attr('x', cellSize - this.scrollTop);
//         colLabels.attr('x', cellSize - this.scrollTop);
//         legend.attr("transform", "translate("+(marginLeft+widthRow+50)+","+this.scrollTop+")");
//         controlPane.attr("transform", "translate("+(marginLeft+widthRow+50)+","+(210+this.scrollTop)+")");
//         //        button.attr("transform", "translate("+(marginLeft+widthRow+50)+","+(250+this.scrollTop)+")");
//     });
// }

// function clickFilter(){
//     var cells = d3.selectAll('.selected');
//     if (cells.size()>0){
//         var cellKey = [];
//         cells.data().forEach((obj, i, array)=>{
//             cellKey.push({row: obj.row, col:obj.col});
//         });
//         console.log(cellKey);
//         $.post( "/standReqEssays/db/toefl", {cell: cellKey}, function(data) {
//             console.log(data);
//             var table = $('#datatable').DataTable();
//             table.clear();
//             table.rows.add(data).draw(); 
//         }, "json");
//     }else
//         alert("You must select data first!");
// }

// //returns weights for parents of nodes not included itself
// function getHierarchicalWeight(node){
//     var familyWeight = [];

//     while(node.parent){
//         familyWeight.push(node.parent.weight);
//         node = node.parent;
//     }
//     var globalWeight = 1;
//     _.forEach(familyWeight, function(d,i){
//         globalWeight*=d;
//     });

//     return globalWeight;
// }

// function getHierarchicalWeight2(node){
//     var familyWeight = [];
//     //    console.log(node);

//     while(node.parent){
//         familyWeight.push(node.parent.weight);
//         node = node.parent;
//     }
//     //    console.log(familyWeight);
//     var globalWeight = 1;
//     _.forEach(familyWeight, function(d,i){
//         globalWeight*=d;
//     });
//     //    console.log(globalWeight);
//     return globalWeight;
// }

// d3.selection.prototype.moveToFront = function() {
//     return this.each(function(){
//         this.parentNode.appendChild(this);
//     });
// };

// function unhighlight(){
//     d3.selectAll('.highlightRow').attr('class', "backRowEven");
//     d3.selectAll(".node").classed("text-highlight",false);
//     d3.selectAll(".link").classed("highlink",false);
// }

// function highlightAncestors(node){
//     var family = new Set();
//     while (node.depth>0){//highlighting family
//         family.add(node);
//         node = node.parent;
//     }
//     family.add(node);
//     var nodes = d3.selectAll('.node')
//     .filter(function(d, i){return family.has(d);});

//     nodes.classed("text-highlight", "true");

//     var rows = d3.selectAll('.node')
//     .filter(function(d, i){return (family.has(d) && !d.children);});

//     rows.selectAll('.backRowEven').attr('class', "highlightRow");

//     var links = d3.selectAll('.link')
//     .filter(function(d, i){return family.has(d.target);});

//     links.classed("highlink", "true");
// }

// function highlightFamily(node){
//     if(node.children==null)
//         highlightAncestors(node);
//     else{
//         for(i in node.children)
//             highlightFamily(node.children[i]);
//     }
// }

// function click(d) {
//     var numNodes = 0;
//     alpha = false;
//     if (!d.parent)
//         return collapse(d);
//     if (d.children) {
//         d._children = d.children;
//         numNodes = -1*returnLeaves(d.children).length;
//         d.children = null;
//     } else {
//         d.children = d._children;
//         numNodes = returnLeaves(d._children).length;
//         d._children = null;
//     }
//     orderCols(numNodes);
//     reloadSelectedCells();
// }

// function collapse(root){
//     console.log(root);
//     for(i in root.children)
//         //        if(!root.children[i]._children)
//         click(root.children[i]);

// }

// function countLeaves(nodes){
//     var count = 0, maxLabel = 0;

//     nodes.forEach(function(d, i){
//         if(!d.children){ //if leaf
//             count++;
//             var width = getWidth(d.name ? d.name : d.rule);
//             maxLabel = maxLabel>width ? maxLabel : width;
//         }
//     });
//     maxRowLabel = maxLabel;
//     return count;
// }


// function update(delta=0) {
//     var width = treeWidth,
//         //        height = countLeaves(d3.selectAll('.node').data())*rowHeight;
//         height = (delta+countLeaves(d3.selectAll('.node').data()))*rowHeight;
//     //    height = table.rows.length*rowHeight;

//     $('#mainSVG').attr('height', height + 250);

//     var diagonal = d3.svg.diagonal()
//     .projection(function(d) { return [d.y, d.x]; });

//     cluster = d3.layout.cluster()
//         .size([height, width - 160])
//         .separation(function(a,b){
//         return 1;
//     });
//     d3.selectAll('.cell').remove();
//     var nodes = cluster.nodes(table.tree),
//         links = cluster.links(nodes);

//     //placing the category nodes int he same position
//     var grammar = -1;
//     nodes.forEach((d)=>{
//         if((d.children!=null)){ //not a leaf
//             if(key(d)=="Grammar")
//                 grammar=d.y;
//             if(d.children[0].children==null)
//                 d.y += 100;
//             if(d.parent==root)
//                 if(grammar!=-1)
//                     d.y = grammar;
//         }
//     });

//     var node = svg.selectAll(".node").data(nodes, key);

//     var nodeEnter = node.enter()
//     .append("g")
//     .attr("class", "node")
//     .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
//     .on("mouseover", function(d){
//         showSlider(d);
//         unhighlight();
//         highlightFamily(d);
//     })
//     .on("mouseout", function(d){
//         unhighlight();
//         mouseExit = true;
//         hideSlider();
//     })
//     .on("dblclick", function(d){(d.children) ? null : dblClick(d)});

//     createRowsAndCells(nodeEnter);
//     createNodeCircle(nodeEnter);
//     appendNodeText(nodeEnter);



//     //--------------------------------------------



//     // Transition nodes to their new position.
//     var nodeUpdate = node;

//     nodeUpdate.selectAll('rect').remove();
//     nodeUpdate.selectAll('circle').remove();
//     nodeUpdate.selectAll('text').remove();
//     nodeUpdate.selectAll('g').remove();
//     nodeUpdate.selectAll('.cell').remove();
//     unhighlight();


//     createRowsAndCells(nodeUpdate);
//     createNodeCircle(nodeUpdate);
//     appendNodeText(nodeUpdate);

//     nodeUpdate.transition()
//         .duration(duration)
//         .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
//     ;

//     // Transition exiting nodes to the parent's new position.
//     var nodeExit = node.exit().remove();

//     // Update the links…
//     var link = svg.selectAll("path.link")
//     .data(links, keyLink);

//     // Enter any new links at the parent's previous position.
//     link.enter().insert("path", "g")
//         .attr("class", "link")
//         .style("stroke", (d)=>colorLink(d))
//         .attr("d", diagonal)
//         .on("mouseover", function(d){
//         unhighlight();
//         highlightFamily(d.target);
//     })
//         .on("mouseout", function(d){
//         unhighlight();
//     });


//     // Transition links to their new position.
//     link.transition()
//         .duration(duration)
//         .attr("d", diagonal);

//     // Transition exiting nodes to the parent's new position.
//     link.exit().remove();

//     recalculateScoreScale();

//     reloadSelectedCells();

//     d3.select('#gcolHeader').moveToFront();
// }

// function appendNodeText(node){
//     node.append("text")
//         .attr("dx", function(d) { return d.children ? -8: 8+(maxRowLabel-getWidth(d.name ? d.name : d.rule)) })
//         .attr("dy", 3)
//         .style("text-anchor", function(d) { return d.children ? "end" : "start"; })
//         .attr("class", function(d){ return d.children ? "parent" : "row";})
//         .text(function(d){ return (d.children || d._children) ? d.name : d.rule;})
//         .on("click", function(d){(d.children) ? click(d) : selectRow(d)})  
//         .on("mouseover", function(d){(d.children) ? showSlider(d) : null});

// }

// function selectRow(row){    
//     var node = d3.selectAll('.node').filter((d)=>key(d)==key(row));
//     node.classed('selectedLbl', !(node.classed('selectedLbl')));
//     var cells = node.selectAll('.cell');
//     cells.classed('selected', (node.classed('selectedLbl')));
//     cells.data().forEach(function(d) {
//         console.log(d);
//         if(savedSelectedCells.has(keyCell(d))) {
//             savedSelectedCells.delete(keyCell(d));
//         } else {
//             savedSelectedCells.add(keyCell(d));
//         }
//     })
// }

// function selectCell(cellD){    
//     var cell = d3.selectAll('.cell').filter((d)=>keyCell(d)==keyCell(cellD));
//     var row = d3.selectAll('.node').filter((d)=>key(d)==cellD.row);
//     if (cell.classed('selected')){ //its already selected, so deselect
//         cell.classed('selected', false);
//         row.classed('selectedLbl', false);
//         savedSelectedCells.delete(keyCell(cell.data()[0]));
//     }else{
//         savedSelectedCells.add(keyCell(cell.data()[0]));
//         if ((row.selectAll('.cell')[0].length)==(row.selectAll('.selected')[0].length+1))
//             selectRow(row.data()[0]);
//         else
//             cell.classed('selected', true);
//     } 
// }


// function recalculateScoreScale(){
//     var cells = d3.selectAll('.cell').filter((d)=>d.row);
//     //    cells.forEach((d)=>d.order=null);
//     var cellsData = cells.data();
//     console.log("recalc");
//     var val = returnMaxMinScoreGlobal(cellsData);
//     min = val.min;
//     max = val.max;
//     console.log(val);
//     globalNormal = d3.scale.linear().domain([min, max]).range([0, 1]);
//     //    console.log(globalNormal);
//     if(normal=="none")
//         colorScale = d3.scale.linear().domain([min, max]).range(colors);
//     else
//         colorScale = d3.scale.linear().domain([0, 1]).range(colors);
//     if(normal=="column")
//         calculateMaxMinColumns();
//     cells.style("fill", (d)=>returnColorScale(d));
//     linkWeight();
//     nodeOverview();
// }

// function linkWeight(){
//     var nodes = d3.selectAll('.node').filter(function(d){return d.weight!=1;}).data();
//     _.forEach(nodes, (node,i)=>d3.selectAll('.link').filter((d)=>{key(node)==key(d.source)}).attr("stroke-width", 4*node.weight));

// }

// function nodeOverview(){
//     var rows = d3.selectAll('.node').filter((d)=>d.children ? false : true)
//     .each(function(d, i){
//         var cell = d3.select(this).selectAll(".cell").data();
//         d.sumGscore = _.sumBy(cell, 'gscore');
//         var parent = d.parent;
//         while(parent){//find parent in the samel level get min max for normalization
//             parent.sumGscore = _.sumBy(parent._children ? parent._children : parent.children, 'sumGscore');
//             parent = parent.parent;
//         }
//     });

//     var nodes = d3.selectAll('.node').data();
//     var rootScore = _.max(nodes.map((d)=>d.sumGscore));

//     //   calculateWeightNormalScore(root);
//     calculateWeightPerCategoryLevel(root);

//     //calculate weight score for leaves
//     var leaves = d3.selectAll('.node').filter((d)=>{return d.children ? false : true;});
//     var cat = leaves.data();
//     var maxCat = _.max(cat.map((d)=>getHierarchicalWeight(d)*d.sumGscore*d.weight));
//     var minCat = _.min(cat.map((d)=>getHierarchicalWeight(d)*d.sumGscore*d.weight));

//     leaves.each(function(d, i){
//         var normal = d3.scale.linear().domain([minCat, maxCat]).range([0, 1]);
//         d.normalWScore = normal(getHierarchicalWeight(d)*d.sumGscore*d.weight);
//     });

//     d3.selectAll('.node circle').attr('r',(d)=> {return circleRadius});
//     d3.selectAll('.node circle').attr('fill',(d)=> {return colorScale(d.normalWScore)});

//     sumGscoreLanguages();
//     //    recalculateScoreScale();

// }

// function calculateWeightPerCategoryLevel(node){
//     calculateWeightNormalScore(node);
//     _.forEach(node.children, function(kid, i){
//         if(kid.children){
//             calculateWeightPerCategoryLevel( kid);
//         }
//         calculateWeightNormalScore(kid);
//     });
// }

// function calculateWeightNormalScore(father){
//     var category = d3.selectAll(".node").filter((d)=>{return d.parent==father}).data();
//     var maxCat = _.max(category.map((d)=>getHierarchicalWeight(d)*d.sumGscore*d.weight));
//     var minCat = _.min(category.map((d)=>getHierarchicalWeight(d)*d.sumGscore*d.weight));
//     d3.selectAll(".node").filter((d)=>{return d.parent==father}).each(function(d, i){
//         var normal = d3.scale.linear().domain([minCat, maxCat]).range([0, 1]);
//         d.normalWScore = normal(getHierarchicalWeight(d)*d.sumGscore*d.weight);
//     });
// }

// function sumGscoreLanguages(){
//     _.forEach(table.langCount, function(obj, key){
//         var cell = d3.selectAll('.cell').filter((d)=>d.col==key).data();
//         obj.sumGscore = _.sumBy(cell, 'gscore');
//     });
//     createHeader(svg);
// }
