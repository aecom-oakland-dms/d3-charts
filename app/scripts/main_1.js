var parseDate = d3.time.format("%d/%m/%Y").parse,
// var parseDate = d3.time.format("%Y-%m").parse,
    formatYear = d3.format("02d"),
    formatDate = function(d) { return d3.time.format("%d/%m/%Y")(d) };
    // formatDate = function(d) { return "Q" + ((d.getMonth() / 3 | 0) + 1) + formatYear(d.getFullYear() % 100); };

var scoretypes = ['score', 'lhr score', 'h&s score','environment score', 'mgmt commitment score'];

var margin = {top: 10, right: 20, bottom: 20, left: 300},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var y0 = d3.scale.ordinal()
    .rangeRoundBands([height, 0], .2);

var y1 = d3.scale.linear();

var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1, 0);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickFormat(formatDate);

var nest = d3.nest()
    // .key(function(d) { return d.items; });
    .key(function(d) { return d['audit type']; });

var stack = d3.layout.stack()
    .values(function(d) { return d.values; })
    .x(function(d) { return d.date; })
    // .y(function(d) { return y1(d.aggregated); })
    .y(function(d) { return d.aggregated; })
    .out(function(d, y0, y) { d.valueOffset = y0; });

var color = d3.scale.category10()
, colors = {}
;

var darkerColor = function(name){
    return d3.rgb( colors[name] ).darker(1)
}

var svg = d3.select("#graph-container").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

function propsToLowerCase(data){
  var temp = [];
  data.forEach(function(d){
  	  var t = {};
	  Object.keys(d).forEach(function(key){
	  	// ensure numbers are numbers and dates are dates
	  	var val = parseFloat(d[key]);
	  	if( isNaN(val) || ['Date', 'date'].indexOf(key)!==-1 )
	  		val = d[key]

	  	t[key.toLowerCase().trim()] = val;
	  })
	  temp.push(t)
  })
  return temp;
}

 function makegraph(dataByGroup, type){
  	svg.selectAll("*").remove();
  	
  	var group = svg.selectAll(".group")
      .data(dataByGroup)
    .enter().append("g")
      .attr("class", function(d){ /*console.log(d);*/ return "group"} )
      .attr("transform", "translate(0," + y0.rangeBand() + ")")
  group.append("text")
      .attr("class", "group-label")
      .attr("x", -6)
      .attr("y", function(d) { console.log(d); return y1(d.values[0].aggregated / 2) + d.values[0].valueOffset; })
      .attr("dy", ".35em")
      .text(function(d) { return d.key; })
      
   group.selectAll('g')
   	.data(function(d){ 
   		var vals = [];
   		Object.keys(d.values[0]).forEach(function(name){
   			var val = d.values[0];
   			if(name.indexOf('score')!==-1)
   				vals.push({
   					key: d.key
   					, values: [{
   						type: name
   						, date: val.date
   						, score: val[name]
   						, valueOffset: val.valueOffset
   						, items: val.items
   					}]
   				});
   		})
   		console.log(d, vals)
   		return vals
   	})
   	.enter()
   	.append('g')
		  .selectAll('rect')
		      .data(function(a) { return a.values; })
		  .enter().append("rect")
		  	  .attr('data-type', type)
		      .style("fill", function(d) { return colors[d.type]; }) //return color(d[type]*10); })
		      .attr("height", function(d) { var height = y0.rangeBand() - y1(d.score); return height })
		      .attr("x", function(d) { return x(d.date); })
		      .attr("y", function(d) { 
		      	var y = d.items[d.type].y0// - d.valueOffset; 
		      	return y
		      })
		      .attr("width", x.rangeBand())
		      .on('mouseover', function(d){
		      	return this.style.fill = darkerColor(d.type);
		      })
		      .on('mouseout', function(d){
		      	return this.style.fill = colors[d.type];
		      })
		      .on('click', function(d){
		      	console.log(d,d.type)
		      })
	  // })
	  ;
   	// })
   // })
// console.log(count);
	  

  group.filter(function(d, i) { return !i; }).append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + y0.rangeBand() + ")")
      .call(xAxis);

      return group
  }

d3.csv("data/scores.csv", function(error, data) {
  data = propsToLowerCase(data);

  Object.keys(data[0]).forEach(function(key, index){
  	colors[key] = color(index);
  })

  data.forEach(function(d) {
    d.date = parseDate(d.date);
    d.score = +d.score;
    d.group = d.score * 10;
    d.aggregated = scoretypes.reduce(function(a,b){ return d[a] ? d[a] : a + d[b] }) /10
  });

  var dataByGroup = nest.entries(data);
  console.log(dataByGroup);

  stack(dataByGroup);
  x.domain( dataByGroup.map( function(group){ return group.values.map( function(d){ return d.date; })[0] }) );
  y0.domain(dataByGroup.map(function(d) { return d.key; }));
  y1.domain([0, d3.max(data, function(d) { return d.aggregated; })]).range([y0.rangeBand(), 1]);

  data.forEach(function(d){
  	var calced = 0;
    d.items = {};
    scoretypes.forEach(function(name){ 
    	d.items[name] = { y0: calced , y1: calced +=  y0.rangeBand() - y1(d[name]) } 
    });
  })

  makegraph = (function(initial){
  	function extend(type){
  		return initial(dataByGroup, type)
  	}
  	return extend
  })(makegraph);

  makegraph('score')

  d3.selectAll("input").on("change", change);

  // var timeout = setTimeout(function() {
  //   d3.select("input[value=\"stacked\"]").property("checked", true).each(change);
  // }, 2000);

  function change() {
    // clearTimeout(timeout);
    if (this.value === "multiples") transitionMultiples();
    else transitionStacked();
  }

  


  function transitionMultiples() {
    var t = svg.transition().duration(750)
	, g = t.selectAll(".group")
	, rects = g.selectAll("rect")
    ;
    	rects.attr("y", function(d) { return y1(d.score / 2 + d.valueOffset)/* - d.items[d3.select(this).attr('data-type')].y1*/ });
    	// rects.attr("y", function(d) { console.log(d); return y1(d[d3.select(this).attr('data-type')] / 2 - d.valueOffset) - d.items[d3.select(this).attr('data-type')].y1 });
    	g.select(".group-label").attr("y", function(d) { return y1(d.values[0].aggregated / 2) + d.values[0].valueOffset })
    // })

  }

  function transitionStacked() {
    var t = svg.transition().duration(750)
	, g = t.selectAll(".group")
    , rects = g.selectAll("rect")
    ;

    	rects.attr("y", function(d) { return y1(d[d3.select(this).attr('data-type')] / 2 + d.valueOffset) /*- d.items[d3.select(this).attr('data-type')].y1*/ });
    	g.select(".group-label").attr("y", function(d) { return y1(d.values[0].aggregated / 2 - d.values[0].valueOffset) /*- d.values[0].items[type].y1;*/ })
    	// g.select(".group-label").attr("y", function(d) {console.log(d); return y1(d.values[0][type] / 2 - d.values[0].valueOffset) /*- d.values[0].items[type].y1;*/ })
    // })
  }
});