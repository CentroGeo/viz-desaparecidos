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

      if (d3.select("#barChart").empty()){
        var barGroup = selection.append("g")
            .attr("id", "barChart")
            .append("text")
              .attr("class", "title")
              .attr("x", 35)
              .attr("y", -10)
              .text("Totales");
      } else {
        var barGroup = d3.select("#barChart");
      }

      barGroup = d3.select("#barChart")
          .attr("width", 200)
          .attr("height", barHeight * data.length)
          .attr("transform", "translate(90, 175)");



      if (barGroup.select(".y.axis").empty()){
        barGroup.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(0, 10)")
        .call(yAxis);
      }

      if (barGroup.select(".x.axis").empty()){
        barGroup.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0, 179)")
          .call(xAxis);
      }/* else {
        var a = d3.selectAll(".x.axis")
        .each(function(d) {
          console.log(d);
            d3.select(this).call(xAxis.scale(x[d]));
        });
      }*/

      var bar = barGroup.selectAll(".bar")
          .data(data);

      bar.enter()//.append("g")
      .append("rect")
        .attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; })
      //.append("rect")
        .attr("class", "bar");

      bar = barGroup.selectAll(".bar")
      .attr("id", function(d,i){ return "bar_"+years[i];})
      .attr("width", x)
      .attr("height", barHeight - 2);

      d3.selectAll(".bar")
        .each(function(d,i) {
          console.log(d);
          //d3.select(this).call(axis.scale(y[d]));
          d3.select("#barChart")
          .append("text")
            .attr("y", barHeight / 2)
            .attr("dy", ".35em")
              .attr("x", function(d,i) { return x(d[i]) + 5; })
              .attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; })
              .text(function(d, i) { return d[i]; });
        });
    })
  }
  return plot;
}
