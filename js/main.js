// Global data objects
var robotUnitsData = [], futureEmploymentData = [], stateData = [], mapData = [], marketShareData = [], employmentOccupationData = [];

// Variables for the visualization instances
var robotUnitsSold, futureOfEmployment, byState, marketShare, employmentByOccupation;

// Start application by loading the data
loadData();

function loadData() {
    // TODO: Restructure so that we don't load every CSV on every page. @Keven
    var queue = d3_queue.queue();

    queue
        .defer(d3.csv, "data/RobotUnitsSold.csv")
        .defer(d3.csv, "data/The-Future-of-Employment.csv")
        .defer(d3.csv, "data/ByState2014.csv")
        .defer(d3.csv, "data/MarketShareData.csv")
        .defer(d3.csv, "data/employment-by-occupation.csv")
        .defer(d3.json, "data/us.json")
        .await(prepareData);

    function prepareData(error, robotUnitsSold, futureOfEmployment, byState, marketShare, employmentByOccupation, map) {
        if (error) throw error;

        //Process and clean the data

        //source for regex to remove non-numeric chars from strings:
        //http://stackoverflow.com/questions/1862130/strip-non-numeric-characters-from-string
        byState.forEach(function(d){
            d.TOT_EMP = +d.TOT_EMP.replace(/\D/g,'');
            d.OCC_CODE = +d.OCC_CODE.replace(/\D/g,'');
            d.JOBS_1000 = +d.JOBS_1000;
        });

        //Store data in global variable
        robotUnitsData = robotUnitsSold;
        futureEmploymentData = futureOfEmployment;
        stateData = byState;
        marketShareData = marketShare;
        employmentOccupationData = employmentByOccupation;
        mapData = map;


        createVis();
    }
}

function createVis() {

    // Instantiate visualization objects here
    if (typeof RobotUnitsSold == "function") {
        robotUnitsSold = new RobotUnitsSold("robot-units-sold", robotUnitsData);
    }
    if (typeof FutureOfEmployment == "function") {
        futureOfEmployment = new FutureOfEmployment("future-of-employment", futureEmploymentData);
    }
    if (typeof ByState == "function") {
        byState = new ByState("by-state", stateData, mapData);
    }
    if (typeof MarketShareData == "function") {
        marketShare = new MarketShareData("market-share-data", marketShareData);
    }
    if (typeof EmploymentByOccupation == "function") {
        employmentByOccupation = new EmploymentByOccupation("employment-by-occupation", employmentOccupationData);
    }
}
