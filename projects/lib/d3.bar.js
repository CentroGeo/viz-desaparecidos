


function barChart(){
  var barHeight = 20;

  function plot(selection){
    selection.each(function(data){

      var x = d3.scale.linear()
          .domain([0, d3.max(data)])
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

      var barGroup = selection.append("g")
          .attr("id", "barChart")
          .append("text")
            .attr("class", "title")
            .attr("x", 125)
            .attr("y", 170)
            .text("Totales");

      var chart = d3.select("#barChart")
          .attr("width", 200)
          .attr("height", barHeight * data.length)
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

      bar = chart.selectAll(".bar")
          .data(data);

      bar.enter().append("g")


      bar.attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; })
        .append("rect")
        .attr("class", "bar")
        .attr("id", function(d,i){ return "bar_"+years[i];})
        .attr("width", x)
        .attr("height", barHeight - 2);

      // bar.attr("width", x)
      //   .attr("height", barHeight - 2);


      bar.append("text")
        .attr("x", function(d) { return x(d) + 5; })
        .attr("y", barHeight / 2)
        .attr("dy", ".35em")
        .text(function(d) { return d; });

    })
  }
  return plot;
}
