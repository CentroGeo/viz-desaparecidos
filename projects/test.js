queue()
//.defer(d3.json, 'data/des_estado_simple.json')
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
  return d;
})
.await(ready);

function ready(error,csv){
  //Compute max values for each year and store it in maxPerYear
  // filtered = csv.filter(function(d){
  //   delete d["POB1"];
  //   delete d["estado"];
  //   //delete d["id"];
  //   return d;
  //   //console.log(d);
  //   // if (d === "POB1" || d === "id" || d === "estado")  {
  //   //   //continue;
  //   // } else return d
  // })
  var colors = ["#058cfe", "#0cc402", "#ff1902", "#7d6b48", "#fd01af", "#8b35ff",
                "#08b9d1", "#e79805", "#d992c6", "#079a5c", "#cb2e4f", "#889d05",
                 "#944cc0", "#546e9a", "#f08f6b", "#fe08fb", "#055ffb", "#88b296",
                 "#bf4403", "#bb3a84", "#a15763", "#c5a555", "#fc71f9", "#bca2a5",
                 "#18b3fd", "#258c05", "#58762b", "#b498fc", "#34777a", "#9b6004",
                 "#fd829a", "#ff067d"];





  var pplot = parallelPlot()
  //pplot.containerWidth(200);
  pplot.colors(colors)
    .filterColumns(["POB1",'estado'])
  d3.select("#parallelPlot")
  .datum(csv)
  .call(pplot)
  var legend = pplot.svg().append("g")
    .attr("class","legend")
    .attr("transform","translate(" + pplot.containerWidth() + ",50)")
    .style("font-size","12px")
    .call(d3.legend);

}
