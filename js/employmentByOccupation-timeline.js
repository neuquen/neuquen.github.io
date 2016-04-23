// @see: http://bl.ocks.org/mbostock/1667367
/*
 * Timeline - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the visualization
 * @param _data						-- the employmentByOccupation data
 */
Timeline = function(_parentElement, _data){
	this.parentElement = _parentElement;
  this.data = _data;

  // No data wrangling, no update sequence
  this.displayData = this.data;

  this.initVis();
}


/*
 * Initialize area chart with brushing component
 */

Timeline.prototype.initVis = function(){
	var vis = this; // read about the this

	vis.margin = { top: 20, right: 10, bottom: 20, left: 40 };

	vis.width = 750 - vis.margin.left - vis.margin.right,
    vis.height = 100 - vis.margin.top - vis.margin.bottom;

    // SVG drawing area
	vis.svg = d3.select("#" + vis.parentElement).append("svg")
	    .attr("width", vis.width + vis.margin.left + vis.margin.right)
	    .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

	vis.svg.append("rect")
		.attr("width", vis.width)
		.attr("height", vis.height)
		.attr("fill", "#f2f2f2");

	vis.svg.append("text")
		.attr("x", vis.width/3)
		.attr("y", vis.height/2)
		.text("Click and Drag to Filter by Date");

	// Scales and axes
    vis.x = d3.time.scale()
	  	.range([0, vis.width])
	  	.domain(d3.extent(vis.displayData, function(d) { return d.Year; }));

	vis.y = d3.scale.linear()
			.range([vis.height, 0])
			.domain([0, d3.max(vis.displayData, function(d) { return d.Population; })]);

	vis.xAxis = d3.svg.axis()
		  .scale(vis.x)
		  .orient("bottom");

	vis.line = d3.svg.line()
			.x(function(d) { return vis.x(d.Year); })
			.y(function(d) { return vis.y(d.Population); });

	vis.svg.append("path")
      .datum(vis.displayData)
		.attr("fill", "none")
      .attr("stroke", "#ccc")
      .attr("d", vis.line);

    // TO-DO: Initialize brush component
	vis.brush = d3.svg.brush()
		.x(vis.x)
		.on("brush", brushed);

    // TO-DO: Append brush component here
	vis.svg.append("g")
		.attr("class", "x brush")
		.call(vis.brush)
		.selectAll("rect")
		.attr("y", 0)
		.attr("height", vis.height);

  vis.svg.append("g")
      .attr("class", "x-axis axis")
      .attr("transform", "translate(0," + vis.height + ")")
      .call(vis.xAxis);
}

function createTimelineVis() {
	timeline = new Timeline('timeline', employmentByOccupation.transposedData[0].values);
}