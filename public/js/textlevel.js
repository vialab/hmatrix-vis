var essayErrors = [];
var hoverTimeout = null;

function tagErrorText(errors, essay){
    //    var spanID = 0;
    essayErrors = errors;
    var text = essay.content;
    var newContent = "";
    var lastEnd = 0;
    errors.forEach(function(obj, i, array){
        var error = obj.context_text.slice(obj.context_offset, obj.context_offset+obj.context_length);
        var spanBegin = text.indexOf(error, obj.offset);
        var spanEnd = spanBegin+obj.context_length+1;
        var textChunk = text.substring(spanBegin, spanEnd-1);
        textChunk = "<span id='error"+i+"' class='errortag "+obj.category+"' onmouseover='hoverError(event, this)' onmouseout='unhoverSpan()' style='background-color:" + c20(obj.category) + ";'>" + textChunk + "</span>";
        if(newContent == "") {
            newContent += text.substring(0, spanBegin);
        } else {
            newContent += text.substring(lastEnd, spanBegin);
        }
        lastEnd = spanEnd-1;
        newContent += textChunk;   
    });
    if(lastEnd < text.length) {
        newContent += text.substring(lastEnd, text.length-1);
    }
    $('#pnEssay').html(newContent.replace(/(?:\r\n|\r|\n)/g, '<BR>'));
    $('#load-overlay').hide();
}

function hoverTableEssay(event, errors){
    clearTimeout(hoverTimeout);
    var msg = "Errors found: "+errors.length+" <br> ";
    errors.forEach(function (obj, i, array){
        var err = obj.context_text.splice(obj.context_offset+obj.context_length, 0, "</span>")
        err = err.splice(obj.context_offset, 0, "<span  class='errortag "+obj.category+"' style='background-color:" + c20(obj.category) + ";'>");
        msg+=err +" <br> ";
    });
    hoverTimeout = setTimeout(()=>{hoverSpan(event, msg, "600px")}, 500);
}


function hoverError(event, span) {
    var id = parseInt($(span).attr("id").replace("error", ""));
    var error = essayErrors[id];
    console.log(error);
    var msg = "Error category: " + error.category +"<br>" + 
        (error.subcategory ? "Error subcategory: "+error.subcategory+"<br>": "") + 
        (error.subcategory!="" && error.subcategory!=error.subsubcategory ? "Error subsubcategory: "+error.subsubcategory+"<br>": "")+
        ("Error rule: "+error.rule+"<br>")+
        (error.description?("Description: "+error.description):"");
    hoverSpan(event, msg, "200px");
}

function hoverSpan(event, message, width){
    $('#tooltip_matrix #value').html(message);
    $('#tooltip_matrix').css("width", width);
    $("#tooltip_matrix").css("left", (event.pageX+10) + "px");
    $("#tooltip_matrix").css("top", (event.pageY-100) + "px");
    //Show the tooltip
    $("#tooltip_matrix").removeClass("hidden");
}

function unhoverSpan() {
    $("#tooltip_matrix").addClass("hidden");
}

/**
     * {JSDoc}
     *
     * The splice() method changes the content of a string by removing a range of
     * characters and/or adding new characters.
     *
     * @this {String}
     * @param {number} start Index at which to start changing the string.
     * @param {number} delCount An integer indicating the number of old chars to remove.
     * @param {string} newSubStr The String that is spliced in.
     * @return {string} A new string with the spliced substring.
     */
String.prototype.splice = function(start, delCount, newSubStr) {
    return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
};

function createFilterMenus(datatable, APIURL){
    let options = _.uniq(datatable.api().columns(3).data()[0]);
    _.forEach(options, function(obj, i){
        $("#filter-level").append('<a class="dropdown-item" href="#"><input type="checkbox" value="'+obj+'"/>&nbsp;'+obj+'</a><br>');
    });    
    
    options = _.uniq(datatable.api().columns(2).data()[0]);
    _.forEach(options, function(obj, i){
        $("#filter-topic").append('<a class="dropdown-item" href="#"><input type="checkbox" value="'+obj+'"/>&nbsp;'+obj+'</a><br>');
    });  

    options = _.uniq(datatable.api().columns(1).data()[0]);
    _.forEach(options, function(obj, i){
        $("#filter-lang").append('<a class="dropdown-item" href="#"><input type="checkbox" value="'+obj+'"/>&nbsp;'+obj+'</a><br>');
    });

    $("#filter-level").find("input:checkbox").click(function(e) {
        let table = $('#datatable').DataTable();
        let searchList = $("#filter-level input:checkbox:checked").map(function(){
            return $(this).val();
        }).get();        
        table.columns(3).search(searchList.join('|'), true,false).draw();
        e.stopPropagation();
    });
    
    $("#filter-topic").find("input:checkbox").click(function(e) {
        let table = $('#datatable').DataTable();
        let searchList = $("#filter-topic input:checkbox:checked").map(function(){
            return $(this).val();
        }).get();        
        table.columns(2).search(searchList.join('|'), true,false).draw();
        e.stopPropagation();
    });

    $("#filter-lang").find("input:checkbox").click(function(e) {
        let table = $('#datatable').DataTable();
        let searchList = $("#filter-lang input:checkbox:checked").map(function(){
            return $(this).val();
        }).get();        
        table.columns(1).search(searchList.join('|'), true,false).draw();
        e.stopPropagation();
    });
}

function createColError(datatable, APIURL){
    let cells = $('.tbCellError');
    let errorCol = datatable.api().rows({search:'applied'}).data();
//    let errorCol = datatable.api().rows().data();
//    let page = datatable.api().page.info();
//    let tbPage = _.slice(errorCol, page.first, page.last);
    let maxErrorRow = _.maxBy(errorCol, 'errors');
    let maxError = (maxErrorRow?maxErrorRow.errors:0);
    
    _.forEach(cells, function(cell, i){
        let id = $(cell).attr('value');
        $.get(APIURL + 'getErrorStats/id/'+id, function(error){ 
//            console.log(error);
            let div = $('#row-'+id);
            let width = $(div).width();
            let html = "";
//            let maxErrorCell = _.maxBy(error, 'count');
            _.forEach(error, function(err, i){
                html += "<span style='width:"+((err.count/$(cell).attr('freq'))*100)+"%;' class='errortag "+err.category+"'></span>";                
            });
            let visbar = "<div class='rowvisCat'>"+html+'</div>';
            let freqbar = "<span class='rowvisFreq' style='width:"+(($(cell).attr('freq')/maxError)*100)+"%;'></span>";
            $(div).html(visbar+freqbar);
        });    
    });

}

function createColTopic(datatable, APIURL){
    
}



function createTableRows(datatable, APIURL){
    $('#datatable tbody').on('click', 'tr', function(event){
        $('#load-overlay').show();
        $("#datatable tbody tr").css("font-weight", "normal");
        $(this).css("font-weight", "bold");
        var row = datatable.row(this);
        var datarow = row.data();     
        console.log(datarow);
        $("#essayTitle").html("Loading...");
        $.get(APIURL + 'getessayToefl/id/'+datarow.id, function(essay){                        
            console.log(essay);
            $("#essayTitle").html(essay.file+" | "+essay.language+" | "+essay.score_level+" | "+essay.title);
            $("#pnEssay").html(essay.content.replace(/(?:\r\n|\r|\n)/g, '<BR>'));
            $.get(APIURL + 'getErrorEssay/id/'+essay.id, function(error){                            
                tagErrorText((error), essay);
            });

        });
    });

    $('#datatable tbody').on('mouseenter', 'td .tbCellError', function(event){     
        let id = $(this).attr('value');
        //                    console.log(datarow);
        if (id) $.get(APIURL + 'getErrorEssay/id/'+id, function(error){                            
            // console.log(error);
            hoverTableEssay(event, error);                        
        });
    });
    $("#datatable tbody").mouseleave(function(e) {
        if($("#tooltip_matrix:hover").length > 0) return;
        unhoverSpan(); 
    });
    $('#tooltip_matrix').on('mouseout', function (event) {
        unhoverSpan();
    });
    $('#load-overlay').hide();
}