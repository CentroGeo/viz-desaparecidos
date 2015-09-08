/*
##############################
Variables y funciones globales
##############################
*/

/*Extiende d3.selection para poder mover objetos al frente*/
d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

//Every year
var years = ["2006","2007","2008","2009","2010","2011","2012","2013","2014"]

var map = d3.select("#map");
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
      } else if (d.estado === 'San Luis Potosí'){
        d.estado = 'SLP';
      } else if (d.estado === 'Distrito Federal'){
        d.estado = 'DF';
      } else if (d.estado === 'Nuevo León'){
        d.estado = 'Nuevo León';
      } else if (d.estado === 'Quintana Roo'){
        d.estado = 'Quintana Roo';
      } else {
        d.estado = d.estado.split(' ')[0];
      }
      years.forEach(function(y){
        d[y] = +d[y]
      })
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

function ready(error,topo,csv){
  //Compute max values for each year and store it in maxPerYear
  maxPerYear = {}
  maxRatePerYear = {}
  years.forEach(function(y){
    thisYear = [];
    thisRate = [];
    csv.forEach(function(element){
      thisYear.push(parseInt(element[y]));
      var rate = (parseFloat(element[y])/parseFloat(element['POB1']))*100000;
      thisRate.push(rate);
    })
    maxPerYear[y] = d3.max(thisYear);
    maxRatePerYear[y] = d3.max(thisRate);
  });

  rates = csv.map(function(obj){
    rObj = {};
    years.forEach(function(y){
      rObj[y] = (+obj[y]/+obj["POB1"])*100000;
    })
    rObj["id"] = obj["id"];
    rObj["estado"] = obj["estado"];
    rObj["POB1"] = obj["POB1"];
    return rObj;
  })
  cantidad = csv;
  //nest values under state key
  byState = {};
    var estado = d3.nest().key(function(d){return d.estado}).entries(csv);
    //console.log(keys);
    estado.forEach(function(d){
      var byYear = [];
      years.forEach(function(y){
        byYear.push(d.values[0][y]);
    });
    byState[d.key] = byYear;
  });
  //make map
  makeMap(topo);

  //agregar grafica de barras dentro del svg del mapa de estados
  var datos = byState["Tamaulipas"];
  var barHeight = 20;

  var x = d3.scale.linear()
      .domain([0, d3.max(datos)])
      .range([0, 190]);

  var y = d3.scale.ordinal()
      .domain(years)
      .rangePoints([0,160]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .ticks(5);

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  var barG = map.append("g")
      .attr("id", "barChart");

  var chart = d3.select("#barChart")
      .attr("width", 200)
      .attr("height", barHeight * datos.length)
    .append("g")
      .attr("transform", "translate(90, 175)");

  chart.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(0, 10)")
    .call(yAxis);

  chart.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0, 179)")
    .call(xAxis);

  var bar = chart.selectAll(".bar")
      .data(datos);

  bar.enter().append("g")
    .attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; })
    .append("rect")
    .attr("class", "bar")
    .attr("width", x)
    .attr("height", barHeight - 2);

  bar.append("text")
    .attr("x", function(d) { return x(d) + 5; })
    .attr("y", barHeight / 2)
    .attr("dy", ".35em")
    .text(function(d) { return d; });

}

//Computes updated features and draws the new cartogram
function doUpdate(year) {

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
        var rate = 100000*(parseFloat(d.properties[year])/parseFloat(d.properties["POB1"]));
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
        .attr("d", carto.path)
        .call(endAll, function () {
          carto_features = undefined;
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
      .attr("id", function (d) {
          return d.properties.estado;
      })
      .attr("class", function(d) {
        return quantize(d.properties['POB1']);
      })
      .attr("d", path);

  // darle a los estados borde de color on hover
  edos.on('mouseover', function(d,i){
    edos.style("stroke-width", function(d,j){
      return j != i ? ".5" : 2.5;
    })
    var sel = d3.select(this);
    sel.moveToFront();
  });
  edos.on('mouseout', function(d,i){
    edos.style("stroke", "black")
    .style("stroke-width", ".5");
  });

  edos.append("title")
    .text(function (d) {
      return d.properties.estado;
    });
}

function doAnimation(startYear){

  d3.select('#play').html('<i class="fa fa-play fa-stack-1x"></i><i class="fa fa-ban fa-stack-2x"></i>')
  .style({cursor: "not-allowed"});

  startIndex = years.indexOf(startYear.toString())
  if (startIndex !== 0){
    startIndex = startIndex +1;
  }
  var frameCount = 0;
  for(i = startIndex; i < years.length; i++){
    window.setTimeout(function(step){
      mySlider.value(parseInt(years[step]));
      if (step == years.length-1){
        d3.select('#play').html('<i class="fa fa-square-o fa-stack-2x"></i><i class="fa fa-play fa-stack-1x"></i>')
        .style({cursor: "pointer"});
      }
    },frameCount*1500,i);
    frameCount ++;
  }
}
