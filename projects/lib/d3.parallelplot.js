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
        margin = {top: 30, right: 0, bottom: 10, left: 10},
        colors = null;

    function plot(selection){
        console.log(selection);
        console.log(this);
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
            var svg = selection.append("svg")
                .attr("width", width + margin.left + margin.right + 110)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            var dimensions = d3.keys(data[0]).filter(function(p) {
                //Aquí el extent de los ejes se ajusta al máximo de cada variable
                //TODO: opción para usar un único extent para todas las dimensiones
                return (y[p] = d3.scale.linear()
                  .domain(d3.extent(data, function(d) {return +d[p];}))
                  .range([height, 0]));
              });
            x.domain(dimensions);
            //console.log(y);

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
                //.attr("id", function(data){ return data.id;})
                //.attr("data-legend",function(data) { return data.estado })
                .style("stroke", function(data) {
                    if (colors !== null){
                        return colors[data.id];
                    }else{
                        //console.log('hey');
                        return 'blue';
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
                  //console.log(y[p]);
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

        });




    }

    plot.containerWidth = function(value) {
        if (!arguments.length) return width;
        width = value;
        return plot;
    };
    plot.containerHeight = function(value) {
        if (!arguments.length) return height;
        height = value;
        return plot;
    };

    return plot;
}
