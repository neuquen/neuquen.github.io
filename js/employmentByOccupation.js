/**
 * SOURCES USED:
 * https://bl.ocks.org/mbostock/3884955
 * http://bl.ocks.org/mbostock/3035090
 */

// Global Variables
var monthYear = d3.time.format("%b-%Y");
var colorScale = d3.scale.category20();
var transposedData = [];

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

        // Draw the visualization for the first time
        new EmploymentByOccupation("employment-by-occupation", csv);
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

    this.initVis();
}

/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

EmploymentByOccupation.prototype.initVis = function(){
    var vis = this;

    vis.margin = { top: 40, right: 0, bottom: 60, left: 60 };

    vis.width = 800 - vis.margin.left - vis.margin.right,
        vis.height = 400 - vis.margin.top - vis.margin.bottom;

    // SVG drawing area
    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    // Scales and axes
    vis.x = d3.time.scale()
        .range([0, vis.width])

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

    // Define line generator
    vis.line = d3.svg.line()
        .interpolate("monotone");

    // Initialize the tooltip
    vis.tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0]);

    // Update the color scale (all column headers except "Date")
    colorScale.domain(d3.keys(vis.data[0]).filter(function(d){ return d != "Date"; }))

    vis.wrangleData();
}

/*
 * Data wrangling - Filter, aggregate, modify data
 */

EmploymentByOccupation.prototype.wrangleData = function(){
    var vis = this;


    var filteredData = vis.data.filter(function(d) {
        if (d.Date instanceof Date) {
            return true;
        }
    })

    var dataCategories = colorScale.domain();

    transposedData = dataCategories.map(function(name) {
        return {
            name: name,
            values: filteredData.map(function(d) {
                return {Year: d.Date, Population: d[name]};
            })
        };
    });

    vis.displayData = filteredData;

    console.log(transposedData);

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
    vis.x.domain(d3.extent(vis.displayData, function(d) { return d.Date; }));
    vis.y.domain([0, d3.max(transposedData, function(d) {
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

    // Update tooltip HTML
    //tip.html(function(d) {
    //    return "Edition: " + formatDate(d.YEAR) + ", " + d.LOCATION + "</br>" +
    //        chartValue + ": " +  d[chartData];
    //});

    // Call the tooltip
    //svg.call(tip);

    // Don't include empty values on the line chart
    vis.line.defined(function(d) {
        return d.Population != 0;
    })

    // Define the x/y coordinates for the line
    vis.line.x( function(d) { return vis.x(d.Year); })
    vis.line.y( function(d) { return vis.y(d.Population); })

    // Attach the line to the d attribute of the <path>
    //vis.svg.selectAll(".line")
    //    .datum(transposedData)
    //    .transition()
    //    .duration(800)
    //    .attr("d", function(d) {
    //        return vis.line(d.values)
    //    });

    // Draw the layers
    var categories = vis.svg.selectAll(".line")
        .data(transposedData);

    categories.enter().append("path")
        .attr("class", "line")
        .transition()
        .duration(800);

    categories
        .style("stroke", function(d) {
            return colorScale(d.name);
        })
        .attr("d", function(d) {
            return vis.line(d.values);
        })

        //// TO-DO: Update tooltip text
        //.on("mouseover", function(d) {
        //    vis.svg.select(".label").text(d.name);
        //})

    categories.exit().remove();

    // Call axis functions with the new domain
    vis.svg.select(".x-axis").call(vis.xAxis);
    vis.svg.select(".y-axis").call(vis.yAxis);
}

