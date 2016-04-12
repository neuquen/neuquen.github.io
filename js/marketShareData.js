/*
 * Load the data
 */
loadData();
function loadData() {
    d3.csv("data/MarketShareData.csv", function(error, csv) {
        if (error) throw error;

        //Process and clean the data
        csv.forEach(function(d){
            //Convert string to 'date object'
            d.year = +d.year; //d3.time.format("%Y").parse(d.year);
            d.marketShare = +d.marketShare;
        });

        //sort jobs ascending by year
        csv.sort(function (a, b){
            return a.year- b.year;
        });





        // Draw the visualization for the first time
        new MarketShareData("market-share-data", csv);
    });
}

/*
 * MarketShareData - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the visualization
 * @param _data				-- the marketShareData.csv data
 */

MarketShareData = function(_parentElement, _csv){
    this.parentElement = _parentElement;
    this.csv = _csv;
    this.displayData = []; // see data wrangling

    // DEBUG RAW DATA
    console.log(this.csv);

    this.initVis();
}



/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

MarketShareData.prototype.initVis = function(){
    var vis = this;


    vis.margin = { top: 50, right: 10, bottom: 50, left: 10 };

    vis.width = 800 - vis.margin.left - vis.margin.right,
        vis.height = 800 - vis.margin.top - vis.margin.bottom;

    vis.data = [];   //major job field data (eg, Education)
    vis.originx = vis.width/2;
    vis.originy = vis.height/2;
    var radiusBigCircle = 250;

    //make dict
    for (var i = 0; i < this.csv.length; i++) {

        if (this.csv[i].year == "2018") {
            vis.data.push({
                year: this.csv[i].year,
                marketShare: this.csv[i].marketShare,
                sector: this.csv[i].sector,
                yearGroup: 0,
                x: vis.originx + radiusBigCircle * Math.cos(2 * Math.PI * (i/this.csv.length) + 200),
                y: vis.originy + radiusBigCircle * Math.sin(-2 * Math.PI * (i/this.csv.length)+ 200),
            });
        }
        else if (this.csv[i].year == "2020")
        {
            vis.data.push({
                year: this.csv[i].year,
                marketShare: this.csv[i].marketShare,
                sector: this.csv[i].sector,
                yearGroup: 1,
                x: vis.originx + radiusBigCircle * Math.cos(2 * Math.PI * (i/this.csv.length)+ 200),
                y: vis.originy + radiusBigCircle * Math.sin(2 * Math.PI * (i/this.csv.length)+ 200),
            });
        }
        else if (this.csv[i].year == "2025")
        {
            vis.data.push({
                year: this.csv[i].year,
                marketShare: this.csv[i].marketShare,
                sector: this.csv[i].sector,
                yearGroup: 2,
                x: vis.originx + radiusBigCircle * Math.cos(2 * Math.PI * (i/this.csv.length)+ 200),
                y: vis.originy + radiusBigCircle * Math.sin(2 * Math.PI * (i/this.csv.length)+ 200),
            });
        }
    }


    // SVG drawing area
    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");


    //add title
    vis.svg.append("text")
        .attr("class", "title")
        .attr("x", vis.width/5)   //position relative to top corner
        .attr("y", -10)
        .text("Projected Robotics Marketshare");

    /*
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
*/
    // Initialize layout



    vis.wrangleData();
}



/*
 * Data wrangling - Filter, aggregate, modify data
 */

MarketShareData.prototype.wrangleData = function(){
    var vis = this;

    // Filter, aggregate or modify the data


    vis.displayData = vis.filteredData;

    // Update the visualization
    //vis.updateVis();
    vis.makeArc2();
}

MarketShareData.prototype.makeArc2 = function(){
    var vis = this;

    //INIT TOOLTIP
    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .html(function(d){
            return d.marketShare + " billion"; //get country data for tooltip
        });

    vis.svg.call(tip);


    vis.smallCircleRadius = 4;


    //make circles
    vis.circle = vis.svg.selectAll("circle")
        .data(vis.data);

    vis.circle.enter()
        .append("circle")
        .attr("class", "marketShareCircles")
        .attr("r", function(d){
            return d.marketShare/vis.smallCircleRadius;
        })
        .attr("fill", "grey")
        .attr("stroke", "grey");

    vis.circle
        .attr("cx", function(d, index){
            return d.x;
        })
        //.attr("cy", 50);
        .attr("cy", function(d, index){
            return d.y;
        })
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);

        /*
        .on("mousemove", function(d){
            vis.svg.append("text")
                .attr("class", "marketsharetable")
                .attr("x", function(){
                    return vis.originx;
                })   //position relative to top corner
                .attr("y", function(){
                    return vis.originy;
                })
                .text(d.marketShare);
        })
        .on("mouseover", function () {
            marketsharetable.style("display", null);
        })										//'null' display gets default inline display
        .on("mouseout", function () {
            marketsharetable.style("display", "none");
        });*/


    var text = vis.svg.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(vis.data)
        .enter().append("text")
        .style("text-anchor", "start")
        .attr("x", function(d,index){
            return d.x - 50;
        })
        .attr("y", function(d){return d.y - d.marketShare/vis.smallCircleRadius - 10; })
        .attr("dy", ".35em")
        .text(function(d) { return d.year + ": " + d.sector; });



}




/**
 * If mouse moves over node, gets default inline display.
 */
MarketShareData.prototype.mouseover = function() {
    div.style("display", null);
}

/**
 * If mouse leaves node, hides display.
 */
MarketShareData.prototype.mouseout = function() {
    div.style("display", "none");
}

MarketShareData.prototype.makeTable = function() {
    var vis = this;

    vis.svg.append("text")
        .attr("class", "marketshare-table")
        .attr("x", vis.originx - 20)   //position relative to top corner
        .attr("y", vis.originy - 20)
        .text(vis.hoveredDatum.marketShare);
}


MarketShareData.prototype.makeArc = function(){
    var vis = this;

    var arc = d3.svg.arc()
        .innerRadius(100)
        .outerRadius(150)
        .startAngle(145 * (Math.PI/180)) //converting from degs to radians
        .endAngle(3) //just radians

    vis.svg.attr("width", "400").attr("height", "400") // Added height and width so arc is visible
        .append("path")
        .attr("d", arc)
        .attr("fill", "red")
        .attr("transform", "translate(200,200)");
}


/*
 * The drawing function - should use the D3 update sequence (enter, update, exit)
 * Function parameters only needed if different kinds of updates are needed
 */

MarketShareData.prototype.updateVis = function(){
    var vis = this;

    //make circles
    vis.circle = vis.svg.selectAll("circle")
        .data(vis.data);

    vis.circle.enter()
        .append("circle")
        .attr("class", "marketShareCircles")
        .attr("r", function(d){
            return d.marketShare/5;
        })
        .attr("fill", "grey")
        .attr("stroke", "grey");

    vis.circle
        .attr("cx", function(d, index){
            return 10 + (index*75) + (50*d.yearGroup);
        })
        //.attr("cy", 50);
        .attr("cy", function(d){
            console.log("d.yearGroup is "+ d.yearGroup);
            return vis.height -  (200 + (200*d.yearGroup));
        });





    var text = vis.svg.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(vis.data)
        .enter().append("text")
        .style("text-anchor", "start")
        .attr("x", function(d,index){
            return (index*75) + (50*d.yearGroup);
        })
        .attr("y", function(d){return vis.height -  (125 + (200*d.yearGroup)); })
        .attr("dy", ".35em")
        .text(function(d) { return d.sector; });



}

