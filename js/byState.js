//Global variables
var mapData = [];

/*
 * Makes a map showing job statistics by state.
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

    var queue = d3_queue.queue();

    queue
        .defer(d3.csv, "data/ByState2015.csv")
        .defer(d3.json, "data/us.json")
        .defer(d3.tsv, "data/us-state-names.tsv")
        .defer(d3.csv, "data/The-Future-of-Employment.csv")
        .await(function(error, csv, map, tsv, probabilities){
            if (error) throw error;

            //2015 BLS data
            //source for regex: http://stackoverflow.com/questions/1862130/strip-non-numeric-characters-from-string
            csv.forEach(function(d){
                d.TOT_EMP = format(+d.TOT_EMP.replace(/\D/g,''));
                d.OCC_CODE = +d.OCC_CODE.replace(/\D/g,'');
                d.JOBS_1000 = +(+d.JOBS_1000).toFixed(4);
            });

            //dict of all state names
            this.stateNames = {};
            tsv.forEach(function(d,i){
                this.stateNames[d.id] = d.name;
            });

            //Oxford data
            probabilities.forEach(function(d){
                d.SOC_code = +d.SOC_code.replace(/\D/g,'');
                d.Probability = +d.Probability;
            })

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

    //convert from topojson to geojson
    this.USA = topojson.feature(this.mapData, this.mapData.objects.states).features

    this.makeDictionaries();                      //for retrieving state/job data
    this.makeDictionariesWithoutAutomatedJobs();  //subtracts jobs with prob. 0.5 or more of being computerized
    this.initVis();
}



/*
 * Initialize visualization.
 *
 */
ByState.prototype.initVis = function(){
    var vis = this;

    vis.margin = { top: 0, right: 0, bottom: 100, left: 50 };
    vis.width = 900 - vis.margin.left - vis.margin.right,
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
        .attr("transform", "translate(0,20)");

    //Albers projection
    vis.projection = d3.geo.albersUsa()
        .scale(1000)
        .translate([vis.width/2.5, vis.height/1.5]);

    //map GeoJSON coordinates to SVG paths
    vis.path = d3.geo.path()
        .projection(vis.projection);

    //default selections from drop-downs
    vis.selection = "Management";
    vis.dataTypeSelected = "Per1000";

    //get user selection for job field
    $('#mapDropdown').change(function(){
        vis.selection = $(this).val();
        vis.wrangleData();
    });

    //get user selection for job metric
    $('#dataTypeDropdown').change(function(){
        vis.dataTypeSelected = $(this).val();
        vis.wrangleData();
    });


    vis.wrangleData();
}






/**
 *  After the user selects a job field or metric, this method filters the dictionaries for that data,
 *  sorts them, finds new min/max values, and updates the map data set with the selected job field data.
 *
 *  Then, the method calls 'updateVis()' to map the user-selected data.
 *
 *  color source: https://github.com/mbostock/d3/blob/master/lib/colorbrewer/colorbrewer.js
 */
ByState.prototype.wrangleData = function(){
    var vis = this;

    vis.round = d3.format("d");
    vis.format = d3.format("," + this.round);
    vis.color = d3.scale.quantize().range(colorbrewer.Greens[9]);

    //filter for new category selected, sort, and set new min/max vals
    if (vis.dataTypeSelected == "Per1000") {

        vis.selectionArray = vis.majorJobDict.filter(function (item) {   //Filter for job category selected
            return (item.jobField.indexOf(vis.selection) > -1);
        });

        vis.selectionArray.sort(function (a, b) {
            return a.jobsPer1000 - b.jobsPer1000;                        //sort based on jobs per 1000
        });

        vis.min = vis.selectionArray[0].jobsPer1000;
        vis.max = vis.selectionArray[vis.selectionArray.length - 1].jobsPer1000;
    }
    else if (vis.dataTypeSelected == "TotalJobs") {

        vis.selectionArray = vis.majorJobDict.filter(function (item) {
            return (item.jobField.indexOf(vis.selection) > -1);
        });

        vis.selectionArray.sort(function (a, b) {
            return a.totalJobs - b.totalJobs;                             //sort based on total jobs
        });

        vis.min = Math.round(vis.selectionArray[0].totalJobs/1000);
        vis.max = Math.round(vis.selectionArray[vis.selectionArray.length - 1].totalJobs/1000);
    }
    else if (vis.dataTypeSelected == "Likely") {

        //use data set without jobs likely automated
        vis.selectionArray = vis.majorJobDictLikely.filter(function (item) {
            return (item.jobField.indexOf(vis.selection) > -1 || vis.selection.indexOf(item.jobField) > -1);
        });

        vis.selectionArray.sort(function (a, b) {
            return a.jobsPer1000 - b.jobsPer1000;
        });

        vis.min = vis.selectionArray[0].jobsPer1000;
        vis.max = vis.selectionArray[vis.selectionArray.length - 1].jobsPer1000;
    }

    vis.color.domain([vis.min, vis.max]);

    vis.addSelectionToMapData();                        //add data re: drop-down selection to map data
    vis.updateVis();                                    //update the vis
    vis.makeLegend();
};




/*
 * Draw the map.
 *
 * tooltip east and north positions: https://gist.github.com/deanmalmgren/6638585
 *
 */
ByState.prototype.updateVis = function(){
    var vis = this;

    //Init tooltip
    var tip = d3.tip()
        .attr('class', 'd3-tip-states')
        .html(function(d){
            vis.hoveredState = stateNames[d.id];
            vis.popUpTable();
            return vis.hoverStateData(); //call helper function for field/state html
        })
        .direction(function (){
            //position tooltip eastward for western states
            if (vis.hoveredState == 'Alaska' || vis.hoveredState == 'California'
                || vis.hoveredState == 'Oregon' || vis.hoveredState == 'Washington'
                || vis.hoveredState == 'Nevada'){
                return 'e';
            }
            return 'n';
        });


    vis.svg.call(tip);

    vis.map = vis.svg.selectAll("path")
        .data(vis.USA);

    vis.map.enter()
        .append("path")
        .attr("class", "feature")
        .attr("d", vis.path);

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

};




/**
 * Add user-selected job field and metric (eg, total jobs) to map data.
 *
 * Uses the appropriate dictionary, depending on the metric chosen.  For example, if a user
 * wants to see the 'jobs per 1000', accounting for jobs likely lost to automation, this method
 * uses the dictionary that has subtracted likely computerized jobs.
 *
 * @param selection     user-selected field from drop down menu
 */
ByState.prototype.addSelectionToMapData = function(){
    var vis = this;

    if (vis.dataTypeSelected == "Per1000") {

        vis.majorJobDict.forEach(function (item) {                //for each job field,
            if (item.jobField.indexOf(vis.selection) > -1) {      //if job field matches user-selection,
                for (var j = 0; j < vis.USA.length; j++) {        //for all map data,

                    var mapState = stateNames[vis.USA[j].id];    //for map id, get state name
                    if (mapState == item.state) {                 //if state on map matches,
                        vis.USA[j].properties[vis.selection] = item.jobsPer1000;//add jobs data to map data
                        break;
                    }
                }
            }
        });
    }
    else if (vis.dataTypeSelected == "TotalJobs") {

        vis.majorJobDict.forEach(function (item) {
            if (item.jobField.indexOf(vis.selection) > -1) {
                for (var j = 0; j < vis.USA.length; j++) {
                    var mapState = stateNames[vis.USA[j].id];
                    if (mapState == item.state) {
                        vis.USA[j].properties[vis.selection] = Math.round(item.totalJobs/1000);
                        break;
                    }
                }
            }
        });
    }
    if (vis.dataTypeSelected == "Likely") {

        vis.majorJobDictLikely.forEach(function (item) {       //use dict that subtracts jobs likely lost to automation
            if (item.jobField.indexOf(vis.selection) > -1) {
                for (var j = 0; j < vis.USA.length; j++) {
                    var mapState = stateNames[vis.USA[j].id];
                    if (mapState == item.state) {
                        vis.USA[j].properties[vis.selection] = item.jobsPer1000;
                        break;
                    }
                }
            }
        });
    }
};


/**
 * Helper function makes html for tooltip.
 * HTML text is based on user-selected job field and hovered-over state.
 *
 * @returns  string in jquery (html) format, for tool-tip
 *
 */
ByState.prototype.hoverStateData = function(){
    var vis = this;

    var str = "<span class=tooltip-title>" + vis.hoveredState + " - " + vis.selectedField + "</span><br>";

    //num jobs without accounting for automation
    vis.beforeRobots = vis.majorJobDict.filter(function(item){
        return (item.jobField.indexOf(vis.selection) > -1 && item.state == vis.hoveredState);
    });

    str += "2015 Jobs per 1000: " + Math.round(vis.beforeRobots[0].jobsPer1000) + "<br>";
    str += "2015 Number of Jobs: "+ vis.format(vis.beforeRobots[0].totalJobs)+ "<br>";

    //num jobs accounting for automation - get data from different dictionary
    vis.afterRobots = vis.majorJobDictLikely.filter(function(item){
        return (item.jobField.indexOf(vis.selection) > -1 && item.state == vis.hoveredState);
    });

    str += "Jobs Likely Computerized: "+ vis.format(vis.beforeRobots[0].totalJobs - vis.afterRobots[0].totalJobs);
    return str;
};


/**
 * Make a pop-up table with details for the user-selected job field and the hovered-over state.
 * Shows, in table format, the jobs most likely automated for the field/state combo.  Lists the probability of
 * automation for each job.
 *
 */
ByState.prototype.popUpTable = function(){
    var vis = this;

    //get data for hovered-over state and selected job field
    var filteredArray = vis.minorJobDictLikely.filter(function(item) {
        return (vis.selection.indexOf(item.jobField) > -1 && item.state == vis.hoveredState && item.numJobsWithoutComputerization > 0);
    });

    //sort jobs descending by number of workers
    filteredArray.sort(function (a, b){
        return b.probComputerized - a.probComputerized;
    });

    //make title
    var dataToPrint = "<div class=\"map-table-title\">Jobs Most Likely to Be Computerized<br>"  + vis.hoveredState + ": " + vis.selectedField + "</div><table>";

    //make column headers
    dataToPrint += "<tr><td>Job Title</td><td>Jobs in 2015</td><td>Probability Automated</td></tr>";

    //get (at most) 5 jobs most likely to be automated
    for (var i = 0; i < filteredArray.length; i++){

        dataToPrint += "<tr><td>" + filteredArray[i].jobTitle + "</td>";
        dataToPrint += "<td>" + vis.format(filteredArray[i].numJobsWithoutComputerization) + "</td>";
        dataToPrint += "<td>" + filteredArray[i].probComputerized + "</td></tr>";

        if (i == 5){
            break;
        }
    }

    //attach this string ('dataToPrint') to jquery, to make the pop-up table
    $("div.map-table").html("<div class=\"centerGridCols market-size-table-column\">");
    $("div.market-size-table-column").html(dataToPrint + "</table>").addClass("table th td");
};



/**
 * Make legend for map.
 *
 * source: http://d3-legend.susielu.com/
 */
ByState.prototype.makeLegend = function(){

    var vis = this;
    var round = d3.format("d");
    var format = d3.format("," + round);

    //make legend title, depending on user-selection from drop-down
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
        .labelFormat(format)
        .scale(vis.color)
        .orient("horizontal")
        .labelAlign("start")
        .shapeWidth("80")
        .title(vis.selectedField + vis.legendTitle);

    vis.svg.select(".legendQuant")
        .call(vis.legend);
};


/**
 * Make dictionaries of 2015 Bureau of Labor Statistics data.
 *
 */
ByState.prototype.makeDictionaries= function() {
    var vis = this;

    vis.majorJobDict = [];   //for job fields (eg, Education)
    vis.minorJobDict = [];   //for occupations (eg, Library Assistant)
    vis.stateTotals = [];    //for total num jobs in each state

    for (var i = 0; i < vis.data.length; i++) {     //for each job in BLS data,

        //job fields
        if (vis.data[i].OCC_GROUP == "major") {
            vis.majorJobDict.push({
                state: vis.data[i].STATE,
                jobField: vis.data[i].OCC_TITLE,    //major job field
                jobsPer1000: vis.data[i].JOBS_1000,
                totalJobs: +vis.data[i].TOT_EMP.replace(/\D/g, '')
            });

        }
        //job titles
        else if (vis.data[i].OCC_GROUP == "detailed") {

            vis.OCC_CODE = vis.data[i].OCC_CODE;    //BLS code for job field
            vis.getJobCategory();                   //get job field associated with occ-code

            vis.minorJobDict.push({
                state: vis.data[i].STATE,
                jobField: vis.jobCategory,
                jobTitle: vis.data[i].OCC_TITLE,
                OccCode: vis.data[i].OCC_CODE,
                jobsPer1000: vis.data[i].JOBS_1000,
                numJobs: +vis.data[i].TOT_EMP.replace(/\D/g, '')
            });
        }
        //job totals per state, per field
        else if (vis.data[i].OCC_GROUP == "total") {

            vis.stateTotals.push({
                state: vis.data[i].STATE,
                totalJobs: +vis.data[i].TOT_EMP.replace(/\D/g, '')
            });
        }
    }
};


/**
 * Make new dictionaries, after subtracting jobs that, according to the Oxford University study, have a probability
 * of 0.5 or greater of being automated.
 *
 * This process involves some calculation.
 *
 * For example, determining the new numbers of jobs per 1000 (eg, number of Legal jobs per 1000 jobs in Alabama, after
 * subtracting all of the likely computerized jobs in that state), takes these steps:
 *
 *      1) match each BLS job to the Oxford list, to find the likelihood each BLS job is automated
 *      2) if a job is automated, subtract all of those jobs from the 'minor' (occupation) and 'major' (field) data sets
 *      3) sum the new totals, for the field/state combos (Legal in Alabama) and for the states
 *      4) to get the 'jobs per 1000':
 *          divide the *new* total number of jobs in a field/state
 *          by the *new* total number of jobs in that state,
 *          then multiply by 1000.
 *
 */
ByState.prototype.makeDictionariesWithoutAutomatedJobs = function() {

    var vis = this;

    vis.majorJobDictLikely = [];    //for major fields and state combos (eg, Management in Alabama)
    vis.majorJobDictLikelyWithoutPer1000=[];  //stores totals used to find 'per 1000'
    vis.minorJobDictLikely = [];    //detailed data for each occupation (eg, Library Assistant)
    vis.stateTotalsLikely = [];     //total num jobs in state

    //for each BLS job, calculate new totals after subtracting jobs likely automated
    for (var j = 0; j < vis.probabilities.length; j++) {                        //for each of 702 jobs in Oxford study,
        for (var k = 0; k < vis.minorJobDict.length; k++) {                     //for each job in BLS data set,
            if (vis.minorJobDict[k].OccCode == vis.probabilities[j].SOC_code) { //find the Oxford study job in the BLS data set

                if (vis.probabilities[j].Probability >= 0.5) {  //if prob of computerization is >= 0.5, set num jobs to 0

                    vis.minorJobDictLikely.push({
                        state: vis.minorJobDict[k].state,
                        jobField: vis.minorJobDict[k].jobField,
                        jobTitle: vis.minorJobDict[k].jobTitle,
                        OccCode: vis.minorJobDict[k].OccCode,
                        probComputerized: vis.probabilities[j].Probability,
                        jobsPer1000: 0,
                        numJobsWithoutComputerization: vis.minorJobDict[k].numJobs,
                        numJobs: 0
                    });
                }
                else {                                          //if prob computerized is < 0.5, num jobs stays the same
                    vis.minorJobDictLikely.push({
                        state: vis.minorJobDict[k].state,
                        jobField: vis.minorJobDict[k].jobField,
                        jobTitle: vis.minorJobDict[k].jobTitle,
                        OccCode: vis.minorJobDict[k].OccCode,
                        probComputerized: vis.probabilities[j].Probability,
                        jobsPer1000: vis.minorJobDict[k].jobsPer1000,
                        numJobsWithoutComputerization: vis.minorJobDict[k].numJobs,
                        numJobs: vis.minorJobDict[k].numJobs
                    });
                }

            }
        }
    }


    //find new job totals for field/state combos, without likely automated jobs
    for (var m = 0; m < vis.majorJobDict.length; m++) {             //for each major job field,
        var totalJobsInFieldAndState = 0;
        for (var n = 0; n < vis.minorJobDictLikely.length; n++) {   //for each occupation title,

            if (vis.majorJobDict[m].jobField.indexOf(vis.minorJobDictLikely[n].jobField) > -1) {  //if major job field matches,
                if (vis.majorJobDict[m].state == vis.minorJobDictLikely[n].state){                //if state matches
                    totalJobsInFieldAndState += vis.minorJobDictLikely[n].numJobs;   //increment num jobs with that field/state combo
                }
            }
        }

        //after processing each occupation in this field/state, track the total
        vis.majorJobDictLikelyWithoutPer1000.push({
            state: vis.majorJobDict[m].state,
            jobField: vis.majorJobDict[m].jobField,
            totalJobs: totalJobsInFieldAndState
        });

    }

    //track new state totals
    for (var h = 0; h < vis.stateTotals.length; h++){

        var numJobsInState = 0;
        for (var i = 0; i < vis.majorJobDictLikelyWithoutPer1000.length; i++){
            if (vis.stateTotals[h].state === vis.majorJobDictLikelyWithoutPer1000[i].state){
                numJobsInState += vis.majorJobDictLikelyWithoutPer1000[i].totalJobs;
            }
        }

        vis.stateTotalsLikely.push({
            state: vis.stateTotals[h].state,
            totalJobs: numJobsInState
        });
    }

    //make dict with num jobs per 1000, after subtracting jobs likely automated
    for (var a = 0; a < vis.majorJobDictLikelyWithoutPer1000.length; a++) {  //for each job field/state combo,

        for (var b = 0; b < vis.stateTotalsLikely.length; b++) {            //for each state total number of jobs,
            if (vis.majorJobDictLikelyWithoutPer1000[a].state === vis.stateTotalsLikely[b].state) {  //find matching state

                //divide total number of jobs in this field/state combo by the total number of jobs in this state
                var per1000 =  Math.round((vis.majorJobDictLikelyWithoutPer1000[a].totalJobs/vis.stateTotalsLikely[b].totalJobs) * 1000);

                //add the new 'per 1000' field to the dict
                vis.majorJobDictLikely.push({
                    state: vis.majorJobDictLikelyWithoutPer1000[a].state,
                    jobField: vis.majorJobDictLikelyWithoutPer1000[a].jobField,
                    jobsPer1000: per1000,
                    totalJobs: vis.majorJobDictLikelyWithoutPer1000[a].totalJobs
                });
            }
        }
    }
};



/**
 * Map Bureau of Labor Statistics' OCC-codes to job field names.
 *
 * source: http://www.bls.gov/oes/current/oes_al.htm
 */
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

};


/**
 * Maps short job field names (used in drop-down menu) to official names, used to print.
 *
 */
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

};