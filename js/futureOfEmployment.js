/**
 * Sources Used:
 * https://bost.ocks.org/mike/bar/
 * http://bl.ocks.org/mbostock/1584697
 * https://bl.ocks.org/mbostock/3885304
 */

// Global variables
var futureOfEmployment;
var formatAllFields = [];

/*
 * Load the data
 */
loadData();
function loadData() {
    d3.csv("data/The-Future-of-Employment.csv", function(error, csv) {
        if (error) throw error;

        //Process and clean the data
        csv.forEach(function(d){
            // Convert numeric values to 'numbers'
            d.Probability = +d.Probability;
            d.Rank = +d.Rank;
            d.SOC_code = d.SOC_code.split("-")[0];
        });

        // Draw the visualization for the first time
        futureOfEmployment = new FutureOfEmployment("future-of-employment", csv);
    });
}

/*
 * FutureOfEmployment - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the visualization
 * @param _data				-- the The-Future-of-Employment.csv data
 */
FutureOfEmployment = function(_parentElement, _data){
    this.parentElement = _parentElement;
    this.data = _data;
    this.displayData = []; // see data wrangling

    // DEBUG RAW DATA
    console.log(this.data);

    this.initVis();
}



/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */
FutureOfEmployment.prototype.initVis = function(){
    var vis = this;

    vis.margin = { top: 10, right: 0, bottom: 10, left: 10 };

    vis.width = 900 - vis.margin.left - vis.margin.right,
        vis.height = 1500 - vis.margin.top - vis.margin.bottom;

    vis.textWidth = 400;

    // SVG drawing area
    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    vis.x = d3.scale.linear()
        .domain([0,1])
        .range([0, vis.width - vis.textWidth]);

    vis.y = d3.scale.ordinal()
        .domain(Object.keys(socMap).map(function(d) {
            return socMap[d];
        }))
        .rangeBands([0, vis.height]);

    vis.wrangleData();
}

/*
 * Data wrangling - Filter, aggregate, modify data
 */
FutureOfEmployment.prototype.wrangleData = function(){
    var vis = this;

    var dropDown = d3.select("#soc-fields").property("value");
    var radio = d3.select("input:checked").property("value");

    // Filter, aggregate or modify the data
    if (dropDown == "all"){

        vis.data.forEach(function(d){
            return pushToArray(d.SOC_code, d.Probability);
        })

        var allData = formatAllFields.map(function(d, i) {
            var reduced = d.reduce(function(a,b){
                return a + b;
            })

            var average = reduced/d.length;

            return {
                SOC_code: i,
                Probability: average,
                Occupation: socMap[i]
            }
        })

        var filteredData = allData.filter(function(d){ return d != undefined});

    } else {

        var filteredData = vis.data.filter(function(d){
            return d.SOC_code == dropDown
        });
    }

    // Add Sort functionality
    if (radio == "prob-asc") {
        filteredData.sort(function(a,b) {
            return a.Probability - b.Probability;
        })
    } else if (radio == "prob-desc"){
        filteredData.sort(function(a,b) {
            return b.Probability - a.Probability;
        })
    }

    if (radio == "occ-asc") {
        filteredData.sort(function(a,b) {
            aOcc = a.Occupation.toLowerCase();
            bOcc = b.Occupation.toLowerCase();
            if (aOcc > bOcc){ return 1;}
            if (aOcc < bOcc) { return -1;}
            return 0;
        })
    } else if (radio == "occ-desc") {
        filteredData.sort(function(a,b) {
            aOcc = a.Occupation.toLowerCase();
            bOcc = b.Occupation.toLowerCase();
            if (aOcc < bOcc){ return 1; }
            if (aOcc > bOcc) { return -1; }
            return 0;
        })
    }

    vis.displayData = filteredData;

    // Update the visualization
    vis.updateVis();
}



/*
 * The drawing function - should use the D3 update sequence (enter, update, exit)
 * Function parameters only needed if different kinds of updates are needed
 */
FutureOfEmployment.prototype.updateVis = function(){
    var vis = this;

    vis.y.domain(vis.displayData.map(function(d) {
        return d.Occupation;
    }));

    // Data Join
    var dataJoin = vis.svg.selectAll(".group").data(vis.displayData);

    // Enter
    var group = dataJoin.enter().append("g")
        .attr("class", "group")
        .on("click", function(d) {
            if (socMap[d.SOC_code] == d.Occupation) {
                $("#soc-fields").val(d.SOC_code);
                vis.wrangleData();
            }
        });;

    dataJoin
        .transition()
        .duration(800)
        .delay(function(d, i) { return i * 10; })
        .attr("transform", function(d, i) {
            return "translate(0," + i * vis.y.rangeBand() + ")";
        });

    // Update bars
    group.append("rect")
        .attr("class", "bars");

    dataJoin.select(".bars")
        .transition()
        .duration(800)
        .attr("width", function(d) {
            return vis.x(d.Probability);
        })
        .attr("height", vis.y.rangeBand() * .95)
        .attr("x", vis.textWidth + 5)

    // Update Occupation/Field labels
    group.append("text")
        .attr("class", "labels");

    dataJoin.select(".labels")
        .transition()
        .duration(800)
        .attr("font-size", function(d) {
            if(d.Occupation.length > 80) {
                return 9;
            } else if(d.Occupation.length > 50) {
                return 11;
            } else {
                return 14;
            }
        })
        .attr("x", vis.textWidth)
        .attr("y", vis.y.rangeBand() * .5)
        .text(function(d) {
            return d.Occupation;
        })

    // Update the probability
    group.append("text")
        .attr("class", "probability");

    dataJoin.select(".probability")
        .transition()
        .duration(800)
        .attr("x", function(d) {
            if(d.Probability < .01) {
                return vis.textWidth + 50;
            }
            if(d.Probability >= .01 && d.Probability < .091) {
                return vis.textWidth + 42;
            } else {
                return vis.x(d.Probability) + vis.textWidth;
            }
        })
        .attr("y", vis.y.rangeBand() * .5)
        .text(function(d) {
            var percent = d3.format(".2p");
            return percent(d.Probability);
        })

    // Exit
    dataJoin.exit().remove();
}

/*
 * Call wrangleData if the drop down or radio buttons change
 */
$(document).ready(function() {
    $("#soc-fields, input[type=radio]").change(function() {
        futureOfEmployment.wrangleData();
    })
});

/*
 * Push a key and value to an array.
 * @see http://stackoverflow.com/a/36612459/1751883
 */
function pushToArray(key, value){

    var subArray = formatAllFields[key];

    if( typeof subArray == "undefined"){
        subArray = [];
        formatAllFields[key] = subArray;
    }

    subArray.push(value);
    return subArray;
}

