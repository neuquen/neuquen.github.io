/*
 * Load the data
 *
 *
 */
loadData();
function loadData() {
    d3.csv("data/MarketShareData.csv", function(error, csv) {
        if (error) throw error;

        //Process and clean the data
        csv.forEach(function(d){
            //Convert string to 'date object'
            d.year = d3.time.format("%Y").parse(d.year);
            d.marketShare = +d.marketShare;
        });

        //sort jobs ascending by year
        csv.sort(function (a, b){
            return a.year- b.year;
        });

        // Draw the visualization for the first time
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
    this.displayData = []; // see data wrangling

    // DEBUG RAW DATA
    console.log(this.data);

    this.initVisPlot();
    //this.initVisList();
    //this.makeDraggableList();
}




//drag and drop sources: http://jsfiddle.net/6vojozy1/
//                      https://gist.github.com/mbostock/6123708
//
MarketShareData.prototype.makeDraggableList = function(){

    var vis = this;

    var drag = d3.behavior.drag()
        .origin(function(d) {
            return d;
        })
        .on("dragstart", dragstarted)
        .on("drag", dragged)
        .on("dragend", dragended);


    //make g element
    vis.rectGroup = vis.svg.append("g")
       .data(vis.data);


    //add rect to g element
    vis.rect = vis.rectGroup.selectAll("rect")
        .data(vis.data)
        .enter()
        .append("rect")
        .attr("fill", "none")
        .attr("width", 210)  //long
        .attr("height", 30) //thick
        .attr("x", -400)
        .attr("y", function(d,index){
            return 75 + (50*index);
        })
        .call(drag);


    //add text to g element
    vis.rectText = vis.rectGroup.selectAll("text")
        .data(vis.data)
        .enter()
        .append("text", "marketshareList")
        .attr("x", -390)
        .attr("y", function(d,index){
            return 92 + (50*index);
        })
        .text(function(d) {
            if (d.sector == "AI"){
                return "Artificial Intelligence";
            }
            if (d.sector.indexOf("bots")>-1){
                return "Service (care-bots, education)";
            }
            return d.sector;
        })
        .call(drag);


    //add title
    vis.svg.append("text")
        .attr("class", "drag-instructions")
        .attr("x", -400)   //position relative to top corner
        .attr("y", 0)
        .text("Drag a sector to the correct circle.");



    function dragstarted(d) {
        //d3.event.sourceEvent.stopPropagation();
        d3.select(this).classed("dragging", true);
    }

    function dragged(d) {
        d3.select(this)
            .attr("x", d.x = event.x)
            .attr("y", d.y = event.y);

    }

    function dragended(d) {
        console.log("event.x: "+event.x + ", this.getAttributex: "+ this.getAttribute("x"));
        console.log("d.text: "+ d3.event.text);
        d3.select(this).classed("dragging", false);
    }


}

/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */
MarketShareData.prototype.initVisPlot = function(){
    var vis = this;
    //vis.objDragged = "";

    vis.margin = { top: 100, right: 50, bottom: 100, left: 400 };

    vis.width = 1000 - vis.margin.left - vis.margin.right,
        vis.height = 700 - vis.margin.top - vis.margin.bottom;


    // SVG drawing area
    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    //vis.radius = 5;

    // Define scales
    vis.x = d3.time.scale().range([0,vis.width]);
    vis.y = d3.scale.linear().range([vis.height,0]);

    // Define domains

    var minYr = new Date("2015");
    var maxYr = new Date("2027");
    vis.x.domain([minYr, maxYr]);//d3.extent(vis.data, function(d){return d.year;}));
    vis.y.domain([0, 300]);//[0, d3.max(vis.data, function(d) { return d.marketShare;})]);
    //vis.y.domain(d3.extent(vis.data, function(d){return d.marketShare;}));

    //set axis
    vis.xAxis = d3.svg.axis()
        .scale(vis.x)
        .orient("bottom")
        .ticks(d3.time.year, 5)
        .tickFormat(d3.time.format(("%Y")));

    vis.yAxis  = d3.svg.axis()
        .scale(vis.y)
        .orient("left")
        .ticks(4);

    //Append axis
    vis.svg.append("g").attr("class", "axis x-axis")
        .attr("transform", "translate(0," + vis.height + ")")
        .call(vis.xAxis);

    vis.svg.append("g").attr("class", "axis y-axis").call(vis.yAxis);


    //add title
    vis.svg.append("text")
        .attr("class", "title")
        .attr("x", 30)   //position relative to top corner
        .attr("y", -50)
        .text("Forcasted Robotics Marketsize in US");

    //add y-axis label
    vis.svg.append("text")
        .attr("class", "axis-label")
        .style("text-anchor", "end")
        .attr("x", -180)
        .attr("y", -60)
        .attr("dy", ".1em")
        .attr("transform", "rotate(-90)")  //rotate x-axis labels
        .text("Marketsize in USD Billions");


    //add data source

    vis.svg.append("text")
        .attr("class", "data-source")
        .attr("x", 0)
        .attr("y", vis.height + 60)
        .text("Source: Robot Revolution - Global Robot & AI Primer, Bank of America Merrill Lynch");

    vis.svg.append("text")
        .attr("class", "data-source")
        .attr("x", 0)
        .attr("y", vis.height + 80)
        .text("http://www.bofaml.com/content/dam/boamlimages/documents/PDFs/robotics_and_ai_condensed_primer.pdf");


    vis.makeVis();
    //vis.wrangleData();
}



/*
 * Data wrangling - Filter, aggregate, modify data
 */

MarketShareData.prototype.wrangleData = function(){
    var vis = this;

    // Filter, aggregate or modify the data


    vis.displayData = vis.filteredData;

    // Update the visualization
    vis.updateVis();
}

/*
 * Draw the areachart and circles. Add the tooltips.
 */
MarketShareData.prototype.makeVis = function(){
    var vis = this;

    // https://github.com/mbostock/d3/blob/master/lib/colorbrewer/colorbrewer.js - Set2, number 8
    vis.color = ["#66c2a5","#fc8d62","#8da0cb","#e78ac3","#a6d854","#ffd92f","#e5c494","#b3b3b3"];

    var formatDate = d3.time.format("%Y");
    var addComma = d3.format("0,000");

    //init tooltip
    //source for changing opacity: http://stackoverflow.com/questions/30066259/
    //        d3-js-changing-opacity-of-element-on-mouseover-if-condition-false
    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .html(function(d){

            d3.select(this).style("opacity",.3);
            if (d.sector.indexOf($.objDragged) > -1){ //$.objDragged === d.sector
                return "CORRECT! <br> Industry detail to come.";
            }
            return ("Wrong. Try again.");
            //return d.marketShare + " billion";
        });

    vis.svg.call(tip);

    vis.smallCircleRadius = 3;

    //make circles
    vis.circle = vis.svg.selectAll("circle")
        .data(vis.data);

    vis.circle.enter()
        .append("circle")
        .attr("class", "marketShareCircles")
        .attr("r", function(d){
            return (d.marketShare)/vis.smallCircleRadius;
        })
        .attr("fill", function(d, index){
            console.log("color: "+ vis.color[index]);
            return vis.color[index];
        })
        .attr("stroke", function(d, index){
            return vis.color[index];
        });



    vis.circle
        .attr("cx", function(d){
            return vis.x(d.year);
        })
        .attr("cy", function(d, index){
            return vis.y(d.marketShare)
        })
        .on('mouseover', tip.show)

        .on('mouseout', function(d){
            tip.hide(d);
            d3.select(this).style("opacity", 1);
        });






    //jQuery droppable ui: http://jqueryui.com/droppable/
    $(function() {
        $( "#Finance" ).draggable({
            //stack will make draggable appear OVER the circle
            drag: function(event, ui){
                $.objDragged = "Finance";
            }
        });
        $( "#Service" ).draggable({
            drag: function(event, ui){
                $.objDragged = "Service";
            }
        });
        $( "#Industrial" ).draggable({
            drag: function(event, ui){
                $.objDragged = "Industrial";
            }
        });
        $( "#Healthcare" ).draggable({
            drag: function(event, ui){
                $.objDragged = "Healthcare";
            }
        });
        $( "#AI" ).draggable({
            drag: function(event, ui){
                $.objDragged = "Artificial";
            }
        });
        $( "#Aerospace" ).draggable({
            drag: function(event, ui){
                $.objDragged = "Aerospace";
            }
        });
        $( "#Autos").draggable({
            drag: function(event, ui){
                $.objDragged = "Autos";
            }
        });
        $( "#Agriculture").draggable({
            drag: function(event, ui){
                $.objDragged = "Agriculture";
            }
        });
       $( "#market-share-plot" ).droppable({});
    });

}





