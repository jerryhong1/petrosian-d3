function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
      if ((new Date().getTime() - start) > milliseconds){
        break;
      }
    }
  }

document.addEventListener("mousemove", function() {
    renderMathInElement(document.body, {
        delimiters: [
            {left: "$", right: "$", display: false},
            {left: "$$", right: "$$", display: true},
            {left: "\\[", right: "\\]", display: true}
            ]
        });
    });

var log = Math.log10;
var pow = Math.pow;
var slide = 0;
var k = 0;
var tauIterator;
d3.csv("assets/sampledata.csv").then(function (data) {
    data.forEach(function(d){
        d.Redshift = +d.Redshift;
        d.L = +d.L;
        d.Lmin = +d.Lmin;
    });

    Main(data);
});

function g(z, k) {
    Z_cr = 3.7;
    return pow(1 + z, k) / (1 + (pow((1 + z)/ Z_cr), k));
}

function Main(qd) {
//setup div's, scales, etc.
var svgW = 600;
var svgH = 400;
var svgPadding = 40;
var scatterSvg = d3.select('body').append('svg')
                    .attr('class', 'graph');

var explainDiv = d3.select('body').append('div')
                    .attr('class', 'explain');

var buttonDiv = d3.select('body').append('div')
                .attr('class', 'button');

var backButton = buttonDiv.append('button').text('Previous').attr('onclick', 'reverse()');
var nextButton = buttonDiv.append('button').text('Next').attr('onclick', 'advance()');

xScale = d3.scaleLinear()
    .domain([0, d3.max(qd, function(d) { return d.Redshift; })])
    .range([svgPadding, svgW - svgPadding]);
yScale = d3.scaleLinear()
    .domain([d3.max(qd, function(d) { return Math.log10(d.L); }), 
        d3.min(qd, function(d) { return Math.log10(d.L); })])
    .range([svgPadding, svgH - svgPadding]);

//scatterplot
var points = scatterSvg.selectAll('circle')
    .data(qd)
    .enter()
    .append('circle')
    .attr('cx', function (d) {
        return xScale(d.Redshift);
    })
    .attr('cy', function (d) {
        return yScale(Math.log10(d.L));
    })
    .attr('r', 0)
    .style('fill', 'black');

var tooltip = d3.select("body")
        .append("div")
        .attr("class", "overlay")
        .style('width', '120px');

//add line
var xy = [];
for(var i = 0; i < qd.length; i++ ) {
    xy.push({x: qd[i].Redshift, y: qd[i].Lmin});
}
var slice = d3.line()
    .x(function(d) { return xScale(d.x);})
    .y(function(d) { return yScale(log(d.y));});
var truncationLine = scatterSvg.append("path")
    .attr("class", "line")
    .attr("d", slice(xy))
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 2);

var truncationLineLength = truncationLine.node().getTotalLength();
truncationLine.attr("stroke-dasharray", truncationLineLength + " " + truncationLineLength)
    .attr("stroke-dashoffset", truncationLineLength);

//add axis
var xAxis = d3.axisBottom()
    .scale(xScale);

var yAxis = d3.axisLeft()
    .scale(yScale);

gX = scatterSvg.append("g")
    .attr("class", "axis")
    .call(xAxis)
    .attr("transform", "translate(0," + (svgH - svgPadding) + ")");

gY = scatterSvg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + svgPadding + ",0)")
    .call(yAxis);

gXLabel =  gX.append("text")
    .attr("x", (svgW) / 2)
    .attr("dy", '3em')
    .style("text-anchor", "middle")
    .attr("fill", "black")  
    .text("Redshift");

gYLabel = gY.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", - svgPadding)
    .attr("dy", '1.5em')
    .style("text-anchor", "end")
    .attr("fill", "black")  
    .text("L (erg/s)");

slideForward = [
    function () { // 0: Introduce project
        explainDiv.append('text')
            .attr("fill", "black")
            .attr('x', 100)
            .attr('y', 100)
            .html("Here is a set of quasars' luminosities and redshifts, plotted against each other!" +
            " But, oh boy, look at that <i>truncation</i>!!");
    },
    function () {  // 1: introduce L vs z scatterplot
        points.transition()
            .duration(800)
            .attr('r', 3);

        points.on("mouseover", function(d){
            tooltip.html("<strong> Redshift: </strong> " + d.Redshift + "<br/>"  + 
                "<strong> Luminosity: </strong>" + d.L + " erg/s")
                .transition()		
                    .duration(200)		
                    .style("opacity", "1");
            d3.select(this)
                .transition()		
                    .duration(200)		
                    .attr('r', "6");
            })
            .on("mousemove", function(d){
                tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
                }) 
            .on("mouseout", function(d){
                tooltip.transition()		
                        .duration(200)		
                        .style("opacity", "0");
                tooltip.transition().duration(0).delay(200).style("top", "0px").style("left", "0px");
                d3.select(this)
                .transition()		
                    .duration(200)		
                    .attr('r', "3");
                });
        explainDiv.html("Huh? Points?");
    },
    function () { // 2: truncation line
        truncationLine.transition()
            .duration(1000)
            .attr("stroke-dashoffset", 0);

        explainDiv.html("Huh? A truncation line??");
    },
    
    function () { // 3: correlation
        explainDiv.html("Some remark about the correlation.");
    },

    function () { // 4: make local 
        k = 3;
        localizeData(3);
        explainDiv.html("Transform to local <span> $g(z,k)$ </span>");
    }, 
    
    function () { // 5: associated set
        tauIndex = 50;
        visualizeAssociatedSet(tauIndex, 'add');
        explainDiv.html("Now let's try to calculate tau. <span> \\[ \\tau = \\frac{\\sum_i R_i - E_i}{\\sqrt{\\sum_i V_i^2}} \\] </span>" +
            "Where does the rest of the text go?");
    },

    function () { // 6: full tau
        explainDiv.html("Iterate through all the points.");
        visualizeTau();
    }
];

slideForward[0]();

slideBackward = [
    function () { // 0: Introduce project
        explainDiv.html("Here is a set of quasars' luminosities and redshifts, plotted against each other!" +
            " But, oh boy, look at that <i>truncation</i>!!");
        
        scatterSvg.selectAll('circle')
            .transition()
            .duration(800)
            .attr('r', 0);
    },
    function () {  // 1: introduce L vs z scatterplot
        explainDiv.html("Huh? Points?");
        truncationLine.transition()
            .duration(1000)
            .attr("stroke-dashoffset", truncationLineLength);
    },
    function () { // 2: truncation line
        explainDiv.html("Huh? A truncation line??");
    },
    
    function () { // 3: correlation
        localizeData(0);
        explainDiv.html("Some remark about the correlation.");
    },

    function () { // 4: make local 
        visualizeAssociatedSet(tauIndex, 'remove');
        explainDiv.html("Transform to local $g(z,k)$");
    },

    function () { // 5: associated set
        tauIterator.stop();
        visualizeAssociatedSet(tauIndex, 'remove');
        tauIndex = 50;
        visualizeAssociatedSet(tauIndex, 'add');
    }
];

function localizeData(k) {
    points.transition()
            .duration(800).attr('cy', function (d) {
            return yScale(log(d.L / g(d.Redshift, k)));
        });
    //add line
    var xyNew = [];
    for(var i = 0; i < qd.length; i++ ) {
        xyNew.push({x: qd[i].Redshift, y: qd[i].Lmin / g(qd[i].Redshift, k)});
    }
    var slice = d3.line()
        .x(function(d) { return xScale(d.x);})
        .y(function(d) { return yScale(log(d.y));});    
    truncationLine.transition()
        .duration(800)
        .attr("d", slice(xyNew));

    if(k == 0) {
        gYLabel.text("L (erg/s)");
    } else {
        gYLabel.text("L' = L/g(z) (erg/s)");
    }

    if(k == 0) {
        tooltip.style('width', '120px');
        points.on("mouseover", function(d){
            tooltip.html("<strong> Redshift: </strong> " + d.Redshift + "<br/>"  + 
                "<strong> Luminosity: </strong>" + d.L / g(d.Redshift, k) + " erg/s")
                .transition()
                    .duration(200)		
                    .style("opacity", "1");
            d3.select(this)
                .transition()		
                    .duration(200)		
                    .attr('r', "6");
            });    
    } else {
        tooltip.style('width', '160px');
        points.on("mouseover", function(d){
            tooltip.html("<strong> Redshift: </strong> " + d.Redshift + "<br/>"  + 
                "<strong> Local Luminosity: </strong>" + (d.L / g(d.Redshift, k)).toPrecision(3) + " erg/s")
                .transition()		
                    .duration(200)		
                    .style("opacity", "1");
            d3.select(this)
                .transition()		
                    .duration(200)		
                    .attr('r', "6");
        });    
    }
    
}

function visualizeAssociatedSet(index, str) {  //visualize and calculate tau value for one element
    point = points.filter(function(d, i) { return i == index;});
    let z = point.datum().Redshift;
    let L = point.datum().L / g(z, k);
    let Lmin = point.datum().Lmin / g(z, k);
    var associatedSet = points.filter(function(d, i) { 
        return (d.Redshift < z) & (d.L / g(d.Redshift, k) > Lmin);
    });
    if (str == 'add') { 
        point.attr('r', '6').style('fill', 'red')
            .on("mouseout", function(d){
            tooltip.transition()		
                    .duration(200)		
                    .style("opacity", "0");
            tooltip.transition().duration(0).delay(200).style("top", "0px").style("left", "0px");
             // prevent from radius shrinking again after mouseover
            }); 

        associatedSet.transition().duration(200).style('fill', '#F08080');
        // both lines: x is actual redshift, y is pixel value (so if axis shifts associated sets are still okay)
        xy = [{x: z, y: yScale.range()[0]}, 
            {x: z, y: yScale(log(Lmin))}, 
            {x: 0, y: yScale(log(Lmin))}];
    
        var slice = d3.line()
        .x(function(d) { return xScale(d.x);})
        .y(function(d) { return d.y;});
    
        var tauLine = scatterSvg.append("path")
            .attr("class", "line")
            .attr("d", slice(xy))
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 1)
            .attr('id', 'tauLine');

        let tauLineLength = truncationLine.node().getTotalLength();
        tauLine.attr("stroke-dasharray", tauLineLength + " " + tauLineLength)
        .attr("stroke-dashoffset", tauLineLength);
       
        //transition line in
        tauLine.transition().duration(500).attr("stroke-dashoffset", 0);
        
    } else { 
        point.transition().duration(200).attr('r', '3').style('fill', 'black');
        point.on("mouseout", function(d){
                tooltip.transition()	
                        .duration(200)		
                        .style("opacity", "0");
                tooltip.transition().duration(0).delay(200).style("top", "0px").style("left", "0px");
                d3.select(this)
                    .transition()		
                        .duration(200)		
                        .attr('r', "3");
            }); 
        
        associatedSet.transition().duration(200).style('fill', 'black');
        d3.select('#tauLine').remove();
    }
}

function visualizeTau() { //iterate through all data points
    firstTime = true;
    tauIterator = d3.interval(function(){
        if(!firstTime) {
            if (tauIndex != 0) {
                let prevIndex = tauIndex - 1;   
            } else {
                let prevIndex = qd.length - 1;
            }
            var point = points.filter(function(d, i) { return i == tauIndex - 1;});
            let z = point.datum().Redshift;
            let L = point.datum().L / g(z, k);
            let Lmin = point.datum().Lmin / g(z, k);
            var associatedSet = points.filter(function(d, i) { 
                return (d.Redshift < z) & (d.L / g(d.Redshift, k) > Lmin);
            });
            point.attr('r', '3').style('fill', 'black');
            associatedSet.style('fill', 'black');
            d3.select('#tauLine').remove();
        } else {
            firstTime = false;
        }

        var point = points.filter(function(d, i) { return i == tauIndex;});
        let z = point.datum().Redshift;
        let L = point.datum().L / g(z, k);
        let Lmin = point.datum().Lmin / g(z, k);
        var associatedSet = points.filter(function(d, i) { 
            return (d.Redshift < z) & (d.L / g(d.Redshift, k) > Lmin);
        });

        associatedSet.style('fill', '#F08080');
        // both lines: x is actual redshift, y is pixel value (so if axis shifts associated sets are still okay)
        xy = [{x: z, y: yScale.range()[0]}, 
            {x: z, y: yScale(log(Lmin))}, 
            {x: 0, y: yScale(log(Lmin))}];
    
        var slice = d3.line()
        .x(function(d) { return xScale(d.x);})
        .y(function(d) { return d.y;});
    
        var tauLine = scatterSvg.append("path")
            .attr("class", "line")
            .attr("d", slice(xy))
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 1)
            .attr('id', 'tauLine');

        
        tauIndex++;
        if (tauIndex == qd.length) {tauIndex = 0;}
    }, 100);
    /*
    for (var index = 0; index < qd.length; i++) {
        point = points.filter(function(d, i) { return i == index;});
        let z = point.datum().Redshift;
        let L = point.datum().L / g(z, k);
        let Lmin = point.datum().Lmin / g(z, k);
        var associatedSet = points.filter(function(d, i) { 
            return (d.Redshift < z) & (d.L / g(d.Redshift, k) > Lmin);
        });

        associatedSet.style('fill', '#F08080');
        // both lines: x is actual redshift, y is pixel value (so if axis shifts associated sets are still okay)
        xy = [{x: z, y: yScale.range()[0]}, 
            {x: z, y: yScale(log(Lmin))}, 
            {x: 0, y: yScale(log(Lmin))}];
    
        var slice = d3.line()
        .x(function(d) { return xScale(d.x);})
        .y(function(d) { return d.y;});
    
        var tauLine = scatterSvg.append("path")
            .attr("class", "line")
            .attr("d", slice(xy))
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 1)
            .attr('id', 'tauLine');

        //sleep(1000);
        point.attr('r', '3').style('fill', 'black');
        associatedSet.style('fill', 'black');
        d3.select('#tauLine').remove();
    */
}

} // end Main

function advance() {
    if (slide < slideForward.length - 1) {
        slide++;
        slideForward[slide]();
        renderMathInElement(document.body);
    }
}

function reverse() {
    if (slide > 0) {
        slide--;
        slideBackward[slide]();
        renderMathInElement(document.body);
    }

}

/*
function loadData() {
    var d;
    $.ajax({
        type: "GET",
        url: "assets/sampledata.csv",
        dataType: "text",
        async: false,
        success: function(data) {d = processData(data);}
    });    
    return d;
}

function processData(csv) {
    //console.log(csv);
    var data = [];
    var allTextLines = csv.split(/\r\n|\n/);
    var keys = allTextLines[0].split(',');
    
    for (var i=1; i< allTextLines.length; i++) {
        var d = allTextLines[i].split(',');
        var obj = {
            [keys[0]]: +d[0],
            [keys[1]]: +d[1],
            [keys[2]]: +d[2],
        };
            data.push(obj);
    }
    return data;
}
*/