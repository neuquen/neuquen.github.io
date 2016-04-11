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
        new FutureOfEmployment("future-of-employment", csv);
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

    vis.margin = { top: 40, right: 0, bottom: 60, left: 60 };

    vis.width = 700 - vis.margin.left - vis.margin.right,
        vis.height = 500 - vis.margin.top - vis.margin.bottom;

    // SVG drawing area
    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    vis.socMap =
        {
            "11": "Management",
            "13": "Business and Financial Operations",
            "15": "Computer and Mathematical",
            "17": "Architecture and Engineering",
            "19": "Life, Physical, and Social Science",
            "21": "Community and Social Services",
            "23": "Legal",
            "25": "Education, Training, and Library",
            "27": "Arts, Design, Entertainment, Sports, and Media",
            "29": "Healthcare Practitioners and Technical",
            "31": "Healthcare Support",
            "33": "Protective Service Occupations",
            "35": "Food Preparation and Serving Related",
            "37": "Building and Grounds Cleaning and Maintenance",
            "39": "Personal Care and Service",
            "41": "Sales and Related",
            "43": "Office and Administrative Support",
            "45": "Farming, Fishing, and Forestry",
            "47": "Construction and Extraction",
            "49": "Installation, Maintenance, and Repair",
            "51": "Production",
            "53": "Transportation and Material Moving",
            "55": "Military Specific"
        };

    // Scales and axes
    vis.x = d3.scale.ordinal()
        .domain(Object.keys(vis.socMap).map(function(d) {
            return vis.socMap[d];
        }))
        .rangeRoundBands([0, vis.width], .1);

    vis.y = d3.scale.linear()
        .domain([0,1])
        .range([vis.height, 0]);

    vis.xAxis = d3.svg.axis()
        .scale(vis.x)
        .orient("bottom");

    vis.yAxis = d3.svg.axis()
        .scale(vis.y)
        .ticks(10, "%")
        .orient("left");

    vis.svg.append("g")
        .attr("class", "x-axis axis")
        .attr("transform", "translate(0," + vis.height + ")");

    vis.svg.append("g")
        .attr("class", "y-axis axis");

    // Initialize layout




    vis.wrangleData();
}



/*
 * Data wrangling - Filter, aggregate, modify data
 */

FutureOfEmployment.prototype.wrangleData = function(){
    var vis = this;

    // Filter, aggregate or modify the data
    //TODO: Combine the fields and average the probability

    vis.displayData = vis.filteredData;

    // Update the visualization
    vis.updateVis();
}



/*
 * The drawing function - should use the D3 update sequence (enter, update, exit)
 * Function parameters only needed if different kinds of updates are needed
 */

FutureOfEmployment.prototype.updateVis = function(){
    var vis = this;

    // Update domain


    // Data Join
    var bar = vis.svg.selectAll("g").data(vis.data);  //TODO: use displayData after filtering

    // Enter
    bar.enter().append("g").append("rect")
        .attr("class", "bars")
        .attr("width", vis.x.rangeBand())
        .attr("height", function(d) {
            return vis.height - vis.y(d.Probability);
        })
        .attr("x", function(d) {
            return vis.x(vis.socMap[d.SOC_code]);
        })
        .attr("y", function(d) {
            return vis.y(d.Probability);
        })

    //bar.append("text")
    //    .attr("class", "percentage")
    //    .attr("x", function(d) {
    //        return vis.x(vis.socMap[d.SOC_code]) + (vis.x.rangeBand()/2);
    //    })
    //    .attr("y", function(d, index) {
    //        return vis.y(d.Probability) - 5;
    //    })
    //    .text(function(d) {
    //        var percent = d3.format("p");
    //        return percent(d.Probability);
    //    })


    // Update


    // Exit
    bar.exit().remove();


    // Call axis functions with the new domain
    vis.svg.select(".x-axis").call(vis.xAxis);
    vis.svg.select(".y-axis").call(vis.yAxis);
}

