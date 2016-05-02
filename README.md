# The Impact of Robots on US Jobs

By Keven Dickey and Sarah Leinicke

## Summary:

This website was built for a final project in the class [CS 171 - Visualization](http://www.cs171.org/) from Harvard University.  We used [D3](https://d3js.org/) as our primary tool to create various visualizations about robots and their impact on jobs in the United States. 

## URLS:

**Website:** http://neuquen.github.io  
**Screencast:** http://website.com

## Site Structure:
### HTML Pages:

Our site consists of an introductory page and five supporting pages, with each supporting page containing a separate visualization:

index.html  
robotUnitsSold.html  
marketShareData.html  
futureOfEmployment.html  
byState.html  
employmentByOccupation.html

### D3 Scripts:

The code for each D3 visualization is contained in a separate JavaScript file and includes a main JavaScript file for any code that should be shared among multiple visualizations:

js/main.js  
js/robotUnitsSold.js  
js/marketShareData.js  
js/futureOfEmployment.js  
js/byState.js  
js/employmentByOccupation.js  
js/employmentByOccupation-timeline.js 

### Stylesheets:

We used a single stylesheet for our custom styles and also included the bootstrap stylesheet:

css/style.css  
css/bootstrap.min.css

## Third-party JavaScript Libraries:

We used the following third-party libraries on various pages on our site:

js/bootstrap.min.js - [Bootstrap](http://getbootstrap.com/)  
js/colorbrewer.js - [ColorBrewer](https://github.com/mbostock/d3/tree/master/lib/colorbrewer)  
js/d3-legend.min.js - [D3 Legend](http://d3-legend.susielu.com/)  
js/d3-queue.v2.min.js - [D3 Queue](https://github.com/d3/d3-queue)  
js/d3.tip.js - [D3 Tip](https://github.com/Caged/d3-tip)  
js/d3.v3.min.js - [D3](https://d3js.org/)  
js/jquery-2.2.0.min.js - [jQuery](https://jquery.com/)  
js/jquery-ui.min.js - [jQuery UI](https://jqueryui.com/)  
js/topojson.js - [TopoJSON](https://github.com/mbostock/topojson) 

## Data:

The data includes information about current investment in robotics, expected market share of robots by sector, jobs which will likely be computerized, the impact that robots will have regionally in the US, and US employment trends:

data/ByState2014.csv  
data/ByState2015.csv  
data/MarketShareData.csv  
data/RobotUnitsSold.csv  
data/The-Future-of-Employment.csv  
data/employment-by-occupation.csv  
data/us-state-names.tsv  
data/us.json