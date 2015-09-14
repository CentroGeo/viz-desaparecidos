function barChart(){
  var barHeight = 20,
      yDomain,
      title = "Agrega un título";


  function plot(selection){

    var x = d3.scale.linear()
        .range([0, 190]);

    var y = d3.scale.ordinal()
        .rangePoints([0,160]);

    var xAxis = d3.svg.axis()
        .orient("bottom")
        .ticks(5);

    var yAxis = d3.svg.axis()
        .orient("left");
    var barGroup;

    selection.each(function(data){

      if (yDomain != undefined) {
        y = y.domain(yDomain)
      }else {
        yDomain = data.length;
        y = y.domain(yDomain);
      }
      x = x.domain([0, d3.max(data)]);
      yAxis = yAxis.scale(y);
      xAxis = xAxis.scale(x)

      if (d3.select("#barChart").empty()){
        barGroup = selection.append("g")
            .attr("id", "barChart");
        barGroup.append("text")
            .attr("class", "title")
            .attr("x", 20)
            .attr("y", -10)
            .text(title);
      } else {
        barGroup = d3.select("#barChart");
      }

      d3.select("#barChart").selectAll(".title").text(title)
      barGroup.attr("width", 200)
          .attr("height", barHeight * data.length)
          .attr("transform", "translate(90, 175)");



      if (barGroup.select(".y.axis").empty()){
        barGroup.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(-10, 10)")
        .call(yAxis);
      }

      if (barGroup.select(".x.axis").empty()){
        barGroup.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0, 179)")
          .call(xAxis);
      }else {
        var a = d3.selectAll(".x.axis")
        a.call(xAxis.scale(x));
      }

      var bar = barGroup.selectAll(".bar")
          .data(data);

      bar.enter()//.append("g")
      .append("rect")
        .attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; })
        .attr("class", "bar")
        .attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; })
        .append("title");

      bar.attr("id", function(d,i){ return "bar_"+years[i];})
        .transition()
          .attr("width", x)
          .attr("height", barHeight - 2)
          .select("title")
          .text(function(d){return d;});
    })
  }
  plot.yDomain = function(value) {
    if (!arguments.length) return yDomain;
    yDomain = value;
    return plot;
  };

  plot.title = function(value) {
      if (!arguments.length) return title;
      title = value;
      return plot;
    };

  return plot;
}
