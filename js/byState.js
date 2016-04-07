

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
    console.log(this.mapData);

    this.initVis();
}



/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

ByState.prototype.initVis = function(){
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
        .translate([vis.width / 2, vis.height / 2]);

    //map GeoJSON coordinates to SVG paths
    vis.path = d3.geo.path()
        .projection(vis.projection);

    //convert from topojson to geojson
    vis.USA = topojson.feature(mapData, mapData.objects.states).features


    vis.wrangleData();
}



/*
 * Data wrangling - Filter, aggregate, modify data
 */

ByState.prototype.wrangleData = function(){
    var vis = this;

    // Filter, aggregate or modify the data


    vis.displayData = vis.filteredData;

    // Update the visualization
    vis.updateVis();
}



/*
 * The drawing function - should use the D3 update sequence (enter, update, exit)
 * Function parameters only needed if different kinds of updates are needed
 */

ByState.prototype.updateVis = function(){
    var vis = this;

    // Update domain


    // Data Join
    //vis.map = vis.svg.selectAll("path")
    //    .data(vis.USA);

    // Enter/Update/Exit
    //vis.map.enter()
    //    .append(vis.path)
    //    .attr("class", "feature")
    //    .attr("d", vis.path);


    // Call axis functions with the new domain
    vis.svg.select(".x-axis").call(vis.xAxis);
    vis.svg.select(".y-axis").call(vis.yAxis);
}
