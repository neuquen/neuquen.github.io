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
    var queue = d3_queue.queue();

    queue
        .defer(d3.csv, "data/ByState2014.csv")
        .defer(d3.json, "data/us.json")
        .defer(d3.tsv, "data/us-state-names.tsv")
        .await(function(error, csv, map, tsv){
            if (error) throw error;

            //Process and clean the data
            //source for regex to remove non-numeric chars from strings:
            //http://stackoverflow.com/questions/1862130/strip-non-numeric-characters-from-string
            csv.forEach(function(d){
                d.TOT_EMP = +d.TOT_EMP.replace(/\D/g,'');
                d.OCC_CODE = +d.OCC_CODE.replace(/\D/g,'');
                d.JOBS_1000 = +d.JOBS_1000;
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
    this.jobFieldDict = [];

    //make dict where key=state name, values=major job field, jobs per 1000 in that field
    for (var i = 0; i < this.data.length; i++) {

        if (this.data[i].OCC_GROUP == "major"){

            //if state is in the dict, add major job category and number of jobs per 1000
            if (this.jobFieldDict[this.data[i].STATE]){
                this.jobFieldDict[this.data[i].STATE].jobField = this.data[i].OCC_TITLE;
                this.jobFieldDict[this.data[i].STATE].jobsPer1000 = this.data[i].JOBS_1000;
            }
            else {
                this.jobFieldDict.push({
                    state: this.data[i].STATE,
                    jobField: this.data[i].OCC_TITLE,
                    jobsPer1000: this.data[i].JOBS_1000
                });
            }
        }
    }

    //console.log(this.jobCategoryDict);

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
        .translate([vis.width/2, vis.height/1.5]);

    //map GeoJSON coordinates to SVG paths
    vis.path = d3.geo.path()
        .projection(vis.projection);

    vis.selection = "Management";  //default selection from drop-down

    //get user selection from drop down menu
    $('#mapDropdown').change(function(){
        vis.selection = $(this).val();
        vis.wrangleData();
    });

    vis.wrangleData();
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

    // Data Join
    vis.map = vis.svg.selectAll("path")
        .data(vis.USA);

    // Enter/Update/Exit
    vis.map.enter()
        .append("path")
        .attr("class", "feature")
        .attr("d", vis.path);

    //vis.map.style("fill", '#ccc');
    vis.map.style("fill", function(d){
        var value = d.properties[vis.selection];

        if (value) {
            return vis.color(value);
        }
        else {
            return "#ccc";
        }
    });


    vis.map.exit().remove();



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
        .title(vis.selectedField + " Jobs per 1000 Jobs in Each State");

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

    //Match state to map data and match job field to selection
    vis.jobFieldDict.forEach(function(item){

        if (item.jobField.indexOf(vis.selection) > -1){             //if job field matches selection
            for (var j = 0; j < vis.USA.length; j++){               //for all map data,
                var mapState = stateNames[vis.USA[j].id];           //for map id, get state name

                if (mapState.indexOf(item.state) > -1) {                       //if state on map matches,

                    vis.USA[j].properties[vis.selection] = item.jobsPer1000;//add jobs data to map data
                    break;
                }
            }
        }

    });


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
    }

}





