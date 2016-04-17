//Global variables
var mapData = [];



/*
 * Makes the map.
 *
 * credits:
 *         us.json and us-state-names.tsv: Mike Bostock, at
 *         https://gist.github.com/mbostock/4090846#file-us-state-names-tsv
 *
 *         retrieving state names from us.json:
 *         http://stackoverflow.com/questions/28305205/how-to-add-label-to-each-state-in-d3-js-albersusa
 *
 *         legend library:
 *         http://d3-legend.susielu.com/
 *
 *         Mike Bostock's colorbrewer (revised from Cynthia Brewer's http://colorbrewer.org/)
 *         https://github.com/mbostock/d3/blob/master/lib/colorbrewer/colorbrewer.js
 *
 *         remove commas from strings in order to convert to numbers:
 *         http://stackoverflow.com/questions/7431833/convert-string-with-dot-or-comma-as-decimal-separator-to-number-in-javascript
 *
 */
loadData();
function loadData() {
    var round = d3.format("d");
    var format = d3.format("," + round);
    var fourDecimal = d3.format(".4f");

    var queue = d3_queue.queue();

    queue
        .defer(d3.csv, "data/ByState2015.csv")
        .defer(d3.json, "data/us.json")
        .defer(d3.tsv, "data/us-state-names.tsv")
        .defer(d3.csv, "data/The-Future-of-Employment.csv")
        .await(function(error, csv, map, tsv, probabilities){
            if (error) throw error;

            //Process and clean the data
            //source for regex to remove non-numeric chars from strings:
            //http://stackoverflow.com/questions/1862130/strip-non-numeric-characters-from-string
            csv.forEach(function(d){
                d.TOT_EMP = format(+d.TOT_EMP.replace(/\D/g,''));
                d.OCC_CODE = +d.OCC_CODE.replace(/\D/g,'');
                d.JOBS_1000 = +(+d.JOBS_1000).toFixed(4);
            });

            this.stateNames = {};
            tsv.forEach(function(d,i){
                this.stateNames[d.id] = d.name;
            });

            probabilities.forEach(function(d){
                d.SOC_code = +d.SOC_code.replace(/\D/g,'');
                d.Probability = +d.Probability;
            })

            // Draw the visualization for the first time
            new ByState("by-state", csv, map, probabilities);

    });



}

/*
 * ByState - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the visualization
 * @param _data				-- the ByState2014.csv data
 * @param _mapData          -- USA json data, credit to Mike Bostock
 */

ByState = function(_parentElement, _data, _mapData, _probabilities){
    this.parentElement = _parentElement;
    this.data = _data;
    this.mapData = _mapData;
    this.probabilities = _probabilities;
    this.displayData = []; // see data wrangling

    // DEBUG RAW DATA
    //console.log(this.data);
    //console.log(this.mapData);

    //convert from topojson to geojson
    this.USA = topojson.feature(this.mapData, this.mapData.objects.states).features

    this.makeDictionaries();
    this.makeLikelyDictionaries();


    this.initVis();
}





/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

ByState.prototype.initVis = function(){
    var vis = this;

    vis.margin = { top: 40, right: 0, bottom: 60, left: 60 };

    //width was at 800
    vis.width = 800 - vis.margin.left - vis.margin.right,
        vis.height = 600 - vis.margin.top - vis.margin.bottom;

    // SVG drawing area
    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    // Scales and axes
    vis.x = d3.time.scale()
        .range([0, vis.width])
        .domain(d3.extent(vis.data, function(d) { return d.Year; }));

    vis.y = d3.scale.linear()
        .range([vis.height, 0]);

    vis.xAxis = d3.svg.axis()
        .scale(vis.x)
        .orient("bottom");

    vis.yAxis = d3.svg.axis()
        .scale(vis.y)
        .orient("left");

    vis.svg.append("g")
        .attr("class", "x-axis axis")
        .attr("transform", "translate(0," + vis.height + ")");

    vis.svg.append("g")
        .attr("class", "y-axis axis");

    vis.svg.append("g")
        .attr("class", "legendQuant")
        //.attr("transform", "translate(750,100)"); // + vis.height/3 + ")");
        .attr("transform", "translate(0,20)");

    //Albers projection
    vis.projection = d3.geo.albersUsa()
        .scale(1000)
        //.translate([vis.width/3, vis.height/2]);//[vis.width / 2, vis.height/2]);
        .translate([vis.width/2.5, vis.height/1.5]);

    //map GeoJSON coordinates to SVG paths
    vis.path = d3.geo.path()
        .projection(vis.projection);

    vis.selection = "Management";  //default selection from drop-down
    vis.dataTypeSelected = "Per1000";

    //get user selection from drop down menu
    $('#mapDropdown').change(function(){
        vis.selection = $(this).val();
        vis.wrangleData();
    });

    //get user selection - raw data or factor in UK study probabilities of computerization
    $('#dataTypeDropdown').change(function(){
        vis.dataTypeSelected = $(this).val();
        vis.wrangleData();
    });

    //vis.initPopUpTable();
    vis.wrangleData();
}


ByState.prototype.initPopUpTable = function(){
    var vis = this;
    vis.marginTable = { top: 40, right: 0, bottom: 60, left: 60 };


    vis.widthTable = 400 - vis.marginTable.left - vis.marginTable.right,
        vis.heightTable = 600 - vis.marginTable.top - vis.marginTable.bottom;

    // SVG drawing area
    vis.svgTable = d3.select("#map-table").append("svg")
        .attr("width", vis.widthTable + vis.marginTable.left + vis.marginTable.right)
        .attr("height", vis.heightTable + vis.marginTable.top + vis.marginTable.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.marginTable.left + "," + vis.marginTable.top + ")");
}





/*
 * Data wrangling - Filter, aggregate, modify data
 */
ByState.prototype.wrangleData = function(){
    var vis = this;

    vis.round = d3.format("d");
    vis.format = d3.format("," + this.round);

    //set color range
    // https://github.com/mbostock/d3/blob/master/lib/colorbrewer/colorbrewer.js
    vis.color = d3.scale.quantize().range(colorbrewer.Blues[9]);

    if (vis.dataTypeSelected == "Per1000") {


        //Filter for job category selected
        vis.selectionArray = vis.jobFieldDict.filter(function (item) {
            return (item.jobField.indexOf(vis.selection) > -1);
        });

        vis.selectionArray.sort(function (a, b) {
            return a.jobsPer1000 - b.jobsPer1000;
        });

        vis.min = vis.selectionArray[0].jobsPer1000;
        vis.max = vis.selectionArray[vis.selectionArray.length - 1].jobsPer1000;
    }
    else if (vis.dataTypeSelected == "TotalJobs") {

        //Filter for job category selected
        vis.selectionArray = vis.jobFieldDict.filter(function (item) {
            return (item.jobField.indexOf(vis.selection) > -1);
        });

        vis.selectionArray.sort(function (a, b) {
            return a.totalJobs - b.totalJobs;
        });


        vis.min = Math.round(vis.selectionArray[0].totalJobs/1000);
        vis.max = Math.round(vis.selectionArray[vis.selectionArray.length - 1].totalJobs/1000);
    }
    else if (vis.dataTypeSelected == "Likely") {

        var count = 0;
        for (var h = 0; h < vis.jobFieldDictLikely.length; h++) {
            console.log("state: " + vis.jobFieldDictLikely[h].state + ", field: " +
                vis.jobFieldDictLikely[h].jobField + ", per1000: "+vis.jobFieldDictLikely[h].jobsPer1000);

            if (count > 5) {
                break;
            }
            count += 1;
        }

        //Filter for job category selected
        vis.selectionArray = vis.jobFieldDictLikely.filter(function (item) {
            return (item.jobField.indexOf(vis.selection) > -1 || vis.selection.indexOf(item.jobField) > -1);
        });

        vis.selectionArray.sort(function (a, b) {
            return a.jobsPer1000 - b.jobsPer1000;
        });

        vis.min = vis.selectionArray[0].jobsPer1000;
        vis.max = vis.selectionArray[vis.selectionArray.length - 1].jobsPer1000;
    }

    console.log("min: "+ vis.min + " max: "+ vis.max);

    vis.color.domain([vis.min, vis.max]);

    //add data re: drop-down selection to map data
    vis.addSelectionToMapData();

    // Update the visualization
    vis.updateVis();
    vis.makeLegend();
}






ByState.prototype.makeDictionaries= function() {
    var vis = this;

    vis.jobFieldDict = [];   //major job field data (eg, Education)
    vis.jobTitlesDict = [];  //job title data (eg, Library Assistant)
    vis.stateTotals = []; //key = state, val = total num jobs in state (only need if doing percentages)


    for (var i = 0; i < vis.data.length; i++) {

        if (vis.data[i].OCC_GROUP == "major") {
            vis.jobFieldDict.push({
                state: vis.data[i].STATE,
                jobField: vis.data[i].OCC_TITLE,    //major job field
                jobsPer1000: vis.data[i].JOBS_1000,//+vis.data[i].JOBS_1000.replace(/\D/g,''),  //jobs in this field per 1000 jobs in state
                totalJobs: +vis.data[i].TOT_EMP.replace(/\D/g, '')
            });

        }
        else if (vis.data[i].OCC_GROUP == "detailed") {

            vis.OCC_CODE = vis.data[i].OCC_CODE;
            vis.getJobCategory();  //sets vis.jobCategory - for OCC_CODE, returns major job field

            vis.jobTitlesDict.push({
                state: vis.data[i].STATE,
                jobField: vis.jobCategory,
                jobTitle: vis.data[i].OCC_TITLE,
                OccCode: vis.data[i].OCC_CODE,
                jobsPer1000: vis.data[i].JOBS_1000,//+vis.data[i].JOBS_1000.replace(/\D/g,''),
                numJobs: +vis.data[i].TOT_EMP.replace(/\D/g, '')


            });
        }
        else if (vis.data[i].OCC_GROUP == "total") {

            vis.stateTotals.push({
                state: vis.data[i].STATE,
                totalJobs: +vis.data[i].TOT_EMP.replace(/\D/g, '')
            });

        }

    }
}

ByState.prototype.makeLikelyDictionaries = function() {

    var vis = this;

    vis.jobFieldDictLikely = [];   //for major job fields and state combos (eg, Management in Alabama)
    vis.jobFieldDictLikelyPrep=[];  //same as 'jobFieldDictLikely', but without 'per1000' data
    vis.jobTitlesDictLikely = [];  //detailed data for each job (eg, Library Assistant)
    vis.stateTotalsLikely = []; //key = state, val = total num jobs in state

    var vis = this;

    //make dict for each single job, with the number of jobs remaining
    for (var j = 0; j < vis.probabilities.length; j++) {
        for (var k = 0; k < vis.jobTitlesDict.length; k++) {
            if (vis.jobTitlesDict[k].OccCode == vis.probabilities[j].SOC_code) { //find matching job OCC code

                if (vis.probabilities[j].Probability >= 0.5) {  //if prob of computerization is >= 0.5, set num jobs to 0

                    vis.jobTitlesDictLikely.push({
                        state: vis.jobTitlesDict[k].state,
                        jobField: vis.jobTitlesDict[k].jobField,
                        jobTitle: vis.jobTitlesDict[k].jobTitle,
                        OccCode: vis.jobTitlesDict[k].OccCode,
                        probComputerized: vis.probabilities[j].Probability,
                        jobsPer1000: 0,
                        numJobsWithoutComputerization: vis.jobTitlesDict[k].numJobs,
                        numJobs: 0
                    });
                }
                else {  //if prob of computerized is < 0.5, num jobs stays the same
                    vis.jobTitlesDictLikely.push({
                        state: vis.jobTitlesDict[k].state,
                        jobField: vis.jobTitlesDict[k].jobField,
                        jobTitle: vis.jobTitlesDict[k].jobTitle,
                        OccCode: vis.jobTitlesDict[k].OccCode,
                        probComputerized: vis.probabilities[j].Probability,
                        jobsPer1000: vis.jobTitlesDict[k].jobsPer1000,
                        numJobsWithoutComputerization: vis.jobTitlesDict[k].numJobs,
                        numJobs: vis.jobTitlesDict[k].numJobs
                    });
                }

            }
        }


    }

    //make dict for major job field/state combos (Agriculture in Alabama), and num jobs remaining
    for (var m = 0; m < vis.jobFieldDict.length; m++) {
        var totalJobsInFieldAndState = 0;
        for (var n = 0; n < vis.jobTitlesDictLikely.length; n++) {

            if (vis.jobFieldDict[m].jobField.indexOf(vis.jobTitlesDictLikely[n].jobField) > -1) {  //if major job field matches,
                if (vis.jobFieldDict[m].state == vis.jobTitlesDictLikely[n].state){                //if state matches
                    totalJobsInFieldAndState += vis.jobTitlesDictLikely[n].numJobs;
                }
            }
        }

        vis.jobFieldDictLikelyPrep.push({
            state: vis.jobFieldDict[m].state,
            jobField: vis.jobFieldDict[m].jobField,
            totalJobs: totalJobsInFieldAndState
        });

    }

    //make dict with new state totals
    for (var h = 0; h < vis.stateTotals.length; h++){

        var numJobsInState = 0;
        for (var i = 0; i < vis.jobFieldDictLikelyPrep.length; i++){
            if (vis.stateTotals[h].state === vis.jobFieldDictLikelyPrep[i].state){
                numJobsInState += vis.jobFieldDictLikelyPrep[i].totalJobs;
            }

        }

        vis.stateTotalsLikely.push({
            state: vis.stateTotals[h].state,
            totalJobs: numJobsInState
        });
    }



    //make dict with num jobs per 1000
    for (var a = 0; a < vis.jobFieldDictLikelyPrep.length; a++) {
        for (var b = 0; b < vis.stateTotalsLikely.length; b++) {
            if (vis.jobFieldDictLikelyPrep[a].state === vis.stateTotalsLikely[b].state) {
                var per1000 =  Math.round((vis.jobFieldDictLikelyPrep[a].totalJobs/vis.stateTotalsLikely[b].totalJobs) * 1000);
                //console.log("per1000 is: "+ per1000);
                vis.jobFieldDictLikely.push({
                    state: vis.jobFieldDictLikelyPrep[a].state,
                    jobField: vis.jobFieldDictLikelyPrep[a].jobField,
                    jobsPer1000: per1000,
                    totalJobs: vis.jobFieldDictLikelyPrep[a].totalJobs
                });
            }

        }
    }

}



/*
 * The drawing function - should use the D3 update sequence (enter, update, exit)
 * Function parameters only needed if different kinds of updates are needed
 */

ByState.prototype.updateVis = function(){
    var vis = this;

    //INIT TOOLTIP
    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .html(function(d){
            vis.hoveredState = stateNames[d.id];
            vis.popUpTable();
            return vis.hoverStateData(); //get country data for tooltip
        });

    vis.svg.call(tip);


    // Data Join
    vis.map = vis.svg.selectAll("path")
        .data(vis.USA);

    // Enter/Update/Exit
    vis.map.enter()
        .append("path")
        .attr("class", "feature")
        .attr("d", vis.path);

    //vis.map.style("fill", '#ccc');
    vis.map
        .style("fill", function(d){
            var value = d.properties[vis.selection];

            if (value) {
                return vis.color(value);
            }
            else {
                return "#ccc";
            } })
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);


    vis.map.exit().remove();

}


//make title for pop-up table
ByState.prototype.hoverStateData = function(){
    var vis = this;



    var str = "<span class=tooltip-title>" + vis.hoveredState + " - " + vis.selectedField + "</span><br>";

    vis.beforeRobots = vis.jobFieldDict.filter(function(item){
        return (item.jobField.indexOf(vis.selection) > -1 && item.state == vis.hoveredState);
    })

    str += "2015 Jobs per 1000: " + Math.round(vis.beforeRobots[0].jobsPer1000) + "<br>";
    str += "2015 Number of Jobs: "+ vis.format(vis.beforeRobots[0].totalJobs)+ "<br>";


    vis.afterRobots = vis.jobFieldDictLikely.filter(function(item){
        return (item.jobField.indexOf(vis.selection) > -1 && item.state == vis.hoveredState);
    })


    str += "Jobs Likely Computerized: "+ vis.format(vis.beforeRobots[0].totalJobs - vis.afterRobots[0].totalJobs);
    return str;
}


ByState.prototype.popUpTable = function(){
    var vis = this;

    //get only data for hovered-over state and selected job field
    var filteredArray = vis.jobTitlesDictLikely.filter(function(item) {
        return (vis.selection.indexOf(item.jobField) > -1 && item.state == vis.hoveredState && item.numJobsWithoutComputerization > 0);
    });


    //sort jobs descending by number of workers
    filteredArray.sort(function (a, b){
        return b.probComputerized - a.probComputerized;
    });

    //title of table
    var dataToPrint = "<span class=\"map-table-title\">" + vis.hoveredState +": "+ vis.selectedField + " Jobs Most Likely to Be Computerized </span><table>";
    //column headers
    dataToPrint += "<tr><td>Job Title</td><td>Jobs in 2015</td><td>Prob. of Computerization</td></tr>";

    for (var i = 0; i < filteredArray.length; i++){

        dataToPrint += "<tr><td>" + filteredArray[i].jobTitle + "</td>";
        dataToPrint += "<td>" + vis.format(filteredArray[i].numJobsWithoutComputerization) + "</td>";
        dataToPrint += "<td>" + filteredArray[i].probComputerized + "</td></tr>";

        if (i == 9){
            break;
        }
    }


    $("div.map-table").html(dataToPrint + "</table>").addClass("table th td");


}


ByState.prototype.makeLegend = function(){
    var vis = this;
    if (vis.dataTypeSelected == "Per1000"){
        vis.legendTitle = ": Jobs per 1000 Jobs in Each State in 2015";
    }
    else if (vis.dataTypeSelected == "TotalJobs"){
        vis.legendTitle = " Jobs in Each State in 2015 - in Thousands"
    }
    else if (vis.dataTypeSelected == "Likely"){
        vis.legendTitle = ": Jobs per 1000 in 2015 - Without Jobs Likely Computerized"
    }

    vis.selectedJobField();

    vis.legend = d3.legend.color()
        .labelFormat(d3.format(".0f"))
        .scale(vis.color)
        .orient("horizontal")
        .labelAlign("start")
        .shapeWidth("70")
        .title(vis.selectedField + vis.legendTitle);
        //.title("Percent of State Jobs in "+ vis.selectedField + " in 2015");

    vis.svg.select(".legendQuant")
        .call(vis.legend);
}


/**
 * Adds user-selected field ("UN_population", "At_risk", etc.) to map data.
 *
 * For each country in the malaria data set ('malariaData'), finds the matching
 * country in the map data set ('africa').  Adds to the map data set a new data field -
 * the user-requested data from the drop down menu.
 *
 * @param selection     user-selected field from drop down menu
 */
ByState.prototype.addSelectionToMapData = function(){
    var vis = this;

    if (vis.dataTypeSelected == "Per1000") {
        //Match state to map data and match job field to selection
        vis.jobFieldDict.forEach(function (item) {

            if (item.jobField.indexOf(vis.selection) > -1) {             //if job field matches selection
                for (var j = 0; j < vis.USA.length; j++) {               //for all map data,

                    var mapState = stateNames[vis.USA[j].id];           //for map id, get state name

                    if (mapState == item.state) {                      //if state on map matches,

                        vis.USA[j].properties[vis.selection] = item.jobsPer1000;//add jobs data to map data
                        break;
                    }


                }
            }

        });
    }
    else if (vis.dataTypeSelected == "TotalJobs") {
        //Match state to map data and match job field to selection
        vis.jobFieldDict.forEach(function (item) {

            if (item.jobField.indexOf(vis.selection) > -1) {             //if job field matches selection
                for (var j = 0; j < vis.USA.length; j++) {               //for all map data,

                    var mapState = stateNames[vis.USA[j].id];           //for map id, get state name

                    if (mapState == item.state) {                      //if state on map matches,

                        vis.USA[j].properties[vis.selection] = Math.round(item.totalJobs/1000);//add jobs data to map data
                        break;
                    }


                }
            }

        });
    }
    if (vis.dataTypeSelected == "Likely") {
        //Match state to map data and match job field to selection
        vis.jobFieldDictLikely.forEach(function (item) {

            if (item.jobField.indexOf(vis.selection) > -1) {             //if job field matches selection
                for (var j = 0; j < vis.USA.length; j++) {               //for all map data,

                    var mapState = stateNames[vis.USA[j].id];           //for map id, get state name

                    if (mapState == item.state) {                      //if state on map matches,

                        vis.USA[j].properties[vis.selection] = item.jobsPer1000;//add jobs data to map data
                        break;
                    }


                }
            }

        });
    }



}



//source: http://www.bls.gov/oes/current/oes_al.htm
ByState.prototype.getJobCategory = function(){

    var vis = this;
    var code = vis.OCC_CODE;

    if (code < 130000){
        vis.jobCategory = "Management";
        return;
    }
    else if (code < 150000){
        vis.jobCategory = "Business";
        return;
    }
    else if (code < 170000){
        vis.jobCategory = "Computer";
        return;
    }
    else if (code < 190000){
        vis.jobCategory = "Architecture";
        return;
    }
    else if (code < 210000){
        vis.jobCategory = "Life";
        return;
    }
    else if (code < 230000){
        vis.jobCategory = "Community";
        return;
    }
    else if (code < 250000){
        vis.jobCategory = "Legal";
        return;
    }
    else if (code < 270000){
        vis.jobCategory = "Education";
        return;
    }
    else if (code < 290000){
        vis.jobCategory = "Arts";
        return;
    }
    else if (code < 310000){
        vis.jobCategory = "Practitioners";
        return;
    }
    else if (code < 330000){
        vis.jobCategory = "Healthcare";
        return;
    }
    else if (code < 350000){
        vis.jobCategory = "Protective";
        return;
    }
    else if (code < 370000){
        vis.jobCategory = "Food";
        return;
    }
    else if (code < 390000){
        vis.jobCategory = "Building";
        return;
    }
    else if (code < 410000){
        vis.jobCategory = "Personal";
        return;
    }
    else if (code < 430000){
        vis.jobCategory = "Sales";
        return;
    }
    else if (code < 450000){
        vis.jobCategory = "Office";
        return;
    }
    else if (code < 470000){
        vis.jobCategory = "Farming";
        return;
    }
    else if (code < 490000){
        vis.jobCategory = "Construction";
        return;
    }
    else if (code < 510000){
        vis.jobCategory = "Installation";
        return;
    }
    else if (code < 530000){
        vis.jobCategory = "Production";
        return;
    }
    else {
        vis.jobCategory = "Transportation";
    }

}



ByState.prototype.selectedJobField = function(){
    var vis = this;
    vis.selectedField;

    switch (vis.selection) {
        case "Management":
            vis.selectedField = "Management";
            break;
        case "Business":
            vis.selectedField = "Business and Financial Operations";
            break;
        case "Computer":
            vis.selectedField = "Computer and Mathematical";
            break;
        case "Architecture":
            vis.selectedField = "Architecture and Engineering";
            break;
        case "Life":
            vis.selectedField = "Life, Physical, and Social Science";
            break;
        case "Community":
            vis.selectedField = "Community and Social Services";
            break;
        case "Legal":
            vis.selectedField = "Legal";
            break;
        case "Education":
            vis.selectedField = "Education, Training and Library";
            break;
        case "Arts":
            vis.selectedField = "Arts, Entertainment, Sports, and Media";
            break;
        case "Practitioners":
            vis.selectedField = "Health Practitioners and Technical";
            break;
        case "Healthcare":
            vis.selectedField = "Healthcare Support";
            break;
        case "Protective":
            vis.selectedField = "Protective Service";
            break;
        case "Food":
            vis.selectedField = "Food Prep. and Serving";
            break;
        case "Building":
            vis.selectedField = "Building, Grounds, and Maintenance";
            break;
        case "Personal":
            vis.selectedField = "Personal Care and Service";
            break;
        case "Sales":
            vis.selectedField = "Sales and Related";
            break;
        case "Office":
            vis.selectedField = "Office and Admin. Support";
            break;
        case "Farming":
            vis.selectedField = "Farming, Fishing, and Forestry";
            break;
        case "Construction":
            vis.selectedField = "Construction and Extraction";
            break;
        case "Installation":
            vis.selectedField = "Installation, Maintenance, and Repair";
            break;
        case "Production":
            vis.selectedField = "Production";
            break;
        case "Transportation":
            vis.selectedField = "Transportation and Material Moving";
            break;
        case "Military":
            vis.selectedField = "Military";
            break;
    }

}





