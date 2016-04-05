// Global data object
var allData = [];

// Variables for the visualization instances
var areachart, timeline;

// Start application by loading the data
loadData();

function loadData() {
    // TODO: We should only need to queue the data if we plan on creating a single-page website. Single or multi-page?
    d3.queue()
        .defer(d3.csv, "data/RobotUnitsSold.csv")
        .defer(d3.csv, "data/The-Future-of-Employment.csv")
        .defer(d3.csv, "data/ByState2014.csv")
        .defer(d3.csv, "data/MarketShareData.csv")
        .defer(d3.csv, "data/employment-by-occupation.csv")
        .await(prepareData);

    function prepareData(error, robotUnitsSold, futureOfEmployment, byState, marketShareData, employmentByOccupation) {
        if (error) throw error;

        //Process and clean the data


        createVis();
    }
}

function createVis() {

    // TO-DO: Instantiate visualization objects here
}
