/*
 * Load the data
 */
loadData();
function loadData() {
    d3.csv("data/MarketShareData.csv", function(error, csv) {
        if (error) throw error;

        //Process and clean the data
        csv.forEach(function(d){
            d.year = d3.time.format("%Y").parse(d.year);
            d.marketShare = +d.marketShare;
            d.ypos = +d.ypos;
        });

        //Sort jobs ascending by year
        csv.sort(function (a, b){
            return a.year- b.year;
        });

        // Draw the vis
        new MarketShareData("market-share-plot", csv);
    });
}


/*
 * MarketShareData - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the visualization
 * @param _data				-- the marketShareData.csv data
 */

MarketShareData = function(_parentElement,  _csv){
    this.parentElement = _parentElement;
    this.data = _csv;

    //global variable for value of object being dragged
    //if 'null', nothing is being dragged, so tooltips wont show
    $.objDragged = "null";

    this.initVis();
}



/*
 * Initialize visualization
 */
MarketShareData.prototype.initVis = function() {
    var vis = this;

    vis.margin = {top: 50, right: 50, bottom: 50, left: 20};
    vis.width = 800 - vis.margin.left - vis.margin.right,
        vis.height = 550 - vis.margin.top - vis.margin.bottom;

    // SVG drawing area
    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    // Define scales
    vis.x = d3.time.scale().range([0, vis.width]);
    vis.y = d3.scale.linear().range([vis.height, 0]);

    // Define domains
    var minYr = new Date("2017");
    var maxYr = new Date("2026");
    vis.x.domain([minYr, maxYr]);
    vis.y.domain([0, 4]);

    //Set axis
    var ticks = [vis.data[0].year, vis.data[1].year, vis.data[5].year];
    vis.xAxis = d3.svg.axis()
        .scale(vis.x)
        .orient("bottom")
        .tickValues(ticks)
        .tickFormat(d3.time.format(("%Y")));

    //Append axis
    vis.svg.append("g").attr("class", "x-axis market-size-axis")
        .attr("transform", "translate(0," + vis.height + ")")
        .call(vis.xAxis);

    vis.makeColoredCircles();
    vis.makeInvisibleCircles();  //transparent circles allow for bigger area to invoke tooltip
    vis.makeDraggables();
}



/*
 * Draw the colored circles. Radius is proportional to market size.
 *
 * color: https://github.com/mbostock/d3/blob/master/lib/colorbrewer/colorbrewer.js
 *        (Set2, number 8)
 */
MarketShareData.prototype.makeColoredCircles = function() {
    var vis = this;
    vis.color = ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494", "#b3b3b3"];

    vis.radiusDivisor = 3; //divide market size by this to get radius

    vis.circle = vis.svg.selectAll("circle marketShareCircles")
        .data(vis.data);

    vis.circle.enter()
        .append("circle")
        .attr("class", "marketShareCircles")
        .attr("r", function (d) {
            return (d.marketShare) / vis.radiusDivisor;
        })
        .attr("fill", function (d, index) {
            return vis.color[index];
        })
        .attr("stroke", function (d, index) {
            return vis.color[index];
        });

    vis.circle
        .attr("cx", function (d) {
            return vis.x(d.year);
        })
        .attr("cy", function (d, index) {
            return vis.y(d.ypos);
        });
}


/**
 * Make tooltip and invisible circles larger than colored circles.
 *
 * The invisible circles are larger than the colored circles, to allow
 * for a larger mouse-over area to invoke tooltip.
 */
MarketShareData.prototype.makeInvisibleCircles = function(){
    var vis = this;

    //init tooltip
    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .html(function (d) {
            if (d.sector.indexOf($.objDragged) > -1) {  //if obj dragged matches this circle
                return "CORRECT!";
            }
            return ("Wrong. Try again.");
        });

    vis.svg.call(tip);

    //make invisible circles
    vis.invisibleCircle = vis.svg.selectAll("circle invisibleCircle")
        .data(vis.data);

    vis.invisibleCircle.enter()
        .append("circle")
        .attr("class", "invisibleCircle")
        .attr("r", function (d) {
            if (d.marketShare >= 200) {
                return d.marketShare/vis.radiusDivisor;
            }
            if (d.marketShare >= 70) {
                return d.marketShare / (vis.radiusDivisor/2);
            }
            if (d.marketShare >= 30) {
                return d.marketShare * 1.5;
            }
            return d.marketShare * 2;
        })
        .attr("fill", "lightgrey");


    vis.invisibleCircle
        .attr("cx", function (d) {
            return vis.x(d.year);
        })
        .attr("cy", function (d, index) {
            console.log("dypos: "+ d.ypos);
            return vis.y(d.ypos);
        })
        .on('mouseover', function(d, index){
            if (d.sector.indexOf($.objDragged) > -1){ //if obj dragged matches circle,
                vis.hovered = d;
                vis.labelCircles(d);       //put sector name over circle
            }
            else if ($.objDragged !== "null") {  //if an object is being dragged
                tip.show(d);
            }


        })
        .on('mouseout', function (d) {
            tip.hide(d);
        });

}


/**
 * Add sector name and market size to top of circle.
 *
 * This helper method is invoked when user drags the a draggable
 * with a sector value (eg, Agriculture) that matches the circle.
 */
MarketShareData.prototype.labelCircles= function(){
    var vis = this;

    //get x position of appended text, based on text length
    var xpos = 25;
    if (vis.hovered.sector.length > 18){
        xpos = 70;
    }
    else if (vis.hovered.sector.length > 15){
        xpos = 60;
    }
    else if (vis.hovered.sector.length >= 10){
        xpos = 30;
    }

    //add sector name
    vis.svg.append("text")
        .attr("class", "sectorlabels")
        .attr("x", vis.x(vis.hovered.year) - xpos)
        .attr("y", vis.y(vis.hovered.ypos) - vis.hovered.marketShare/vis.radiusDivisor - 25)
        .text(vis.hovered.sector);

    //add market size
    vis.svg.append("text")
        .attr("class", "sectorlabels")
        .attr("x", vis.x(vis.hovered.year) - 30)
        .attr("y", vis.y(vis.hovered.ypos) - vis.hovered.marketShare/vis.radiusDivisor - 5)
        .text("$" + vis.hovered.marketShare + " billion");
}


/*
 * Make jquery draggable and droppable objects.
 *
 * Set a global variable ('objDragged') to the value of the objected
 * dragged (eg, 'Agriculture').  This value is tested against the circles
 * hovered over, to check if they match.
 *
 * drag and drop sources: http://jsfiddle.net/6vojozy1/
 *                        https://gist.github.com/mbostock/6123708
 */
MarketShareData.prototype.makeDraggables = function() {

    $(function() {
        $( "#Finance" ).draggable({
            //stack will make draggable appear OVER the circle
            drag: function(event, ui){
                $.objDragged = "Finance";
            },
            revert: true
        });
        $( "#Service" ).draggable({
            drag: function(event, ui){
                $.objDragged = "Service";
            },
            revert: true
        });
        $( "#Industrial" ).draggable({
            drag: function(event, ui){
                $.objDragged = "Industrial";
            },
            revert: true
        });
        $( "#Healthcare" ).draggable({
            drag: function(event, ui){
                $.objDragged = "Healthcare";
            },
            revert: true
        });
        $( "#Artificial" ).draggable({
            drag: function(event, ui){
                $.objDragged = "Artificial";
            },
            revert: true
        });
        $( "#Aerospace" ).draggable({
            drag: function(event, ui){
                $.objDragged = "Aerospace";
            },
            revert: true
        });
        $( "#Transport").draggable({
            drag: function(event, ui){
                $.objDragged = "Transport";
            },
            revert: true
        });
        $( "#Agriculture").draggable({
            drag: function(event, ui){
                $.objDragged = "Agriculture";
            },
            revert: true
        });
       $("#market-share-plot").droppable({
           drop: function(event, ui){
               $.objDragged = "null"; //if null, tooltip wont appear
           }
       });

    });

}





