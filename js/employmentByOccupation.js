/**
 * SOURCES USED:
 * https://bl.ocks.org/mbostock/3884955
 * http://bl.ocks.org/mbostock/3035090
 */

// Global Variables
var monthYear = d3.time.format("%b-%Y");
var year = d3.time.format("%Y");
var colorScale = d3.scale.category20();

/*
 * Load the data
 */
loadData();
function loadData() {
    d3.csv("data/employment-by-occupation.csv", function(error, csv) {
        if (error) throw error;

        //Process and clean the data
        csv.forEach(function(d){
            if (d.Date.startsWith("Annual") == false) {
                d.Date = monthYear.parse(d.Date);
            }

            for (var prop in d) {
                if (prop != "Date") {
                    d[prop] = +d[prop];
                }
            }
        });

        // Filter out dates from global dataset
        var filteredData = csv.filter(function(d) {
            if (d.Date instanceof Date) {
                if(d.Date >= year.parse("2000") && d.Date < monthYear.parse("Apr-2016")) {
                    return true;
                }
            }
        });

        // Draw the visualization for the first time
        employmentByOccupation = new EmploymentByOccupation("employment-by-occupation", filteredData);
        createTimelineVis();
    });
}

/*
 * EmploymentByOccupation - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the visualization
 * @param _data				-- the employment-by-occupation.csv data
 */

EmploymentByOccupation = function(_parentElement, _data){
    this.parentElement = _parentElement;
    this.data = _data;
    this.displayData = []; // see data wrangling
    this.transposedData = [];

    this.initVis();
}

/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

EmploymentByOccupation.prototype.initVis = function(){
    var vis = this;

    vis.margin = { top: 20, right: 10, bottom: 20, left: 40 };

    vis.width = 750 - vis.margin.left - vis.margin.right,
        vis.height = 400 - vis.margin.top - vis.margin.bottom;

    // SVG drawing area
    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    vis.svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", vis.width)
        .attr("height", vis.height + 10);

    // Scales and axes
    vis.x = d3.time.scale()
        .domain(d3.extent(vis.data, function(d) { return d.Date; }))
        .range([0, vis.width]);

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

    var yGroup = vis.svg.append("g")
        .attr("class", "y-axis axis");

    // Add the y axis label
    yGroup.append("text")
        .attr("class", "axis-label")
        .attr("x", -85)
        .attr("y", 10)
        .attr("transform", "rotate(-90)")
        .text("Percent Change");

    // Define line generator
    vis.line = d3.svg.line()
        .interpolate("monotone");

    vis.svg.append("g")
        .append("text")
        .attr("class", "label")
        .attr("transform", "translate(10,-10)");

    // Update the color scale (all column headers except "Date")
    colorScale.domain(d3.keys(vis.data[0]).filter(function(d){ return d != "Date"; }))

    vis.wrangleData();
}

/*
 * Data wrangling - Filter, aggregate, modify data
 */
EmploymentByOccupation.prototype.wrangleData = function(){
    var vis = this;

    var percentChange = clone(vis.data);

    percentChange.forEach(function(d) {
        for (var prop in d) {
            if (prop != "Date") {
                d[prop] = (d[prop] - vis.data[0][prop])/vis.data[0][prop];
            }
        }
    });

    var dataCategories = colorScale.domain();

    vis.transposedData = dataCategories.map(function(name) {
        return {
            name: name,
            values: percentChange.map(function(d) {
                return {Year: d.Date, Population: d[name]};
            })
        };
    });

    var inputs = $('input:checked').map(function() {
        return this.value;
    });

    // Filter out totals, unemployment rate and unchecked items
    var transposedData = vis.transposedData.filter(function(d) {
        if (d.name.split("-")[1] != "Total" &&
            d.name.split("-")[0] != "Unemployment rate") {
            for(var name in inputs) {
                if (inputs[name] == d.name) {
                    return true;
                }
            }
        }
    });

    vis.displayData = vis.data;
    vis.transposedData = transposedData;

    // Update the visualization
    vis.updateVis();
}

/*
 * The drawing function - should use the D3 update sequence (enter, update, exit)
 * Function parameters only needed if different kinds of updates are needed
 */

EmploymentByOccupation.prototype.updateVis = function(){
    var vis = this;

    // Update domain
    vis.y.domain([
        d3.min(vis.transposedData, function(d) {
            return d3.min(d.values, function(e) {
                return e.Population;
            });
        }),
        d3.max(vis.transposedData, function(d) {
            return d3.max(d.values, function(e) {
                return e.Population;
            });
        })
    ]);

    // Call the axes
    vis.svg.select(".y-axis")
        .transition()
        .duration(800)
        .call(vis.yAxis);

    vis.svg.select(".x-axis")
        .transition()
        .duration(800)
        .call(vis.xAxis);

    // Don't include empty values on the line chart
    vis.line.defined(function(d) { return d.Population != -1; })

    // Define the x/y coordinates for the line
    vis.line.x( function(d) { return vis.x(d.Year); })
    vis.line.y( function(d) { return vis.y(d.Population); })

    // Enter/Update/Exit
    var categories = vis.svg.selectAll(".line")
        .data(vis.transposedData);

    categories.enter().append("path")
        .attr("class", "line")
        .on("mouseover", function (d) {
            d3.selectAll(".line").style("opacity", ".7");
            d3.select(this)
                .style("stroke-width", "5px")
                .style("opacity", "1");

            vis.svg.select(".label").text(d.name);

        })
        .on("mouseout", function (d) {
            d3.select(this).transition().style("stroke-width", "1px");
            d3.selectAll(".line").style("opacity", "1");
        });

    categories
        .style("stroke", function(d) {
            return colorScale(d.name);
        })
        .transition()
        .duration(800)
        .attr("d", function(d) {
            return vis.line(d.values);
        })

    categories.exit().remove();
}

/*
 * Checkbox functionality
 */
$(document).ready(function() {
    $("input[type=checkbox]").change(function() {
        employmentByOccupation.wrangleData();
    });

    var employedClickState = true;
    $("#employed-filter-label").click(function() {
        if(employedClickState) {
            d3.selectAll(".employed-checkbox input").property("checked", true);
        } else {
            d3.selectAll(".employed-checkbox input").property("checked", false);
        }
        employmentByOccupation.wrangleData();
        employedClickState = !employedClickState;
    });

    var unemployedClickState = true;
    $("#unemployed-filter-label").click(function() {
        if(unemployedClickState) {
            d3.selectAll(".unemployed-checkbox input").property("checked", true);
        } else {
            d3.selectAll(".unemployed-checkbox input").property("checked", false);
        }
        employmentByOccupation.wrangleData();
        unemployedClickState = !unemployedClickState;
    });

});

/**
 * Clone an object
 * @see http://stackoverflow.com/a/728694/1751883
 * @param obj
 * @returns {*}
 */
function clone(obj) {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}