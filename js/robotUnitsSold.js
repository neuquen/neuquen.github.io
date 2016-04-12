/*
 * source for interactive tool (provided in class for HW4):
 * http://www.d3noob.org/2014/07/my-favourite-tooltip-method-for-line.html
*/

/*
 * Load the data
 */
loadData();
function loadData() {
    d3.csv("data/RobotUnitsSold.csv", function(error, csv) {
        if (error) throw error;

        //Process and clean the data
        csv.forEach(function(d){
            //Convert string to 'date object'
            d.Year = d3.time.format("%Y").parse(d.Year);
            d.Units = +d.Units;
        });

        // Draw the visualization for the first time
        new RobotUnitsSold("robot-units-sold", csv);
    });
}

/*
 * RobotUnitsSold - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the visualization
 * @param _data				-- the RobotUnitsSold.csv data
 */

RobotUnitsSold = function(_parentElement, _data){
    this.parentElement = _parentElement;
    this.data = _data;
    this.displayData = []; // see data wrangling

    // DEBUG RAW DATA
    console.log(this.data);
    this.dataCopy = this.data.slice(0); // copy data

    this.initVis();
}



/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

RobotUnitsSold.prototype.initVis = function(){
    var vis = this;

    vis.margin = { top: 100, right: 75, bottom: 90, left: 100 };

    vis.width = 700 - vis.margin.left - vis.margin.right,
        vis.height = 550 - vis.margin.top - vis.margin.bottom;

    // SVG drawing area
    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    vis.radius = 5;

    // Define scales
    vis.x = d3.time.scale().range([0,vis.width]);
    vis.y = d3.scale.linear().range([vis.height,0]);

    // Define domains
    vis.x.domain(d3.extent(vis.data, function(d){return d.Year;})); //add domains
    vis.y.domain([0, d3.max(vis.data, function(d) { return d.Units;})]);

    //set axis
    vis.xAxis = d3.svg.axis()
        .scale(vis.x)
        .orient("bottom")
        .ticks(d3.time.year, 1)
        .tickFormat(d3.time.format(("%Y")));

    vis.yAxis  = d3.svg.axis().scale(vis.y).orient("left");

    //Append axis
    vis.svg.append("g").attr("class", "axis x-axis")
        .attr("transform", "translate(0," + vis.height + ")")
        .call(vis.xAxis);

    vis.svg.append("g").attr("class", "axis y-axis").call(vis.yAxis);

    //add title
    vis.svg.append("text")
        .attr("class", "title")
        .attr("x", 75)   //position relative to top corner
        .attr("y", -20)
        .text("Worldwide Robotics Sales");

    //add y-axis label
    vis.svg.append("text")
        .attr("class", "axis-label")
        .style("text-anchor", "end")
        .attr("x", -60)
        .attr("y", -70)
        .attr("dy", ".1em")
        .attr("transform", "rotate(-90)")  //rotate x-axis labels
        .text("Robotics Units Sold Worldwide");

    //add data source
    vis.svg.append("text")
        .attr("class", "data-source")
        .attr("x", vis.marginLeft)
        .attr("y", vis.height + 60)
        .text("Source: International Federation of Robotics, World Robot 2015 Industrial Robot Statistics");

    vis.svg.append("text")
        .attr("class", "data-source")
        .attr("x", vis.marginLeft)
        .attr("y", vis.height + 80)
        .text("http://www.ifr.org/industrial-robots/statistics/");

    vis.makeVis();
}


/*
 * Draw the areachart and circles. Add the tooltips.
 */
RobotUnitsSold.prototype.makeVis = function(){
    var vis = this;

    var formatDate = d3.time.format("%Y");
    var addComma = d3.format("0,000");

    //init tooltip
    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .html(function(d){
            return formatDate(d.Year) + "<br> " + addComma(d.Units) + " units";
        })
        .offset([-vis.radius, 0]);

    vis.svg.call(tip);

    //draw area chart
    vis.area = d3.svg.area()
        .x(function (d) {
            return vis.x(d.Year);
        })
        .y1(function (d) {
            return vis.y(d.Units);
        })
        .y0(vis.height);  //baseline

    vis.path = vis.svg.append("path")
        .datum(vis.data)
        .attr("class", "area")
        .attr("d", vis.area);

    //make circles
    vis.circle = vis.svg.selectAll("circle")
        .data(vis.data);

    vis.circle.enter()
        .append("circle")
        .attr("class", "graphCircles")
        .attr("r", vis.radius)
        .attr("fill", "black")
        .attr("stroke", "black");

    vis.circle
        .attr("cx", function(d){
            return vis.x(d.Year);
        })
        .attr("cy", function(d){
            return vis.y(d.Units)
        })
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);

}

