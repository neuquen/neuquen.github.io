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

   // console.log(this.jobCategoryDict);

    this.initVis();
}



/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

ByState.prototype.initVis = function(){
    var vis = this;

    vis.margin = { top: 40, right: 0, bottom: 60, left: 60 };

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

    //Albers projection
    vis.projection = d3.geo.albersUsa()
        .scale(1000)
        .translate([vis.width / 2, vis.height/2]);

    //map GeoJSON coordinates to SVG paths
    vis.path = d3.geo.path()
        .projection(vis.projection);

    vis.wrangleData();
}



/*
 * Data wrangling - Filter, aggregate, modify data
 */

ByState.prototype.wrangleData = function(){
    var vis = this;

    // Filter, aggregate or modify the data
    //get user selection from drop-down
    vis.dropdown = document.getElementById("dropdown");
    vis.selection = dropdown.options[dropdown.selectedIndex].value;

    console.log("selection is "+vis.selection);
    //get bin of colors for user-selected field
    vis.colors = vis.getColors();

    //set color range
    vis.color = d3.scale.quantize().range(vis.colors);

    vis.selectionArray = vis.jobFieldDict.filter(function(item) {
        return (item.jobField.indexOf(vis.selection) > -1);
    });

    vis.selectionArray.sort(function (a, b){
        return a.jobsPer1000 - b.jobsPer1000;
    });

    vis.min = vis.selectionArray[0].jobsPer1000;
    vis.max = vis.selectionArray[vis.selectionArray.length - 1].jobsPer1000;

    //console.log(vis.selectionArray);

    vis.color.domain([vis.min, vis.max]);

    //add data re: drop-down selection to map data
    vis.addSelectionToMapData();

    // Update the visualization
    vis.updateVis();
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
                //console.log("item.state is "+item.state + " map state is "+ mapState);
                if (mapState.indexOf(item.state) > -1) {                       //if state on map matches,
                    //console.log("adding "+ item.jobsPer1000 + " to "+ vis.selection + " for "+item.state);
                    vis.USA[j].properties[vis.selection] = item.jobsPer1000;//add jobs data to map data
                    break;
                }
            }
        }
        else{
            //console.log("NO MATCH: item.jobField is "+item.jobField + " selection is "+ vis.selection);
        }
    });

    //console.log(this.USA);

}


/**
 * Returns an array of color-blind safe, single-hue colors for sequential
 * data.  The color family depends on user's selection from drop-down menu.
 *
 * Source: http://colorbrewer2.org/
 *
 * @param selection              user's selection from drop-down menu
 * @returns {string[]}           array of color-blind-safe colors for sequential data
 */
ByState.prototype.getColors = function(){
    var vis =this;

    if (vis.selection == "Management") {
        console.log("COLOR for management");
        return ["#edf8e9", "#c7e9c0", "#a1d99b", "#74c476", "#31a354", "#006d2c"];//greens
    }
    else if (vis.selection == "Business") {
        return ["#feedde", "#fdbe85", "#fd8d3c", "#e6550d", "#a63603"];          //oranges
    }
    else if (vis.selection == "Computer") {
        return ["#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#de2d26", "#a50f15"];//reds
    }
    else if (vis.selection == "Architecture") {
        return ["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"];          //blues
    }

    return ["#f2f0f7", "#cbc9e2", "#9e9ac8", "#6a51a3"];                        //purples
}