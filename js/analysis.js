function showTooltip(data, delay = 200) {
  let tooltip = d3.select(".tooltip");

  tooltip
    .html(data)
    .style("left", window.event.pageX + 10 + "px")
    .style("top", window.event.pageY - 20 + "px");

  tooltip
    .transition()
    .duration(delay)
    .style("opacity", 0.9);
}

function hideTooltip() {
  d3.select(".tooltip")
    .transition()
    .duration(100)
    .style("opacity", 0);
}

function makePlots(provData) {


  function millisToMinutesAndSeconds(millis) {
    var minutes = Math.floor(millis / 60000);
    var seconds = ((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
  }


  let maxTime = provData.reduce((acc,currValue)=> currValue.totalStudyTime > acc? currValue.totalStudyTime : acc,0)+200000;
  var margin = { top: 50, right: 15, bottom: 25, left: 150 };

  let color = d3.scaleLinear()
  .domain([0,.5,1])
  .range(['brown', 'blue'])

  var height = 180;
  var width = (window.screen.availWidth - margin.left - margin.right)/2 ;

  width = width - margin.left - margin.right;
  height = height - margin.top - margin.bottom;

  let startTime = function(d) {
    return d3.extent(
      d.provEvents
        .filter(e => e.type === "longAction")
        .map(e => Date.parse(e.startTime))
    )[0];
  };

  var participantGroups = d3
    .select("body")
    .selectAll("svg")
    .data(provData);
    // .data([1]);

    let svgWidth = width + margin.left + margin.right;
    let svgHeight = (height + margin.top + margin.bottom) //* provData.length;

  let participantGroupsEnter = participantGroups
    .enter()
    .append('svg')
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .append("g")
    .attr("class", "participantGroup");


    // .append('div')
    // .attr('class','svg-container')
    // .append("svg")
    // .attr('viewbox','0,0,' + 500 + ',' + 100 )
    // .attr('preserveAspectRatio','none')
    // .attr('width','100%')
    // .attr('height',svgHeight)
    

  // svg.exit().remove();

  // svg = svg.merge(enter);

  // let participantGroups = svg.selectAll(".participantGroup").data(provData);


  // let participantGroupsEnter = participantGroups
  //   .enter()
  //   .append("g")
  //   .attr("class", "participantGroup");

  // participantGroupsEnter
  //   .append("rect")
  //   .attr("class", "typeRect")
  //   .attr("x", - 20)
  //   .attr("y", 0)
  //   .attr("height", height)
  //   .attr("width", 5); //width  + 20 + margin.right);

  let opacityScale = d3
    .scaleLinear()
    .domain([0, 15])
    .range([0.3, 1]);

  var x = d3.scaleLinear().range([0, width]);

  x.domain([0, maxTime]);

  var y = d3.scaleLinear().range([height - 10, 0]);
  y.domain([-2, 2]); //provData[index].provEvents.filter(e=>e.type === type && e.level === undefined).length-1+2]);

  let staggerScale = d3.scaleLinear().range([35,0]).domain([0,1])
  let xAxis = d3
    .axisBottom(x)
    .ticks(10)
    .tickFormat(d => Math.round(d / 1000 / 60));

  participantGroupsEnter
    .append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

    
      
    participantGroupsEnter
    .append("text")
    .attr("class", "time")
    .attr("x", x.range()[1])
    .attr("y", 0)
    .style("text-anchor", "end");


    participantGroupsEnter
    .append("text")
    .attr("class", "rank")
    .attr("x", x.range()[1])
    .attr("y", y(3))
    .style("text-anchor", "end");

    participantGroupsEnter
    .append("text")
    .attr("class", "id")
    .attr("x", x.range()[0])
    .attr("y", y(3))
    .style("text-anchor", "start");

    // participantGroupsEnter
    // .append("text")
    // .attr("class", "visType")
    // .attr("x", -40)
    // .attr("y", y(0))
    // .style("text-anchor", "end");

  

  participantGroups.exit().remove();

  participantGroups = participantGroupsEnter.merge(participantGroups);

  // participantGroups
  //   .attr(
  //     "transform",
  //     (d, i) =>
  //       "translate(" + margin.left + "," + (i*(margin.top + height)) + ")"
  //   );

   participantGroups
    .attr(
      "transform",
      (d, i) =>
        "translate(" + margin.left + "," + margin.top + ")"
    );

  participantGroups
    .select(".typeRect")
    .attr("class", d =>  'typeRect ' + d.visType );

    
  let rectGroups = participantGroups
    .selectAll(".event")
    .data((d, i) => d.provEvents.filter(e => e.type === "longAction").map(p=>{
        p.participantStartTime = startTime(d)
      return p
    }));

  let rectGroupsEnter = rectGroups
    .enter()
    .append("g")
    .attr("class", "event")

    rectGroupsEnter.append('rect').attr('class','baseRect')
    rectGroupsEnter.append('rect').attr('class','autoCompleteRect')
    rectGroupsEnter.append('text').attr('class','rankLabel')



  rectGroups.exit().remove();

  rectGroups = rectGroupsEnter.merge(rectGroups);

  let rects = rectGroups.select('.baseRect')
  rects
    .attr("height", 15)
    .attr("x", d => {
      let time = Date.parse(d.startTime) || x(Date.parse(d.time));
      return x(time - d.participantStartTime);
    })

    .attr("y", (d, i) => {
      if (d.task && d.task.result){
        return staggerScale(d.task.result.accuracy)

      } else {
        return y(d.level)//y(d.participantOrder))
      }
    })
    .attr("width", d => {
      let diff = x(Date.parse(d.endTime)) - x(Date.parse(d.startTime));

      return diff || 0;
    })
    .attr("class", d => {
      let className = "event baseRect " + d.label.replace(/ /g, "") ;
      return d.task ? className + " " + d.task.type +  " " + d.task.difficulty : className
    })

    rectGroups.select('.autoCompleteRect')
    .attr("height", 5)
    // d => {
    //   let ac = d.task && d.task.result && d.task.result.interactionDetails.autoCompleteUsed;
    //   let diff = x(Date.parse(d.endTime)) - x(Date.parse(d.startTime));
      

    //    if (ac){
    //      let rankScale = d3.scaleLinear().domain([1,4]).range([10,2])
    //      return rankScale(d.task.result.interactionDetails.rankOfPredictionUsed);
    //    } else {
    //      return 0
    //    }
    
    // })
    .attr("x", d => {
      let time = Date.parse(d.startTime) || x(Date.parse(d.time));
      return x(time - d.participantStartTime)//+2;
    })

    .attr("y", (d, i) => {
      let initialY;
      if (d.task && d.task.result){
        initialY= staggerScale(d.task.result.accuracy)-5

        // let ac = d.task && d.task.result && d.task.result.interactionDetails.autoCompleteUsed;
        // let diff = x(Date.parse(d.endTime)) - x(Date.parse(d.startTime));
        
  
        //  if (ac){
        //   let rankScale = d3.scaleLinear().domain([1,4]).range([10,2])
        //    return initialY - rankScale(d.task.result.interactionDetails.rankOfPredictionUsed);
        //  } else {
        //    return 0
        //  }
        return initialY

      } else {
        return y(d.level)//y(d.participantOrder))
      }
    })
    .attr("width", d => {
      let ac = d.task && d.task.result && d.task.result.interactionDetails.autoCompleteUsed;
      let diff = x(Date.parse(d.endTime)) - x(Date.parse(d.startTime));

      return ac ? diff :0;
    })
    .attr("class", d => {
      let className = "event autoCompleteRect " + d.label.replace(/ /g, "") ;
      return className
    })

    rectGroups.select('.rankLabel')
    .attr("x", d => {
      let time = Date.parse(d.startTime) || x(Date.parse(d.time));
      return x(time - d.participantStartTime)//+2;
    })
    .attr("y", (d, i) => {
      let initialY;
      if (d.task && d.task.result){
        initialY= staggerScale(d.task.result.accuracy)-5
        return initialY

      } else {
        return y(d.level)
      }
    })
    .text(d => {
      let ac = d.task && d.task.result && d.task.result.interactionDetails.autoCompleteUsed;
      return ac ? d.task.result.interactionDetails.rankOfPredictionUsed :'';
    })
    .attr('class',d => {
      let rank = d.task && d.task.result && d.task.result.interactionDetails.rankOfPredictionUsed;
      return rank ? (rank>3 ? 'rankLabel wrong' : rank >2 ? 'rankLabel medium' : 'rankLabel') : false;
    })
    


  
    // .attr('fill',d=>(d.task && d.task.result) ? color(d.task.result.accuracy) : '')
  // .classed('sortedOn', d=>sortOrder && d.task && d.task.id == sortOrder)

  rectGroups
  .on("mouseover", d => {
    let tooltipContent;
    if (d.label == "Task") {
      // console.log(d)
      tooltipContent =
        d.task && d.task.id !== undefined
          ? "<strong>" +
            "Task:" + d.task.id +
            "</strong>" +
            "[" +
            d.task.result.accuracy +
            "]" 
            +
            "<br/>" +
            d.task.type + "/" + d.task.difficulty 
          
          : "";

          if (d.task.result.interactionDetails.autoCompleteUsed){
            tooltipContent = tooltipContent 
            +
            "<br/>" +
            'Rank: ' + d.task.result.interactionDetails.rankOfPredictionUsed + " [" + d.task.result.interactionDetails.selectedPrediction +"]"
          }
    } else {
      tooltipContent =
        d.label +
        ":" +
        Math.round(
          (Date.parse(d.endTime) - Date.parse(d.startTime)) / 1000 / 6
        ) /
          10 +
        "min";
    }
    showTooltip(d.endTime ? tooltipContent : d.label);
  })
    .on("mouseout", hideTooltip)
    .on("click", d => {
      if (d.order !== undefined) {
        d3.selectAll('.frames').classed('selected',f=>f.task.id === d.task.id )
      }
    });

  //   let diff = participantGroups
  //   .selectAll(".textGroup")
  //   .data((d, i) =>  d.provEvents.filter(e => e.type === "longAction" && e.label==="task" && e.task.data));

  // let diffEnter = diff
  //   .enter().append('g').attr('class','textGroup')

  //   diffEnter
  //   .append("text")
  //   .attr("class", "difficulty")

  //   diffEnter
  //   .append("text")
  //   .attr("class", "confidence")


  // diff.exit().remove();

  // diff = diffEnter.merge(diff);

  // diff.select('.difficulty')
  //   .attr("x", d => {
  //     let time = Date.parse(d.endTime);
  //     return x(time - d.participantStartTime);
  //   })
  //   .attr("y", (d, i) => y(d.level)-5) //y(d.participantOrder))
  //   .text(d=>d.task.data.feedback.difficulty)
  //   .style('text-anchor','end')
  //   .attr("class", 'difficulty')


  //   diff.select('.confidence')
  //   .attr("x", d => {
  //     let time = Date.parse(d.endTime);
  //     return x(time - d.participantStartTime);
  //   })
  //   .attr("y", (d, i) => y(d.level)+20) //y(d.participantOrder))
  //   .text(d=>d.task.data.feedback.confidence)
  //   .style('text-anchor','end')
  //   .attr("class", 'confidence')



  let frames = participantGroups
    .selectAll(".frames")
    .data((d, i) =>
      d.provEvents.filter(e => e.label === "task" && e.order !== undefined)
    );

  let framesEnter = frames
    .enter()
    .append("rect")
    .attr("class", "frames");

  frames.exit().remove();

  frames = framesEnter.merge(frames);

  frames
    .attr("height", 15)
    .attr("x", d => {
      let time = Date.parse(d.startTime) || x(Date.parse(d.time));
      return x(time - d.participantStartTime);
    })
    .attr("y", (d, i) => y(d.level)) //y(d.participantOrder))
    .attr("width", d => {
      let diff = x(Date.parse(d.endTime)) - x(Date.parse(d.startTime));
      return diff || 0;
    })
    // .classed("sortedOn", d => sortOrder && d.task && d.task.id == sortOrder);

  participantGroups
    .select('.rank')
    .text(d=>"Avg Accuracy:" +
      Math.round(d.averageAccuracy * 100) / 100     
    )

    participantGroups
    .select('.time')
    .text(d=>"Time: " +
      millisToMinutesAndSeconds(d.timeOnTask) + " [" + millisToMinutesAndSeconds(d.totalStudyTime) + "]"   
    )
   

  participantGroups
   .select('.id')
    .text(d => d.id)
  
  // participantGroups
  // .select('.visType')
  //   .text(d=>
  //     d
  //       ? d.visType == "adjMatrix"
  //         ? "AM"
  //         : "NL"
  //       : "NA"
  //   )

  let labels = participantGroups
    .selectAll(".label")
    .data((d, i) => d.provEvents.filter(e => e.type === "longAction").sort((a,b)=>a.time>b.time ? 1: 0));

  let labelsEnter = labels
    .enter()
    .append("text")
    .attr("class", "label");

  labels.exit().remove();

  labels = labelsEnter.merge(rects);

  labels
    // .attr("x", d => x(Date.parse(d.startTime) || Date.parse(d.time)))
    // .attr("y", (d, i) => y(d.level)) //y(d.participantOrder))
    .attr("transform", (d,ii) => {

      let yTranslate = d.level -1.5 
      let time = Date.parse(d.startTime) || x(Date.parse(d.time));
      return ("translate(" +
        x(time - d.participantStartTime) +
        "," +
        y(yTranslate) +
        ") rotate(0)"
      ) 
    })
    // .attr("dy", 5)
    .style("text-anchor", "start")
    .style("font-size", 12)
    .attr("class", d => "label " + d.label.replace(/ /g, ""))
    .text(d => (d.level == 0 && d.label !== "Browse Away" ? d.label.replace('Training','Tr.').replace('computerAssisted','comp') : ""));

  rects = participantGroups.selectAll(".s-event")
  // .data([])
  .data((d, i) =>
    d.provEvents
      .filter(
        e => e.type === "singleAction" && e.label !== "submitted valid answer"
      )
      .map(pEvent => {
        pEvent.participantStartTime = startTime(d);
        return pEvent;
      })
  );

  rectsEnter = rects
    .enter()
    .append("rect")
    .attr("class", "s-event");
  // .style('opacity',.2);

  rects.exit().remove();

  rects = rectsEnter.merge(rects);

  rects
    .attr("height", 20)
    .attr("x", d => x(Date.parse(d.time)) - x(d.participantStartTime))
    .attr("y", (d, i) => y(d.level + 1.1)) //y(d.participantOrder))
    .attr("width", 3)
    .attr("class", d => "s-event " + d.label.replace(/ /g, ""))
    .on("mouseover", d => {
      showTooltip(d.label);
    })
    .on("mouseout", hideTooltip);
}

async function drawProvenance(sortOrder) {

  //add tooltip
  d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  let provData = await d3.json(
    "results/" + mode + "/JSON/provenance_events.json"
  );

  participantResults = await d3.json(
    "results/" + mode + "/JSON/study_results.json"
  );


  let sortedProvData = provData; //will sort on average accuracy later; 

  // let sortedProvData = provData.sort((a, b) => {
  //   let aResults = participantResults.find(d => d.data.workerID == a.id);
  //   let bResults = participantResults.find(d => d.data.workerID == b.id);

  //   if (!aResults || !bResults) {
  //     return 0;
  //   }

  //   if (sortOrder) {

  //     return aResults.data.averageAccuracy > bResults.data.averageAccuracy
  //       ? -1
  //       : 1;
  //   } else {
  //     return aResults.data.averageAccuracy > bResults.data.averageAccuracy
  //       ? -1
  //       : 1;
  //   }
  // });

  sortedProvData.map((p, i) => {
    let participantResult = participantResults.find(
      d => d.data.participantId == p.id
    );

 
    //compute average accuracy; 
    p.averageAccuracy = participantResult.data.avgAcc;


    // let resultsArray = Object.entries(participantResult.data);

    // //associate results data for each task
    // p.provEvents.map(e => {
    //   if (e.label === "task") {
    //     let data = resultsArray.filter(r => r[0] === e.task)[0];
    //     // console.log(e,resultsArray,data)
    //     if (data) {
    //       e.order = data[1].order;
    //       e.task = { id: data[0], data: data[1] };
    //       p.visType = e.task.data.visType;
    //     }
    //   }
    // });
  });


  makePlots(sortedProvData);
}

//Function to save exportedGraph to file automatically;
function saveJSON(data, filename) {
  if (!data) {
    console.error("Console.save: No data");
    return;
  }

  if (!filename) filename = "output.json";

  if (typeof data === "object") {
    data = JSON.stringify(data, undefined, 4);
  }

  var blob = new Blob([data], { type: "text/json" }),
    e = document.createEvent("MouseEvents"),
    a = document.createElement("a");

  a.download = filename;
  a.href = window.URL.createObjectURL(blob);
  a.dataset.downloadurl = ["text/json", a.download, a.href].join(":");
  e.initMouseEvent(
    "click",
    true,
    false,
    window,
    0,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    0,
    null
  );
  a.dispatchEvent(e);
}

function saveCSV(data, filename) {
  let csvContent = data.map(e => e.join(",")).join("\n"); //"data:text/csv;charset=utf-8,"

  var blob = new Blob([csvContent], { type: "text/csv" }),
    e = document.createEvent("MouseEvents"),
    a = document.createElement("a");

  a.download = filename;
  a.href = window.URL.createObjectURL(blob);
  a.dataset.downloadurl = ["text/csv", a.download, a.href].join(":");
  e.initMouseEvent(
    "click",
    true,
    false,
    window,
    0,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    0,
    null
  );
  a.dispatchEvent(e);
}

async function exportForVisone() {
  let graph = await d3.json("network_large_undirected_singleEdge.json");

  //create a barebones graph to import into Visone;
  let bareBonesGraph = { nodes: [], links: [] };

  graph.nodes.map(n =>
    bareBonesGraph.nodes.push({ id: n.id, name: n.shortName })
  );
  graph.links.map((l, i) => {
    let source = graph.nodes.find(n => n.id === l.source);
    let target = graph.nodes.find(n => n.id === l.target);
    bareBonesGraph.links.push({
      source: graph.nodes.indexOf(source),
      target: graph.nodes.indexOf(target),
      id: i
    });
  });

  saveJSON(bareBonesGraph, "layoutGraph.json");
}

async function importLayout() {
  let filenames = [
    "network_large_undirected_singleEdge.json",
    "network_large_undirected_multiEdge.json",
    "network_small_undirected_singleEdge.json"
  ];
  // let taskInfo = await d3.json('results/pilot/study.json');

  filenames.map(async (fname, i) => {
    let graph = await d3.json("results/pilot/" + fname);
    let layoutFile =
      i < 2
        ? "results/pilot/manual_layout_generic.json"
        : "results/pilot/small_manual_layout.json";

    let layout = await d3.json(layoutFile);

    graph.nodes.map(n => {
      // let layoutNode = layout.elements.nodes.find(l=>l.data.label === n.shortName);
      // n.x = layoutNode.position.x;
      // n.y = layoutNode.position.y;

      let layoutNode = layout.nodes.find(l => l.id === n.id);
      n.x = layoutNode.x;
      n.y = layoutNode.y;
    });
    saveJSON(graph, fname);
  });
}
