


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
var years = ["2006","2007","2008","2009","2010","2011","2012","2013","2014"];
var topology,
    geometries,
    carto_features,
    maxPerYear,
    maxRatePerYear,
    mySlider,
    cartoValue = 'cantidad',
    projections,
    cartos,
    yearlyMaxs,
    yearlyMaxRates,
    cartograms = [],
    cartoVariables = {};
    //carto_features = new Array(4);


var quantize = d3.scale.quantize()
  .domain([0, 1200000])
  .range(d3.range(5).map(function(i) { return "q" + i; }));

//Las proyecciones para los 4 mapas
var proj_NO =  d3.geo.mercator()
  .center([-107.1, 27.57])
  .scale(2000)
  .translate([-70,150]);

var proj_NE =  d3.geo.mercator()
  .center([-102.2, 25.75])
  .scale(1500)
  .translate([350,250]);

var proj_Oeste =  d3.geo.mercator()
  .center([-102.11, 19.17])
  .scale(2400)
  .translate([200,200]);

var proj_Centro =  d3.geo.mercator()
  .center([-98.62, 19.42])
  .scale(4000)
  .translate([200,175]);

//Insnantiate the cartograms with desired projections
var cartoNO = d3.cartogram()
    .projection(proj_NO)
    .properties(function (d) {
        return d.properties;
    });

var cartoNE = d3.cartogram()
    .projection(proj_NE)
    .properties(function (d) {
        return d.properties;
    });

var cartoOeste = d3.cartogram()
    .projection(proj_Oeste)
    .properties(function (d) {
        return d.properties;
    });

var cartoCentro = d3.cartogram()
    .projection(proj_Centro)
    .properties(function (d) {
        return d.properties;
    });

//arrays con todas las proyecciones y los cartogramas
projections = [proj_NO,proj_NE,proj_Oeste,proj_Centro]
cartos = [cartoNO,cartoNE,cartoOeste,cartoCentro]


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
  .defer(d3.json, 'data/desaparecidos_NE.json')
  .defer(d3.json, 'data/desaparecidos_NO.json')
  .defer(d3.json, 'data/desaparecidos_Oeste.json')
  .defer(d3.json, 'data/desaparecidos_Centro.json')
  .defer(d3.csv, 'data/ne.csv')
  .defer(d3.csv, 'data/no.csv')
  .defer(d3.csv, 'data/oeste.csv')
  .defer(d3.csv, 'data/centro.csv')
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




function ready(error,topos,csvs){
  //Nota: en realidad la función recibe 8 argumento (4 topologías y 4 csv)
  //no hay necesidad de nombrarlos porque abajo los vamos a utilizar con
  //arguments, que nos regresa todos los argumentos de la función.
  if (error) {return error;}

  arguments = [].slice.call(arguments)//esta linea convierte al objeto arguments en un array normal
  topologies = arguments.slice(1,5)//aquí guardamos las topologías
  csvs = arguments.slice(5)//aquí guardamos los datos
  yearlyMaxs = []
  yearlyMaxRates = []
  csvs.forEach(function(region){
    var r = computeMax(region)
    yearlyMaxs.push(r[0]);
    yearlyMaxRates.push(r[1]);
  });
  //make map
  makeMaps(topologies);
  calculateCartograms(topologies)

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
function calculateCartograms(topo){
  var cartoYears = {};
  years.forEach(function(year){
      carto_features = Array(4)
      cartos.forEach(function(carto,i){
        carto.value(function (d) {
          var scale = d3.scale.linear()
            .domain([0, maxPerYear[year]])
            .range([1, 1000]);
          return +scale(d.properties[year]);
        });
        if (carto_features[i] == undefined){
          var layer = Object.keys(topologies[i].objects)[0]
          carto_features[i] = carto(topologies[i], topologies[i].objects[layer].geometries).features;
        };
      });
      cartoYears[year] = carto_features;
  });
  cartoVariables['cantidad'] = cartoYears
  years.forEach(function(year){
      carto_features = Array(4)
      cartos.forEach(function(carto,i){
        carto.value(function (d) {
          var scale = d3.scale.linear()
            .domain([0, maxRatePerYear[year]])
            .range([1, 1000]);
          var rate = 100000*(parseFloat(d.properties[year])/parseFloat(d.properties["POB1"]));
          return +scale(rate);
        });
        if (carto_features[i] == undefined){
          var layer = Object.keys(topologies[i].objects)[0]
          carto_features[i] = carto(topologies[i], topologies[i].objects[layer].geometries).features;
        };
      });
      cartoYears[year] = carto_features;
  });
  cartoVariables['tasa'] = cartoYears

}
//Computes updated features and draws the new cartogram
function doUpdate(year) {

    cartograms.forEach(function(region,i){
      region.data(cartoVariables[cartoValue][year][i])
          .select("title")
          .text(function (d) {
            console.log(d.properties[year]);
            return d.properties.nom_mun+ ': '+d.properties[year];
          });

      region.transition()
          .duration(900)
          .each("end", function () {
              d3.select("#click_to_run").text("Listo!")
          })
          .attr("d", cartos[i].path);
    })

}

//Draws original map
function makeMaps(data){
  var mapsWrapper = d3.select('#maps');

  data.forEach(function(topoJSON,i){
    //TODO:cada región debería colorearse de acuerdo a su propio máximo de población
    var quantize = d3.scale.quantize()
      .domain([0, 1600000])
      .range(d3.range(5).map(function(i) { return "q" + i; }));

    var layer = Object.keys(topoJSON.objects)[0]
    var svg = mapsWrapper.append('svg')
        .attr("class","mapa")
        .attr({
            width: "350px",
            height: "350px"
        });

    var muns = svg.append("g")
        .attr("class", "muns")
        .attr("id",layer)
        .selectAll("path");



    var geometry = topoJSON.objects[layer].geometries;
    var carto = cartos[i]
    var features = carto.features(topoJSON, geometry),
        path = d3.geo.path()
          .projection(projections[i]);

    muns = muns.data(features)
        .enter()
        .append("path")
        .attr("class", function(d) {
          return quantize(d.properties['POB1']);
        })
        .attr("d", path);

    cartograms.push(muns)
  });
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


function computeMax(data){
  maxPerYear = {}
  maxRatePerYear = {}
  years.forEach(function(y){
    thisYear = [];
    thisRate = [];
    data.forEach(function(element){
      thisYear.push(parseInt(element[y]));
      var rate = (parseFloat(element[y])/parseFloat(element['POB1']))*100000;
      thisRate.push(rate);
    })
    maxPerYear[y] = d3.max(thisYear);
    maxRatePerYear[y] = d3.max(thisRate);
  });
  return [maxPerYear,maxRatePerYear];
}
