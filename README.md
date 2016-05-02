# The Impact of Robots on US Jobs

By Keven Dickey and Sarah Leinicke

## Summary:

This website was built for a final project in the class [CS 171 - Visualization](http://www.cs171.org/) from Harvard University.  We used [D3](https://d3js.org/) as our primary tool to create various visualizations about the potential impact of robotics on jobs in the United States. 

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

Below are the data files and sources.

data/ByState2015.csv  
  **description**: 2015 state employment by field and occupation  
  **source**: US Bureau of Labor Statistics, May 2015 State Occupational Employment and Wage Estimates,
  http://www.bls.gov/oes/current/oessrcst.htm

data/MarketShareData.csv  
  description: projected future market sizes of robotics in major economic sectors  
  source: Robotic Revolution - Global Robot & AI Primer, Bank of America Merril Lynch, December 2015,  http://www.bofaml.com/content/dam/boamlimages/documents/PDFs/robotics_and_ai_condensed_primer.pdf

data/RobotUnitsSold.csv  
  description: worlwide industrial robotics sales since 2004  
  source: International Federation of Robotics, World Robot 2015 Industrial Robot Statistics, http://www.ifr.org/industrial-robots/statistics/

data/The-Future-of-Employment.csv  
  description: the probability of computerization for 702 occupations  
  source: “The Future of Employment: How Susceptible are Jobs to Computerisation?”, Carl Benedikt Frey and Michael A. Osborne, Appendix, http://www.oxfordmartin.ox.ac.uk/downloads/academic/The_Future_of_Employment.pdf

data/employment-by-occupation.csv  
  description: US employment and unemployment by field and occupation since 2000  
  source: US Bureau of Labor Statistics, Employed and unemployed persons by occupation, not seasonally adjusted,  http://www.bls.gov/webapps/legacy/cpsatab13.htm and http://www.bls.gov/webapps/legacy/cpsatab14.htm

data/us.json  
data/us-state-names.tsv  
  description: mapping data  
  source: Mike Bostock, http://bl.ocks.org/mbostock/raw/4090846/us.json, https://gist.github.com/mbostock/4090846#file-us-state-names-tsv
