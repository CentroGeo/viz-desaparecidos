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
var mapRegions = ['noroeste','noreste','centro','pacifico']
var map = d3.select("#map");
var region = map.append("g")
    .attr("id", "region")
    .selectAll("path");

var quantize = d3.scale.quantize()
  .domain([0, 16000000])
  .range(d3.range(5).map(function(i) { return "q" + i; }));

var topologies,
    carto_features,
    yearlyMaxs,
    yearlyMaxRates,
    byState,
    mySlider,
    cartoValue = 'cantidad',
    proj,
    visibleRegion = 'noroeste',
    carto,
    pause = false,
    animating = false;

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

    var axis = d3.svg.axis().orient("bottom").ticks(8)
    var axisFormatter = function(d){
      if(d === 2005){
        return "Inicio"
      }else{
        return d
      }
    }
    axis.tickFormat(axisFormatter)
    mySlider = d3.slider()
    .axis(axis)
    .min(2005)
    .max(2014)
    .step(1)
    .on("slide", function(evt, value,type) {
      if(type == undefined){
        doUpdate(value,visibleRegion);
      }
    });
    d3.select('#slider').call(mySlider);

    //Build a queue to load all data files
    queue()
      .defer(d3.json, 'data/desaparecidos_NO.json')
      .defer(d3.json, 'data/desaparecidos_NE.json')
      .defer(d3.json, 'data/desaparecidos_Centro.json')
      .defer(d3.json, 'data/desaparecidos_Oeste.json')
      .defer(d3.csv, 'data/no.csv')
      .defer(d3.csv, 'data/ne.csv')
      .defer(d3.csv, 'data/centro.csv')
      .defer(d3.csv, 'data/oeste.csv')
      .await(ready);

    //Add listener to radio buttons and set cartogram variable

    d3.selectAll('input[name="cartogram-value"]')
      .on("change", function(event,data){
          if (data === 0){
            cartoValue = 'cantidad';
          }else{
            cartoValue = 'tasa';
          }

          doUpdate(mySlider.value(),visibleRegion);
        });

    //Add listener to radio buttons and set visibleRegion
    d3.selectAll('input[name="cartogram-region"]')
      .on("change", function(event,data){
          if (data === 0){
            visibleRegion = 'noroeste';
          }else if(data === 1){
            visibleRegion = 'noreste';
          }else if(data === 2){
            visibleRegion = 'centro';
          }else{
            visibleRegion = 'pacifico';
          }
          var topoIndex = mapRegions.indexOf(visibleRegion)
          makeMap(topologies[topoIndex],visibleRegion);
          //makeMap()
        });

    d3.select('#play')
    .on("click", function(evt) {
      if(animating == false){
        animating = true;
        pause = false;
        d3.select('#play-pause').classed("fa fa-play fa-stack-1x",false);
        d3.select('#play-pause').classed("fa fa-pause fa-stack-1x",true);
        doAnimation(mySlider.value()+1);
      }else{
        animating = false;
        pause = true;
        d3.select('#play-pause').classed("fa fa-pause fa-stack-1x",false);
        d3.select('#play-pause').classed("fa fa-play fa-stack-1x",true);
      }


    });

}
window.onload = main


function ready(error,topos,csvs){
  //Nota: en realidad la función recibe 8 argumentos (4 topologías y 4 csvs)
  //no hay necesidad de nombrarlos porque abajo los vamos a utilizar con
  //arguments, que nos regresa todos los argumentos de la función.
  if (error) {return error;}
  //Compute max values for each year and store it in maxPerYear
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
  var topoIndex = mapRegions.indexOf(visibleRegion)
  makeMap(topologies[topoIndex],visibleRegion);
}

//Computes updated features and draws the new cartogram
function doUpdate(year,visibleRegion) {

    var regionIndex = mapRegions.indexOf(visibleRegion)
      carto.value(function (d) {
      if (cartoValue === 'cantidad'){
        if(year === 2005){
          //escalamos por área, es decir, hacemos el mapa original
          return d.properties["area"];
        }else{
          var scale = d3.scale.linear()
            .domain([0, yearlyMaxs[regionIndex][year]])
            .range([1, 1000]);
            return +scale(d.properties[year]);
        }

      }else{
        if(year === 2005){
          //escalamos por área, es decir, hacemos el mapa original
          return d.properties["area"];
        }else{
          var scale = d3.scale.linear()
            .domain([0, maxRatePerYear[year]])
            .range([1, 1000]);
          var rate = 100000*(parseFloat(d.properties[year])/parseFloat(d.properties["POB1"]));
          return +scale(rate);        }
      }
    });

    if (carto_features == undefined)
        //this regenrates the topology features for the new map based on
        var layer = Object.keys(topologies[regionIndex].objects)[0]
        carto_features = carto(topologies[regionIndex], topologies[regionIndex].objects[layer].geometries).features;

    //update the map data
    region.data(carto_features)
        .select("title")
        .text(function (d) {
          return 'algún título';
        });

    region.transition()
        .duration(900)
        .attr("d", carto.path)
        .call(endAll, function () {
          carto_features = undefined;
        });
}


//Draws original map
function makeMap(data,regionVisible){

  if(regionVisible === 'noroeste'){
    var center = [-107.1, 27.57];
    var scale = 1800;
    var translate = [420,200];
  }else if (regionVisible === 'noreste') {
    var center = [-102.2, 25.75];
    var scale = 2200;
    var translate = [380,200];
  }else if (regionVisible === 'centro') {
    var center = [-98.62, 19.42];
    var scale = 5000;
    var translate = [420,200];
  }else {
    var center = [-102.11, 19.17];
    var scale = 3000;
    var translate = [420,220];
  }

  proj =  d3.geo.mercator()
    .center(center)
    .scale(scale)
    .translate(translate)

  //Instanciamos el cartograma para que esté disponible para doUpdate
  carto = d3.cartogram()
      .projection(proj)
      .properties(function (d) {
          return d.properties;
      });

  var layer = Object.keys(data.objects)[0]
  var geometries = data.objects[layer].geometries;

  //these 2 below create the map and are based on the topojson implementation
  var features = carto.features(data, geometries),
      path = d3.geo.path()
          .projection(proj);

  //Aquí hacemos el join usando cve_mun como llave para poder quitarlos en el update
  region = region.data(features,function(d){return d.properties.cvegeo_x})
  region.enter()
      .append("path")
      .attr("class", function(d) {
        return quantize(d.properties['POB1']);
      })
      .attr("d", path);

  region.exit().remove();

  // darle a los estados borde de color on hover
  region.on('mouseover', function(d,i){
    region.style("stroke-width", function(d,j){
      return j != i ? ".5" : 2.5;
    })
    var sel = d3.select(this);
    sel.moveToFront();
  });
  region.on('mouseout', function(d,i){
    region.style("stroke", "black")
    .style("stroke-width", ".5");
  });

  region.append("title")
    .text(function (d) {
      return d.properties.estado;
    });
}

function doAnimation(year){
  //console.log(typeof(year));
  var regionIndex = mapRegions.indexOf(visibleRegion)
  // console.log(typeof(year));
  //   if (year == 2005){
  //     year = 2006;
  //   }
    carto.value(function (d) {
      if (cartoValue === 'cantidad'){
        if(year === 2005){
          //escalamos por área, es decir, hacemos el mapa original
          return d.properties["area"];
        }else{
          var scale = d3.scale.linear()
            .domain([0, yearlyMaxs[regionIndex][String(year)]])
            .range([1, 1000]);
            return +scale(d.properties[String(year)]);
        }

      }else{
        if(year === 2005){
          //escalamos por área, es decir, hacemos el mapa original
          return d.properties["area"];
        }else{
          var scale = d3.scale.linear()
            .domain([0, maxRatePerYear[String(year)]])
            .range([1, 1000]);
          var rate = 100000*(parseFloat(d.properties[String(year)])/parseFloat(d.properties["POB1"]));
          return +scale(rate);        }
      }
  });

  if (carto_features == undefined)
      //this regenrates the topology features for the new map based on
      var layer = Object.keys(topologies[regionIndex].objects)[0]
      carto_features = carto(topologies[regionIndex], topologies[regionIndex].objects[layer].geometries).features;

  //update the map data
  region.data(carto_features)
      .select("title")
      .text(function (d) {
        return 'algún título';
      });


  region.transition()
      .duration(1500)
      .attr("d", carto.path)
      .call(endAll, function () {
        carto_features = undefined;
        var currentIndex = years.indexOf(String(year))
        mySlider.value(year)
        if(currentIndex < years.length-1 & pause == false){
          doAnimation(parseInt(years[currentIndex + 1]))
        }else{
          animating = false;
          pause = true;
          window.setTimeout(function(){
            d3.select('#play-pause').classed("fa fa-pause fa-stack-1x",false);
            d3.select('#play-pause').classed("fa fa-play fa-stack-1x",true)
            mySlider.value(2005)
            doUpdate(2005,visibleRegion)            
          },1000)

        }
      });
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
