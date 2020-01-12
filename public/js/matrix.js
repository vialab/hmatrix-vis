function toggleSidebar() {
    $(".stage").toggleClass("col-sm-9 col-sm-12");
    $(".sidebar").toggleClass("collapsed-bar");
}


function draw(){
    var p = {
        dataset : $('#dataset option:selected').val(),
        level: "rule", 
        orderCol: "alpha", 
        orderRow: "alpha", 
        normal: $('#normal option:selected').val(),
        APIURL: ""
    };
    console.log(p);
    $('#load-overlay').show();
    drawMatrix(p);
}

SVGheight = 4000, treeWidth = 1200;

function drawMatrix(param){
    $.post(param.APIURL+"/loadMatrix/", param).done(function(table) {        
        console.log("Got data");
        console.log(table);        
        $('#chart').html("");
        var margin = { top: 100, right: 10, bottom: 50, left: treeWidth };
        var svg = d3.select("#chart").append("svg").attr("id", "mainSVG")
        .attr("width", 1800)        
        .attr("height", SVGheight)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        var maxRowLabel = 0;
        (table.rows).forEach(function (d,i){
            if(getWidth(d)>maxRowLabel)
                maxRowLabel = getWidth(d)
        });
        drawTree(table, margin, maxRowLabel, param.normal, param.APIURL);
        $('#load-overlay').hide();
    });   
}

var colorScale, rowLabel, colLabel;
var cellSize = 12;



function createMatrix(table, margin, maxRowLabel){   

    var leaves = d3.selectAll(".row").data().sort(function(x, y){
        return d3.ascending(x.x, y.x);
    });
    table.rows = leaves.map((d)=>d.name ? d.name : d.rule);

    //    console.log(maxRowLabel);


    //    var cellSize = Math.round((SVGheight-100)/table.rows.length);
    var end_color = 'seashell',
        start_color = '#1f1b84';  
    var marginLeft = margin.left + maxRowLabel-100;
    col_number=table.cols.length;    
    row_number=table.rows.length;
    width = cellSize*col_number; 
    height = cellSize*row_number;

    legendElementWidth = cellSize*2.5;
    colorBuckets = 21;
    colors = [start_color, end_color];

    rowLabel = table.rows; 
    colLabel = table.cols; 
    console.log(rowLabel);

    var data = table.table;

    var min = (d3.min(data, function(d) { return d.value; }));
    var max = (d3.max(data, function(d) { return d.value; }));

    //    console.log(min +" "+max);
    colorScale = d3.scale.log()
        .domain([min, max])
        .range(colors);

    $("#matrix").remove();
    console.log(margin.top);
    var svg = d3.select("#mainSVG")     
    .append("g").attr("id","matrix")
    .attr("transform", "translate(" + marginLeft + "," + margin.top + ")");

    var rowSortOrder=false;
    var colSortOrder=false;
    var rowSet = new Set(rowLabel);
    var rows = d3.selectAll(".row")
    .on("mouseover", function(d) { d3.select(this).classed("text-hover",true);})
    .on("mouseout" , function(d) {d3.select(this).classed("text-hover",false);});

    var heatMap = svg.append("g").attr("class","g3")
    .selectAll(".cellg")
    .data(data.filter(function(d){return rowSet.has(d.row);}))
    .enter()
    .append("rect")
    .attr("x", function(d, i) {  return colLabel.indexOf(d.col) * cellSize; })
    .attr("y", function(d, i) {
        var r = rowLabel.indexOf(d.row);
        return r * cellSize + (r) * 1.045; 
    })
    .attr("class", function(d){return "cell cell-border cr"+(2-1)+" cc"+(colLabel.indexOf(d.col)-1);})
    .attr("width", cellSize)
    .attr("height", cellSize)    
    .attr("value", function(d) {return d.value})
    .style("fill", function(d) {return colorScale(d.value); })
    .on("mouseover", function(d){
        //highlight text
        d3.select(this).classed("cell-hover",true);
        unhighlight();
        d3.selectAll(".row").classed("text-highlight",function(r,ri){ 
            if (ri==(rowLabel.indexOf(d.row))){
                highlightAncestors(r);                         
                return true;
            }
            return false;
        });  

        d3.selectAll(".colLabel").classed("text-highlight",function(c,ci){             
            return ci==(colLabel.indexOf(d.col));
        });

        //Update the tooltip position and value
        d3.select("#tooltip")
            .style("left", (d3.event.pageX+10) + "px")
            .style("top", (d3.event.pageY-10) + "px")
            .select("#value")
            .text("lables:"+d.row+","+d.col+"\ndata:"+d.value+"\nrow-col-idx:"+colLabel.indexOf(d.col)+","+rowLabel.indexOf(d.row)+"\ncell-xy "+this.x.baseVal.value+", "+this.y.baseVal.value);  
        //Show the tooltip
        d3.select("#tooltip").classed("hidden", false);
    })
    .on("mouseout", function(){
        d3.select(this).classed("cell-hover",false);
        d3.selectAll(".row").classed("text-highlight",false);
        d3.selectAll(".colLabel").classed("text-highlight",false);        
        d3.select("#tooltip").classed("hidden", true);
        d3.selectAll(".node").classed("text-highlight",false);
    });



    //-----------------------------





    //------------------------

    //creating static header
    var header = svg.append("g");

    header.append("rect")
        .attr("id","colHeader")
        .attr("fill", "white")
        .attr("width", margin.top)
        .attr("height",  2000)
        .attr("transform", "rotate (-90)")    
        .attr("x",0)
        .attr("y",-marginLeft);


    var colLabels = header    
    .selectAll(".colLabelg")
    .data(colLabel)
    .enter()  
    .append("text")
    .text(function (d) { return d; })
    .attr("x", 0)
    .attr("y", function (d, i) { return ((i) * cellSize); })
    .style("text-anchor", "left")    
    .attr("transform", "translate("+cellSize/2 + ",-6) rotate (-90)")
    .attr("class",  function (d,i) { return "colLabel mono c"+i;} )
    .on("mouseover", function(d) {d3.select(this).classed("text-hover",true);})
    .on("mouseout" , function(d) {d3.select(this).classed("text-hover",false);})
    .on("click", function(d,i) {
        //        colSortOrder=!colSortOrder;  
        //        sortbylabel("c",i,colSortOrder);
        //        d3.select("#order").property("selectedIndex", 4).node().focus();
    })
    ;

    //creating legend
    var log = d3.scale.log()
    .domain([min, max ])
    .range([start_color, end_color]);

    var legend = svg.append("g").attr("id","leg")
    .attr("class", "legendLog")
    .attr("transform", "translate("+(marginLeft)+","+0+")");

    var legendLabels;
    if($('#dataset option:selected').val()=="toefl")
        legendLabels = [1, 10, 50, 200, 300, 700, 1000, 2000, 3698];
    else
        legendLabels = [1, 10, 50, 200, 300, 700, 1000, 1818];

    var logLegend = d3.legend.color()
    .cells(legendLabels)
    .scale(log);

    svg.select(".legendLog")
        .call(logLegend);

    //treating scroll for freezing the header
    $("#chart").on("scroll", function(){ 
        $('#colHeader').attr('x', 10 - this.scrollTop);
        colLabels.attr('x', 10 - this.scrollTop);
        legend.attr("transform", "translate("+(marginLeft)+","+this.scrollTop+")");        
    });

}

function updateMatrix(table){
    var leaves = d3.selectAll(".row").data();
    table.rows = leaves.map((d)=>d.name ? d.name : d.rule);

    rowLabels = table.rows;
    colLabels = table.cols;

    var heatMap = d3.selectAll(".cellg");

    heatMap.selectAll('rect').remove();

    heatMap
    //    .enter()
        .append("rect")
        .attr("x", function(d, i) {  return colLabel.indexOf(d.col) * cellSize; })
        .attr("y", function(d, i) {
        var r = rowLabel.indexOf(d.row);
        return r * cellSize + (r) * 1.045; 
    })
        .attr("class", function(d){return "cell cell-border cr"+(2-1)+" cc"+(colLabel.indexOf(d.col)-1);})
        .attr("width", cellSize)
        .attr("height", cellSize)    
        .attr("value", function(d) {return d.value})
        .style("fill", function(d) {return colorScale(d.value); })
        .on("mouseover", function(d){
        //highlight text
        d3.select(this).classed("cell-hover",true);
        unhighlight();
        d3.selectAll(".row").classed("text-highlight",function(r,ri){ 
            if (ri==(rowLabel.indexOf(d.row))){
                highlightAncestors(r);                         
                return true;
            }
            return false;
        });  

        d3.selectAll(".colLabel").classed("text-highlight",function(c,ci){             
            return ci==(colLabel.indexOf(d.col));
        });

        //Update the tooltip position and value
        d3.select("#tooltip")
            .style("left", (d3.event.pageX+10) + "px")
            .style("top", (d3.event.pageY-10) + "px")
            .select("#value")
            .text("lables:"+d.row+","+d.col+"\ndata:"+d.value+"\nrow-col-idx:"+colLabel.indexOf(d.col)+","+rowLabel.indexOf(d.row)+"\ncell-xy "+this.x.baseVal.value+", "+this.y.baseVal.value);  
        //Show the tooltip
        d3.select("#tooltip").classed("hidden", false);
    })
        .on("mouseout", function(){
        d3.select(this).classed("cell-hover",false);
        d3.selectAll(".row").classed("text-highlight",false);
        d3.selectAll(".colLabel").classed("text-highlight",false);        
        d3.select("#tooltip").classed("hidden", true);
        d3.selectAll(".node").classed("text-highlight",false);
    }).transition()
        .duration(3000);


}

function getWidth(str){
    //    $('#widthTest').html(str);
    var span = document.getElementById("widthTest");
    span.innerHTML = str;    
    return span.offsetWidth; 
}