/*
Implementación reusable de parallelPlot
uso:
d3.select("#container")
.datum(dataObject)
.call(parallelPlot)

*/

function parallelPlot(){
    //Configuración:
    var containerWidth = 960,
        containerHeight = 500,
        svg, //el svg donde se renderea la gráfica (se puede consultar pero no modificar)
        margin = {top: 30, right: 0, bottom: 10, left: 10},
        colors = 'steelblue', //opciones válidas: 'random', array de colores o 'string';
        filterColumns = undefined, //Qué columnas no hay que desplegar (array)
        idColumn = 'id', //Columna para usarse como identificador
        actionHoverIn = function(d,i) {
          svg.selectAll(".linea")
          .transition()
          .duration(100)
          .sort(function (a, b) { // select the parent and sort the path's
            if (a.id != d.id) return -1;               // a is not the hovered element, send "a" to the back
            else return 1;                             // a is the hovered element, bring "a" to the front
          })
          /*.style("stroke", function(d, j) {
            return j != i ? colors[d.id] : 'red';
          })*/
          .style("stroke-width", function(d, j) {
            return j != i ? '1' : '2.5';
          })
          .style("opacity", function(d, j) {
            return j != i ? .3 : 1;
          });

        },
        actionHoverOut = function(d,i) {
          svg.selectAll(".linea")
           .transition()
           .duration(100)
           .style("stroke", function(d) {return colors[d.id];})
           .style({"stroke-width": "1.5"})
           .style({"opacity": 1});
        }

    function plot(selection){

        var width = containerWidth - margin.left - margin.right,
            height = containerHeight - margin.top - margin.bottom;

        var x = d3.scale.ordinal().rangePoints([0, width], 1),
            y = {};

        var line = d3.svg.line(),
            axis = d3.svg.axis().orient("left"),
            background,
            foreground;
        //this es la selección que llama a parallelPlot
        selection.each(function(data,i){
            //this es la selección que llama a parallelPlot,data son los datos

            svg = selection.append("svg")
                .attr("width", width + margin.left + margin.right + 110)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            if (filterColumns !== undefined){
              var dimensions = []
              d3.keys(data[0]).forEach(function(col){
                if (filterColumns.indexOf(col) === -1 && col !== 'id'){
                  dimensions.push(col)
                }
              })
              // filterColumns.forEach(function(col){
              //   if(d3.keys(data[0]).indexOf(col) !== -1){
              //     dimensions.push(col)
              //   }
              // })
            }else{
              dimensions = d3.keys(data[0])
            };
            dimensions.forEach(function(el){
              //TODO: opción para usar un único extent para todas las dimensiones
              y[el] = d3.scale.linear()
                .domain(d3.extent(data, function(d) {return +d[el];}))
                .range([height, 0]);
            })
            x.domain(dimensions);
            // Add grey background lines for context.
            background = svg.append("g")
                .attr("class", "background")
              .selectAll("path")
                .data(data)
              .enter().append("path")
                .attr("d", path);

            // Add colored foreground lines for focus.
            foreground = svg.append("g")
                .attr("class", "foreground")
              .selectAll("path")
                .data(data)
              .enter().append("path")
                .attr("class", "linea")
                .attr("id", function(d){ return d.id;}) //TODO:checar que haya id
                .attr("data-legend",function(d) { return d.estado }) //TODO: configurar variable de leyenda
                .style("stroke", function(data) {
                  if (colors instanceof Array){
                    //TODO: checar que el array sea del tamaño de los datos.
                    //TODO: checar cuál es el identificador
                    return colors[data.id];
                  }else{
                    if (colors == 'random'){
                      //TODO: llamar a un random color generator
                    }else{
                      return colors
                    }
                  }
                })
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

            // Returns the path for a given data point.
            function path(data) {
              return line(dimensions.map(function(p) {
                  return [x(p), y[p](data[p])];
                  }));
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

            //  acciones de hover en el parallel plot
            svg.selectAll(".foreground path")
              .on("mouseover", function(d, i) {
                actionHoverIn(d, i);
              })
              .on("mouseout", function(d, i) {
                actionHoverOut(d, i)
            });

        });




    }

    plot.containerWidth = function(value) {
        if (!arguments.length) return containerWidth;
        containerWidth = value;
        return plot;
    };

    plot.containerHeight = function(value) {
        if (!arguments.length) return containerHeight;
        containerHeight = value;
        return plot;
    };

    plot.svg = function() {
        return svg;
    };

    plot.colors = function(value) {
      if (!arguments.length) return colors;
      colors = value;
      return plot;
    }

    plot.filterColumns = function(value) {
      if (!arguments.length) return filterColumns;
      filterColumns = value;
      return plot;
    }

    plot.idColumn = function(value) {
      if (!arguments.length) return idColumn;
      idColumn = value;
      return plot;
    }

    plot.actionHoverIn = function(value) {
      if (!arguments.length) return actionHoverIn;
      actionHoverIn = value;
      return plot;
    }

    plot.actionHoverOut = function(value) {
      if (!arguments.length) return actionHoverOut;
      actionHoverOut = value;
      return plot;
    }
    return plot
}
