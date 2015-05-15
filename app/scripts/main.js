var parseDate = d3.time.format("%d/%m/%Y").parse,
// var parseDate = d3.time.format("%Y-%m").parse,
    formatYear = d3.format("02d"),
    formatDate = function(d) { return d3.time.format("%d/%m/%Y")(d) };
    // formatDate = function(d) { return "Q" + ((d.getMonth() / 3 | 0) + 1) + formatYear(d.getFullYear() % 100); };

var scoretypes = ['score', 'lhr score', 'h&s score','environment score', 'mgmt commitment score']
, audittypes = ['CAV (validated offsite)', 'CAV (supplier provided)', 'CAP (work begun)', 'Onsite Core Audit', 'Offsite (ANPP) assessment']
;


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

var margin = {top: 30, right: 120, bottom: 0, left: 120},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var x = d3.scale.linear()
    .range([0, width]);

var barHeight = 20;

var color = d3.scale.ordinal()
    .range(["steelblue", "#ccc"]);

var darkerColor = function(color){
    return d3.rgb( color ).darker(1)
}

var duration = 750,
    delay = 25;

var partition = d3.layout.partition()
    .value(function(d) { return d.score; });
    // .value(function(d) { return d.size; });

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("top");

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", up);

svg.append("g")
    .attr("class", "x axis");

svg.append("g")
    .attr("class", "y axis")
  .append("line")
    .attr("y1", "100%");


d3.csv("data/scores.csv", function(error, root) {
  root = propsToLowerCase(root);
  console.log(root[0])
  var newroot = {name: 'Audits', children: []}
  // root.forEach(function(item){
  //   var base = {
  //     name: item.date
  //     , size: item.score
  //     , children: []
  //   }
  //   newroot.children.push()
  // })
  audittypes.forEach(function(atype){
      var audit = root.filter(function(a){return a['audit type']===atype})[0];
      var child = {
        name: audit.date
        // name: atype
        , size: audit.score * 100
        , children: []
      }
      scoretypes.forEach(function(stype){
        // console.log(atype, stype)
        var subchild = {
          name: stype
          , size: audit[stype] * 100
        }
        child.children.push(subchild);
      })

      newroot.children.push(child)
  })
  partition.nodes(newroot);
  console.log(newroot, root);
  x.domain([0, newroot.value]).nice();
  down(newroot, 0);
});

function down(d, i) {
  if (!d.children || this.__transition__) return;
  var end = duration + d.children.length * delay;

  // Mark any currently-displayed bars as exiting.
  var exit = svg.selectAll(".enter")
      .attr("class", "exit");

  // Entering nodes immediately obscure the clicked-on bar, so hide it.
  exit.selectAll("rect").filter(function(p) { return p === d; })
      .style("fill-opacity", 1e-6);

  // Enter the new bars for the clicked-on data.
  // Per above, entering bars are immediately visible.
  var enter = bar(d)
      .attr("transform", stack(i))
      .style("opacity", 1);

  // Have the text fade-in, even though the bars are visible.
  // Color the bars as parents; they will fade to children if appropriate.
  enter.select("text").style("fill-opacity", 1e-6);
  enter.select("rect").style("fill", color(true))
    .attr("data-color", color(true))
  ;

  // Update the x-scale domain.
  x.domain([0, d3.max(d.children, function(d) { return d.value; })]).nice();

  // Update the x-axis.
  svg.selectAll(".x.axis").transition()
      .duration(duration)
      .call(xAxis);

  // Transition entering bars to their new position.
  var enterTransition = enter.transition()
      .duration(duration)
      .delay(function(d, i) { return i * delay; })
      .attr("transform", function(d, i) { return "translate(0," + barHeight * i * 1.2 + ")"; });

  // Transition entering text.
  enterTransition.select("text")
      .style("fill-opacity", 1);

  // Transition entering rects to the new x-scale.
  enterTransition.select("rect")
      .attr("width", function(d) { return x(d.value); })
      .style("fill", function(d) { return color(!!d.children); });

  // Transition exiting bars to fade out.
  var exitTransition = exit.transition()
      .duration(duration)
      .style("opacity", 1e-6)
      .remove();

  // Transition exiting bars to the new x-scale.
  exitTransition.selectAll("rect")
      .attr("width", function(d) { return x(d.value); });

  // Rebind the current node to the background.
  svg.select(".background")
      .datum(d)
    .transition()
      .duration(end);

  d.index = i;
}

function up(d) {
  if (!d.parent || this.__transition__) return;
  var end = duration + d.children.length * delay;

  // Mark any currently-displayed bars as exiting.
  var exit = svg.selectAll(".enter")
      .attr("class", "exit");

  // Enter the new bars for the clicked-on data's parent.
  var enter = bar(d.parent)
      .attr("transform", function(d, i) { return "translate(0," + barHeight * i * 1.2 + ")"; })
      .style("opacity", 1e-6);

  // Color the bars as appropriate.
  // Exiting nodes will obscure the parent bar, so hide it.
  enter.select("rect")
      .style("fill", function(d) { return color(!!d.children); })
    .filter(function(p) { return p === d; })
      .style("fill-opacity", 1e-6);

  // Update the x-scale domain.
  x.domain([0, d3.max(d.parent.children, function(d) { return d.value; })]).nice();

  // Update the x-axis.
  svg.selectAll(".x.axis").transition()
      .duration(duration)
      .call(xAxis);

  // Transition entering bars to fade in over the full duration.
  var enterTransition = enter.transition()
      .duration(end)
      .style("opacity", 1);

  // Transition entering rects to the new x-scale.
  // When the entering parent rect is done, make it visible!
  enterTransition.select("rect")
      .attr("width", function(d) { return x(d.value); })
      .each("end", function(p) { if (p === d) d3.select(this).style("fill-opacity", null); });

  // Transition exiting bars to the parent's position.
  var exitTransition = exit.selectAll("g").transition()
      .duration(duration)
      .delay(function(d, i) { return i * delay; })
      .attr("transform", stack(d.index));

  // Transition exiting text to fade out.
  exitTransition.select("text")
      .style("fill-opacity", 1e-6);

  // Transition exiting rects to the new scale and fade to parent color.
  exitTransition.select("rect")
      .attr("width", function(d) { return x(d.value); })
      .style("fill", color(true));

  // Remove exiting nodes when the last child has finished transitioning.
  exit.transition()
      .duration(end)
      .remove();

  // Rebind the current parent to the background.
  svg.select(".background")
      .datum(d.parent)
    .transition()
      .duration(end);
}

// Creates a set of bars for the given data node, at the specified index.
function bar(d) {
  var bar = svg.insert("g", ".y.axis")
      .attr("class", "enter")
      .attr("transform", "translate(0,5)")
    .selectAll("g")
      .data(d.children)
    .enter().append("g")
      .style("cursor", function(d) { return !d.children ? null : "pointer"; })
      .on("click", down);

  bar.append("text")
      .attr("x", -6)
      .attr("y", barHeight / 2)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d.name; });

  bar.append("rect")
      .attr("width", function(d) {d.value = d.size; return x(d.value); })
      .attr("height", barHeight)
      .on('mouseover', function(d){
        d.tip = bar.append('text')
          .attr('x', function(d){ return x(d.value) + 10 })
          .attr('y', barHeight / 2 )
          .attr("dy", ".35em")
          .style("text-anchor", "start")
          .text(function(d){ return d.value + '%' })
        

        if(!d.children) return this.style.cursor = 'default'
          this.style.cursor = 'pointer'
        return this.style.fill = darkerColor(color(!!d.children ));
      })
      .on('mouseout', function(d){
        d.tip && d.tip.remove() && delete d.tip
        return this.style.fill = color(!!d.children );
      })
      ;

  return bar;
}

// A stateful closure for stacking bars horizontally.
function stack(i) {
  var x0 = 0;
  return function(d) {
    var tx = "translate(" + x0 + "," + barHeight * i * 1.2 + ")";
    x0 += x(d.value);
    return tx;
  };
}