//Global variables
var mapData = [];



/*
 * Load the data
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
 */
loadData();
function loadData() {
    var round = d3.format("d");
    var format = d3.format("," + round);
    var twoDecimal = d3.format(".2f");

    var queue = d3_queue.queue();

    queue
        .defer(d3.csv, "data/ByState2015.csv")
        .defer(d3.json, "data/us.json")
        .defer(d3.tsv, "data/us-state-names.tsv")
        .await(function(error, csv, map, tsv){
            if (error) throw error;

            //Process and clean the data
            //source for regex to remove non-numeric chars from strings:
            //http://stackoverflow.com/questions/1862130/strip-non-numeric-characters-from-string
            csv.forEach(function(d){
                d.TOT_EMP = format(+d.TOT_EMP.replace(/\D/g,''));
                d.OCC_CODE = +d.OCC_CODE.replace(/\D/g,'');
                d.JOBS_1000 = twoDecimal(+d.JOBS_1000);
            });

            this.stateNames = {};
            tsv.forEach(function(d,i){
                this.stateNames[d.id] = d.name;
            });


            // Draw the visualization for the first time
            new ByState("by-state", csv, map);

    });



}

/*
 * ByState - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the visualization
 * @param _data				-- the ByState2014.csv data
 * @param _mapData          -- USA json data, credit to Mike Bostock
 */

ByState = function(_parentElement, _data, _mapData){
    this.parentElement = _parentElement;
    this.data = _data;
    this.mapData = _mapData;
    this.displayData = []; // see data wrangling

    // DEBUG RAW DATA
    //console.log(this.data);
    //console.log(this.mapData);

    //convert from topojson to geojson
    this.USA = topojson.feature(this.mapData, this.mapData.objects.states).features

    //console.log(this.USA);
    this.jobFieldDict = [];   //major job field data (eg, Education)
    this.jobTitlesDict = [];  //job title data (eg, Library Assistant)
    this.totalJobsInState = []; //key = state, val = total num jobs in state
    this.percentJobs = []; //key = state, val = major job field, percent of jobs in that field

    //make dicts
    for (var i = 0; i < this.data.length; i++) {

        if (this.data[i].OCC_GROUP == "major"){
            this.jobFieldDict.push({
                state: this.data[i].STATE,
                jobField: this.data[i].OCC_TITLE,    //major job field
                jobsPer1000: this.data[i].JOBS_1000,  //jobs in this field per 1000 jobs in state
                totalJobs: this.data[i].TOT_EMP,
            });
        }
        else if (this.data[i].OCC_GROUP == "detailed"){

            this.OCC_CODE = this.data[i].OCC_CODE;
            this.getJobCategory();  //sets vis.jobCategory - for OCC_CODE, returns major job field

            this.jobTitlesDict.push({
                state: this.data[i].STATE,
                jobField: this.jobCategory,
                jobTitle: this.data[i].OCC_TITLE,
                jobsPer1000: this.data[i].JOBS_1000,
                numJobs: this.data[i].TOT_EMP
            });
        }
        else if (this.data[i].OCC_GROUP == "total"){
            this.totalJobsInState[this.data[i].STATE] = this.data[i].TOT_EMP;
        }
    }


    //make dict that stores percent of jobs per state in a particular job field
    //TODO - delete these parts? percentages don't work well b/c all too small
    for (i=0; i < this.jobFieldDict.length; i++){

        var state = this.jobFieldDict[i].state;
        var allJobsInState = this.totalJobsInState[state];

        this.percentJobs.push({
            state: state,
            jobField: this.jobFieldDict[i].jobField,
            percent: parseFloat(this.jobFieldDict[i].totalJobs/allJobsInState).toFixed(2)
        });
    }




    this.initVis();

}





/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

ByState.prototype.initVis = function(){
    var vis = this;

    vis.margin = { top: 40, right: 0, bottom: 60, left: 60 };

    //width was at 1000
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

    //get user selection from drop down menu
    $('#mapDropdown').change(function(){
        vis.selection = $(this).val();
        vis.wrangleData();
    });

    vis.initPopUpTable();
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

    //set color range
    //TODO: pick different color range?
    // https://github.com/mbostock/d3/blob/master/lib/colorbrewer/colorbrewer.js
    vis.color = d3.scale.quantize().range(colorbrewer.Blues[9]);


    //make data array that has job data for each state, only for user-selected job
    vis.selectionArray = vis.jobFieldDict.filter(function(item) {
        return (item.jobField.indexOf(vis.selection) > -1);
    });

    vis.selectionArray.sort(function (a, b){
        return a.jobsPer1000 - b.jobsPer1000;
    });

    vis.min = vis.selectionArray[0].jobsPer1000;
    vis.max = vis.selectionArray[vis.selectionArray.length - 1].jobsPer1000;

    vis.color.domain([vis.min, vis.max]);


    /*
     //PERCENT JOBS
     vis.selectionArray = vis.percentJobs.filter(function(item) {
     return (item.jobField.indexOf(vis.selection) > -1);
     });

     vis.selectionArray.sort(function (a, b){
     return a.percent - b.percent;
     });

     vis.min = vis.selectionArray[0].percent;
     vis.max = vis.selectionArray[vis.selectionArray.length - 1].percent;

     vis.color.domain([vis.min, vis.max]);
     */

    //add data re: drop-down selection to map data
    vis.addSelectionToMapData();

    // Update the visualization
    vis.updateVis();
    vis.makeLegend();
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
    var str = vis.hoveredState + "<br>";

    var filteredDict = vis.jobFieldDict.filter(function(item){
        return (item.jobField.indexOf(vis.selection) > -1 && item.state == vis.hoveredState);
    })

    str += "Jobs per 1000: " + filteredDict[0].jobsPer1000 + "<br>";
    str += "Number of Jobs: "+ filteredDict[0].totalJobs;

    return str;
}


//make pop-up table that lists the top-ten jobs (or the only jobs listed), based on number of jobs
//for the hovered-over state and the selected major job field
ByState.prototype.popUpTable = function(){

    var vis = this;

    //get only data for hovered-over state and selected job field
    var filteredArray = vis.jobTitlesDict.filter(function(item) {
        return (item.jobField.indexOf(vis.selection) > -1 && item.state == vis.hoveredState);
    });

    //sort jobs descending by number of workers
    filteredArray.sort(function (a, b){
        return b.numJobs - a.numJobs;
    });

    //get only the jobs with top ten (at most) most employees
    var dataToPrint = [];
    for (var i = 0; i < filteredArray.length; i++){
        dataToPrint[i] = filteredArray[i].jobTitle + ": "+ filteredArray[i].numJobs;

        if (i == 9){
            break;
        }
    }


    //Add title to table
    vis.svgTable.select("text.map-table-title").remove();

    vis.svgTable.append("text")
        .attr("class", "map-table-title")
        .attr("x", 5) //x-axis for left edge of text
        .attr("y", 50)
        .attr("dy", ".1em")
        .attr("text-anchor", "start")
        .text(function(){
            return vis.hoveredState + " \nTop " +
                vis.selectedField + " Jobs";
        });

    //make table with top ten jobs in the selected major job field in this state
    vis.mapTable = vis.svgTable.selectAll("text.map-table")
        .data(dataToPrint);

    vis.mapTable.enter()
        .append("text")
        .attr("class", "map-table")
        .attr("x", 5)                              //x-axis for left edge of text

    vis.mapTable.attr("y", function(d, index){    //y-axis for baseline of text
            return 100 + (index * 20);
        })
        .attr("text-anchor", "start")
        .text(function(d){
            return d;
        });

    vis.mapTable.exit().remove();

}



ByState.prototype.makeLegend = function(){
    var vis = this;

    vis.selectedJobField();

    vis.legend = d3.legend.color()
        .labelFormat(d3.format(".0f"))
        .scale(vis.color)
        .orient("horizontal")
        .labelAlign("start")
        .shapeWidth("75")
        .title(vis.selectedField + " Jobs per 1000 Jobs in Each State in 2015");
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


    /*PERCENT JOBS
    vis.percentJobs.forEach(function(item){
        if (item.jobField.indexOf(vis.selection) > -1){             //if job field matches selection
            for (var j = 0; j < vis.USA.length; j++){               //for all map data,

                var mapState = stateNames[vis.USA[j].id];           //for map id, get state name

                if (mapState == item.state){                      //if state on map matches,

                    vis.USA[j].properties[vis.selection] = item.percent;//add jobs data to map data
                    break;
                }
            }
        }

    });*/


    //Match state to map data and match job field to selection
    vis.jobFieldDict.forEach(function(item){

        if (item.jobField.indexOf(vis.selection) > -1){             //if job field matches selection
            for (var j = 0; j < vis.USA.length; j++){               //for all map data,

                var mapState = stateNames[vis.USA[j].id];           //for map id, get state name

                if (mapState == item.state){                      //if state on map matches,

                    vis.USA[j].properties[vis.selection] = item.jobsPer1000;//add jobs data to map data
                    break;
                }


            }
        }

    });




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
            vis.selectedField = "Arts, Design, Entertainment, Sports, and Media";
            break;
        case "Practitioners":
            vis.selectedField = "Healthcare Practitioners and Technical";
            break;
        case "Healthcare":
            vis.selectedField = "Healthcare Support";
            break;
        case "Protective":
            vis.selectedField = "Protective Service";
            break;
        case "Food":
            vis.selectedField = "Food Preparation and Serving Related";
            break;
        case "Building":
            vis.selectedField = "Building and Grounds Cleaning and Maintenance";
            break;
        case "Personal":
            vis.selectedField = "Personal Care and Service";
            break;
        case "Sales":
            vis.selectedField = "Sales and Related";
            break;
        case "Office":
            vis.selectedField = "Office and Administrative Support";
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





