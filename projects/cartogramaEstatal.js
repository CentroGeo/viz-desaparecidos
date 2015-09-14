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
var legendColors = ["#fcc383","#fc9f67","#f4794e","#e65338","#ce2a1d","#b30000","#7f2704"];
var legend_labels = ["< 2.71", "2.71-4.79","4.79-6.87", "6.87-8.94", "8.94-11.02", "11.02-13.09","> 13.09"];
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
  .range(d3.range(6).map(function(i) { return "q" + i; }));

var topology,
    geometries,
    carto_features,
    maxPerYear,
    maxRatePerYear,
    byState,
    mySlider,
    cartoValue = 'cantidad',
    pause = false,
    animating = false,
    bar;

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
    .on("slide", function(evt, value) {
      doUpdate(value);
    });
    d3.select('#slider').call(mySlider);

    //Build a queue to load all data files
    queue()
    .defer(d3.json, 'data/des_estado.json')
    .defer(d3.csv, 'data/desaparecidos_estatal.csv', function(d) {
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

function ready(error,topo,csv){
  //Compute max values for each year and store it in maxPerYear
  maxPerYear = {}
  maxRatePerYear = {}
  sumPerYear = {}
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
    sumPerYear[y] = d3.sum(thisYear);
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
  var datos = d3.values(sumPerYear);
  var barHeight = 20;
  barChart = barChart()
    .yDomain(years)
    .title("Totales por año");
  map.datum(datos)
    .call(barChart);
  // bar.datum(datos);
  // map.call(bar)

}

//Computes updated features and draws the new cartogram
function doUpdate(year) {

    carto.value(function (d) {
      if (cartoValue === 'cantidad'){
        if (year === 2005) {
          //escalamos por área, es decir, hacemos el mapa original
          return +d.properties["area"];
        }else {
          var scale = d3.scale.linear()
            .domain([0, maxPerYear[year]])
            .range([1, 1000]);
          return +scale(d.properties[year]);
        }
      }else{
        if (year === 2005) {
          //escalamos por área, es decir, hacemos el mapa original
          return d.properties["area"];
        }else{
          var scale = d3.scale.linear()
            .domain([0, maxRatePerYear[year]])
            .range([1, 1000]);
          var rate = 100000*(parseFloat(d.properties[year])/parseFloat(d.properties["POB1"]));
          return +scale(rate);
        }
      }
    });

    if (carto_features == undefined)
        //this regenrates the topology features for the new map based on
        carto_features = carto(topology, geometries).features;

    //update the map data
    edos.data(carto_features)
        .select("title")
        .text(function (d) {
          if (year === 2005) {
            return d.properties.estado
          }else{
            return d.properties.estado+ ': '+d.properties[year];
          }
        });

    edos.transition()
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
    edos.classed("hover", function(d,j){
      return j != i ? "" : "true";
    })
    var sel = d3.select(this);
    sel.moveToFront();
  });
  edos.on('mouseout', function(d,i){
    edos.classed("hover",false)
  });
  edos.on('click',function(d,i){
    //console.log(byState[d.properties.estado]);
    console.log(d3.select(this));
    edos.classed("selected", function(d,j){
      if (j != i) {
        return false;
      }else{
        if (d3.select(this).classed("selected")){
          return false;
        }else{
          return true;
        }
      }
      //return j != i ? "" : "true";
    })
    var sel = d3.select(this);
    sel.moveToFront();
    barChart.title(d.properties.estado)
    map.datum(byState[d.properties.estado]);
    map.transition()
      .call(barChart);
  })

  edos.append("title")
    .text(function (d) {
      return d.properties.estado;
    });

    //leyenda
    var legend = map.selectAll("g.legend")
    .data(legendColors)
    .enter().append("g")
    .attr("class", "legend")
    .attr("transform", "translate(" + 530 + "," + -175 + ")");

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
      .attr("x",20)
      .attr("y",height - (ls_h + 4.5)*legendColors.length)
      .text("Población (millones de habitantes)")

    legend.append("text")
    .attr("x", 50)
    .attr("y", function(d, i){ return height - (i*ls_h) - ls_h - 4;})
    .text(function(d, i){ return legend_labels[i]; });
}

function doAnimation(year){

  carto.value(function (d) {
    if (cartoValue === 'cantidad'){
      if (year === 2005) {
        //escalamos por área, es decir, hacemos el mapa original
        return d.properties["area"];
      }else {
        var scale = d3.scale.linear()
          .domain([0, maxPerYear[year]])
          .range([1, 1000]);
        return +scale(d.properties[year]);
      }
    }else{
      if (year === 2005) {
        //escalamos por área, es decir, hacemos el mapa original
        return d.properties["area"];
      }else{
        var scale = d3.scale.linear()
          .domain([0, maxRatePerYear[year]])
          .range([1, 1000]);
        var rate = 100000*(parseFloat(d.properties[year])/parseFloat(d.properties["POB1"]));
        return +scale(rate);
      }
    }
  });

  if (carto_features == undefined)
      //this regenrates the topology features for the new map based on
      carto_features = carto(topology, geometries).features;

  //update the map data
  edos.data(carto_features)
      .select("title")
      .text(function (d) {
        if (year === 2005) {
          return d.properties.estado
        }else{
          return d.properties.estado+ ': '+d.properties[year];
        }
      });

  edos.transition()
      .duration(900)
      .attr("d", carto.path)
      .call(endAll, function () {
        carto_features = undefined;
        var currentIndex = years.indexOf(String(year))
        mySlider.value(year)
        if(currentIndex < years.length-1 & pause == false){
          doAnimation(parseInt(years[currentIndex + 1]))
        }else{
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
