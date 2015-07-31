function ready(error,topo,csv){
  //Compute max values for each year and store it in maxPerYear
  maxPerYear = {}
  maxRatePerYear = {}
  years.forEach(function(y){
    thisYear = [];
    thisRate = [];
    csv.forEach(function(element){
      thisYear.push(parseInt(element[y]));
      var rate = (parseFloat(element[y])/parseFloat(element['POB1']))*100000
      thisRate.push(rate)

    })
    maxPerYear[y] = d3.max(thisYear);
    maxRatePerYear[y] = d3.max(thisRate);
  });

  //nest values under state key
  byState = d3.nest().key(function(d){return d.estado}).map(csv);

  //make map
  makeMap(topo);
  makeParallelPlot(csv);
}

//Triggers a callback at the end of the last transition
function endAll (transition, callback) {
    var n;
    if (transition.empty()) {
        callback();
    }
    else {
        n = transition.size();
        transition.each("end", function () {
            n--;
            if (n === 0) {
                callback();
            }
        });
    }
}

//Computes updated features and draws the new cartogram
function doUpdate(year) {
    // this sets the value to use for scaling, per state.
    // Here I used the total number of incidenes for 2012
    // The scaling is stretched from 0 to the max of that year and
    // mapped from 0 to max+1.
    // Otherwise I get an ERROR when the propertie has 0s...


    carto.value(function (d) {
      if (cartoValue === 'cantidad'){
        var scale = d3.scale.linear()
        .domain([0, maxPerYear[year]])
        .range([1, 1000]);
        return +scale(d.properties[year]);
      }else{
        var scale = d3.scale.linear()
        .domain([0, maxRatePerYear[year]])
        .range([1, 1000]);
        var rate = 100000*(parseFloat(d.properties[year])/parseFloat(d.properties["POB1"]))
        return +scale(rate);
      }

    });

    if (carto_features == undefined)
        //this regenrates the topology features for the new map based on
        carto_features = carto(topology, geometries).features;

    //update the map data
    edos.data(carto_features)
        .select("title")
        .text(function (d) {
            return d.properties.estado+ ': '+d.properties[year];
        });

    edos.transition()
        .duration(900)
        .each("end", function () {
            d3.select("#click_to_run").text("Listo!")
        })
        .attr("d", carto.path)
        .call(endAll, function () {
          carto_features = undefined
        });
}

//Draws original map
function makeMap(data){
  topology = data;
  geometries = topology.objects.desaparecidos_estatal.geometries;

  //these 2 below create the map and are based on the topojson implementation
  var features = carto.features(topology, geometries),
      path = d3.geo.path()
          .projection(proj);

  edos = edos.data(features)
      .enter()
      .append("path")
      .attr("class", "edos")
      .attr("id", function (d) {
          return d.properties.estado;
      })
      .attr("class", function(d) {
        return quantize(d.properties['POB1']);
      })
      .attr("d", path);

  edos.append("title")
      .text(function (d) {
          return d.properties.estado;
      });

  d3.select("#click_to_run").text("Haz cartograma");

}

function doAnimation(startYear){
  startIndex = years.indexOf(startYear.toString())
  if (startIndex !== 0){
    startIndex = startIndex +1;
  }
  var frameCount = 0;
  for(i = startIndex; i < years.length; i++){
    window.setTimeout(function(step){
      mySlider.value(parseInt(years[step]))
    },frameCount*1500,i);
    frameCount ++;
  }
}

function makeParallelPlot(dataEdos){

  /* TODO: ordenar columnas. Que aparezcan como
  // en el csv */

  var margin = {top: 30, right: 10, bottom: 10, left: 35},
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var x = d3.scale.ordinal().rangePoints([0, width], 1),
      y = {};

  var line = d3.svg.line(),
      axis = d3.svg.axis().orient("left"),
      background,
      foreground;

  var svg = d3.select("#parallelPlot").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Extract the list of dimensions and create a scale for each.
  var dimensions = d3.keys(dataEdos[0]).filter(function(d) {
    if (d === "POB1" || d === "id") {
      //continue;
    } else if (d === "estado") {
      var labels = [];
      return (y[d] = d3.scale.ordinal()
          .domain(d3.keys(byState))
          .rangePoints([height, 0]));
    } else
      return (y[d] = d3.scale.linear()
        .domain(d3.extent(dataEdos, function(p) { return +p[d]; }))
        .range([height, 0]));
  });
  var tmp = dimensions.splice(dimensions.length-1,1);
  dimensions.splice(0,0,tmp[0])
  x.domain(dimensions);

  // Add grey background lines for context.
  background = svg.append("g")
      .attr("class", "background")
    .selectAll("path")
      .data(dataEdos)
    .enter().append("path")
      .attr("d", path);

  // Add blue foreground lines for focus.
  foreground = svg.append("g")
      .attr("class", "foreground")
    .selectAll("path")
      .data(dataEdos)
    .enter().append("path")
      .attr("class", "linea")
      .attr("d", path);

  // Add a group element for each dimension.
  var g = svg.selectAll(".dimension")
      .data(dimensions)
    .enter().append("g")
      .attr("class", "dimension")
      .attr("transform", function(d) { return "translate(" + x(d) + ")"; });

  // Add an axis and title.
  g.append("g")
      .attr("class", "axis")
      .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
    .append("text")
      .style("text-anchor", "middle")
      .attr("y", -9)
      .text(function(d) { return d; });

  // Add and store a brush for each axis.
  g.append("g")
      .attr("class", "brush")
      .each(function(d) { d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brush", brush)); })
      /* TODO: remove brush from ordinal axis */
    .selectAll("rect")
      .attr("x", -8)
      .attr("width", 16);

  svg.selectAll(".foreground path")
    .on("mouseover", function(d, i) {
      svg.selectAll(".linea")
      .transition()
      .duration(100)
      .style("stroke", function(d, j) {
        return j != i ? 'steelblue' : 'red';
      })
      .style("stroke-width", function(d, j) {
        return j != i ? '1' : '2';
      });
  })

    .on("mouseout", function(d, i) {
     svg.selectAll(".linea")
      .transition()
      .duration(100)
      .style({"stroke": "steelblue"})
      .style({"stroke-width": "1.5"})
  });

  // Returns the path for a given data point.
  function path(d) {
    return line(dimensions.map(function(p) { return [x(p), y[p](d[p])]; }));
  }

  // Handles a brush event, toggling the display of foreground lines.
  function brush() {
    var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
        extents = actives.map(function(p) { return y[p].brush.extent(); });
    foreground.style("display", function(d) {
      return actives.every(function(p, i) {
        return extents[i][0] <= d[p] && d[p] <= extents[i][1];
      }) ? null : "none";
    });
  }
}

//////////
//Globals
//////////

//Every year
var years = ["2006","2007","2008","2009","2010","2011","2012","2013","2014"]
var map = d3.select("#map");
i = 0;//year counter
var edos = map.append("g")
    .attr("id", "edos")
    .selectAll("path");

var proj =  d3.geo.mercator()
  .center([-97.16, 21.411])
  .scale(1000)
//  .translate([300,300]);//TODO: set this value

var quantize = d3.scale.quantize()
  .domain([0, 16000000])
  .range(d3.range(5).map(function(i) { return "q" + i; }));

var topology,
    geometries,
    carto_features,
    maxPerYear,
    maxRatePerYear,
    byState,
    mySlider,
    cartoValue = 'cantidad';

//Insnantiate the cartogram with desired projection
var carto = d3.cartogram()
    .projection(proj)
    .properties(function (d) {
        // this add the "properties" properties to the geometries
        return d.properties;
    });


function main(){

  //Slider
  var axis = d3.svg.axis().orient("bottom").ticks(8)
  axis.tickFormat(d3.format("d"))
  mySlider = d3.slider()
  .axis(axis)
  .min(2006)
  .max(2014)
  .step(1)
  .on("slide", function(evt, value) {
    doUpdate(value);
  });
  d3.select('#slider').call(mySlider);

  //Build a queue to load all data files
  queue()
  .defer(d3.json, 'data/des_estado_simple.json')
  .defer(d3.csv, 'data/desaparecidos_estatal.csv', function(d) {
    if (d.estado === 'Baja California Sur'){
      d.estado = 'BCS';
    } else if (d.estado === 'Baja California'){
      d.estado = 'BC';
    } else {
      d.estado = d.estado.split(' ')[0];
    }
    return d;
  })
  .await(ready);

  //Add listener to radio buttons and set cartogram variable
  d3.selectAll('input[name="cartogram-value"]')
    .on("change", function(event,data){
        if (data === 0){
          cartoValue = 'cantidad';
        }else{
          cartoValue = 'tasa';
        }
        doUpdate(mySlider.value());
      });

  d3.select('#play')
  .on("click", function(evt) {
    doAnimation(mySlider.value());
  });

}

window.onload = main
