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
var mapRegions = ['noroeste','noreste','centro','pacifico'];
var legendColors = ["#fcc383","#fc9f67","#f4794e","#e65338","#ce2a1d","#b30000"];
var legend_labels = ["< 32", "32-64", "64-96", "96-128", "128-160","> 160"];
var map = d3.select("#map");
var region = map.append("g")
    .attr("id", "region")
    .selectAll("path");

var quantize = d3.scale.quantize()
  .domain([0, 160000])
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
          mySlider.value(2005);
          map.datum(d3.values(yearlyTotals[topoIndex]));
          barChart.title("Totales por año")
          map.transition()
            .call(barChart);
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
  arguments = [].slice.call(arguments);//esta linea convierte al objeto arguments en un array normal
  topologies = arguments.slice(1,5);//aquí guardamos las topologías
  csvs = arguments.slice(5);//aquí guardamos los datos
  yearlyMaxs = [];
  yearlyMaxRates = [];
  yearlyTotals = [];
  byRegion = [];
  csvs.forEach(function(region){
    var r = computeMax(region)
    yearlyMaxs.push(r[0]);
    yearlyMaxRates.push(r[1]);
    yearlyTotals.push(r[2]);
    //nest values under muns key
    var byMun = {};
    var mun = d3.nest().key(function(d){return d["nom_mun"]}).entries(region);
    mun.forEach(function(d){
      var byYear = [];
      years.forEach(function(y){
        byYear.push(+d.values[0][y]);
      });
      byMun[d.key] = byYear;
    });
    byRegion.push(byMun);
  });

  //make map
  var topoIndex = mapRegions.indexOf(visibleRegion)
  makeMap(topologies[topoIndex],visibleRegion);
  //agregar grafica de barras dentro del svg del mapa:
  var datos = d3.values(yearlyTotals[topoIndex]);
  var barHeight = 20;
  barChart = barChart()
    .yDomain(years)
    .title("Totales por año");
  map.datum(datos)
    .call(barChart);
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
          if (year == 2005) {
            return d.properties["NOMBRE"]
          }else{
            return d.properties["NOMBRE"] + ': ' + d.properties[String(year)];
          }
        });

    region.transition()
        .duration(900)
        .attr("d", carto.path)
        .call(endAll, function () {
          carto_features = undefined;
        });

    // estilar barras conforme avance el anho
    d3.selectAll(".bar").each(function(d,i){
        d3.select(this).attr("class", "bar");
      if (this.id.split('_')[1] == year) {
        d3.select(this).attr("class", "bar selected");
      }
    })
}


//Draws original map
function makeMap(data,regionVisible){

  var topoIndex = mapRegions.indexOf(visibleRegion)

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
    var translate = [400,150];
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
    region.classed("hover", function(d,j){
      return j != i ? "" : "true";
    })
    var sel = d3.select(this);
    sel.moveToFront();
  });
  region.on('mouseout', function(d,i){
    region.classed("hover",false)
  });

  region.on('click',function(d,i){
    var sel = d3.select(this);
    sel.moveToFront();
    region.classed("selected", function(d,j){
      if (j != i) {
        return false;
      }else{
        if (sel.classed("selected")){
          barChart.title("Totales por año");
          console.log(d3.values(yearlyTotals[topoIndex]));
          map.datum(d3.values(yearlyTotals[topoIndex]));
          map.transition()
            .call(barChart);
          return false;
        }else{
          barChart.title(d.properties["NOMBRE"])
          map.datum(byRegion[topoIndex][d.properties["NOMBRE"]]);
          map.transition()
            .call(barChart);
          return true;
        }
      }
    });
  });

  region.append("title")
    .text(function (d) {
      return d.properties["NOMBRE"];
    });

  //leyenda
  map.append("text")
    .attr("x", 540)
    .attr("y", 30)
    .attr("class", "title")
    .text("Población (miles de habitantes)");

  var legend = map.selectAll("g.legend")
  .data(legendColors)
  .enter().append("g")
  .attr("class", "legend")
  .attr("transform", "translate(" + 580 + "," + -200 + ")");

  var ls_w = 20, ls_h = 20;
  var height = 380;
  var width = 700;
  legend.append("rect")
  .attr("x", 20)
  .attr("y", function(d, i){ return height - (i*ls_h) - 2*ls_h;})
  .attr("width", ls_w)
  .attr("height", ls_h)
  .style("fill", function(d, i) { return d; })
  .style("opacity", 0.8);

  legend.append("text")
  .attr("x", 50)
  .attr("y", function(d, i){ return height - (i*ls_h) - ls_h - 4;})
  .text(function(d, i){ return legend_labels[i]; });
}

function doAnimation(year){

  var regionIndex = mapRegions.indexOf(visibleRegion)
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
        if (year == 2005) {
          return d.properties["NOMBRE"]
        }else{
          return d.properties["NOMBRE"] + ': ' + d.properties[String(year)];
        }
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
            if(pause === false){
              mySlider.value(2005)
              doUpdate(2005)
            };
            animating = false;
            pause = true;
          },1000)

        }
    });
    // estilar barras conforme avance el anho
    d3.selectAll(".bar").each(function(d,i){
        d3.select(this).attr("class", "bar");
      if (this.id.split('_')[1] == year) {
        d3.select(this).attr("class", "bar selected");
      }
    })
}

function computeMax(data){
  //sumPerYear[y] = d3.sum(thisYear);
  maxPerYear = {};
  maxRatePerYear = {};
  sumPerYear = {};
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
    sumPerYear[y] = d3.sum(thisYear)
  });
  return [maxPerYear,maxRatePerYear,sumPerYear];
}
