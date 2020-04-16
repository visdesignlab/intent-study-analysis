console.log("running node script");
("use strict");

const fs = require("fs");

let taskTitles = {
  "S-task01": "Node Search on Attribute",
  "S-task02": "Node Search on Attribute with Distractors",
  "S-task03": "Node Search on Topology and Multiple Attributes",
  "S-task04": "Neighbor Search on Attribute",
  "S-task05": "Neighbor Search on Attribute with Distractors",
  "S-task06": "Neighbor Search on Edge Attribute",
  "S-task07": "Neighbor Overview on Edge Attribute",
  "S-task08": "Attribute of Common Neighbors",
  "S-task09": "Edge Attributes",
  "S-task10": "Node Attribute Comparison",
  "S-task11": "Node Attribute Comparison on Small Network",
  "S-task12": "Cluster and Attribute Estimation",
  "S-task13": "Attribute along Shortest Path",
  "S-task14": "Attribute along Shortest Path on Small Network",
  "S-task15": "Attribute on Subnetwork",
  "S-task16": "Free Explore"
};

let taskPrompts = {

  "S-task01": "Find the North American with the most Tweets.",
  "S-task02": "Find the European person or institution with the least likes.",
  "S-task03": "Which person has many interactions (edges) in this network, several followers, but few tweets and likes in general?",
  "S-task04": "Find all of Lane's European Neighbors.",
  "S-task05": "Find all of giCentre's North American Neighbors.",
  "S-task06": "Who had the most mention interactions with Jeffrey?",
  "S-task07": "Does Alex have more mention interactions with North American or European accounts? Who does he have the most mentions interactions with?",
  "S-task08": "Among all people who have interacted with both Jeffrey and Robert, who has the most followers?",
  "S-task09": "What is the most common form of interaction between Evis19 and Jon? How often has this interaction happened?",
  "S-task10": "Select all of Noeska’s neighbors that are people and have more friends than followers.",
  "S-task11": "Select the people who have interacted with Thomas and have more friends than followers.",
  "S-task12": "Select all the people who are in a cluster with Alex. Estimate the average number of followers among the selected people.",
  "S-task13": "What is the institution on a shortest path between Lane and Rob. What is its continent of origin?",
  "S-task14": "What is the institution on a shortest path between Jason and Jon. What is its continent of origin?",
  "S-task15": "Of the North Americans who are two interactions away from Sereno, who has been on twitter the longest?",
  "S-task16": "Please explore the network freely and report on your findings. Is there anything surprising or particularly interesting in the network?"
};

(async function() {
  let mode = process.argv[2];
  console.log("mode is ", mode);
  switch (mode) {
    case "process":
      processData();
      break;
    case "provenance":
      processProvenance();
      break;
    case "visProvenance":
         //exportTidyProvenance();

          processVisProvenance();
          break;
    case "export":
      exportResults();
      break;
  }
})();




function exportResults() {
  let rawdata = fs.readFileSync(
    "results/study/JSON/provenance_processed_results.json"
  );
  let results = JSON.parse(rawdata);

  exportCSV(results);
  exportTidy(results);
}

async function exportCSV(results) {
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;
  let csvWriter;

  let csvKeys = [];

  results.map(r => {
    Object.keys(flatten(r.data)).map(key => {
      if (!csvKeys.includes(key)) {
        csvKeys.push(key);
      }
    });
  });

  csvKeys = csvKeys.filter(k => {
    return (
      k.includes("answer.nodes") ||
      k.includes("answer.accuracy") ||
      k.includes("answer.correct") ||
      k.includes("answer.radio") ||
      k.includes("answer.value") ||
      k.includes("feedback") ||
      k.includes("minutesOnTask") ||
      k.includes("order") ||
      k.includes("prompt") ||
      k.includes("workerID") ||
      k.includes("overall") ||
      k.includes("averageAccuracy") ||
      k.includes("demographics") ||
      k.includes("visType") ||
      k.includes("taskID")
    );
  });

  // console.log(csvKeys)

  csvWriter = createCsvWriter({
    path: "results/study/CSV/results.csv",
    header: csvKeys.map(key => {
      return { id: key, title: key };
    })
  });

  let sorted = results
    //sort by visType
    .sort((a, b) => (a.data["S-task01"].visType === "nodeLink" ? 1 : -1));

  let csvValues = sorted.map(p => {
    //fill in missing values;
    let obj = {};
    csvKeys.map(key => {
      let value = nameSpace(p.data, key);
      // console.log(key, value)
      //user did not take that task
      if (value === undefined) {
        console.log("missing value for ", key);
        setNested(p.data, key, "");
      }

      let v = nameSpace(p.data, key);

      //remove commas, newlines, and html markup
      if (typeof v === "string") {
        v = v.replace(/,/g, "");
        v = v.replace(/\r?\n|\r/g, "");
        v = v.replace(/<span class='attribute'>/g, "");
        v = v.replace(/<span class='attribute' >/g, "");
        v = v.replace(/<\/span>/g, "");
      }
      // return v.toString();
      obj[key] = v;
    });
    return obj;
  });

  csvWriter
    .writeRecords(csvValues)
    .then(() => console.log("results.csv was written successfully"));
}

async function exportTidy(results) {
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;
  let csvWriter;

  let rawdata = fs.readFileSync(
    "results/study/JSON/provenance_study_participants.json"
  );
  let participants = JSON.parse(rawdata);

  let rHeaders, rRows;

  rHeaders = ["prolificId", "measure", "value"];

  csvWriter = createCsvWriter({
    path: "results/study/CSV/participantInfoTidyR.csv",
    header: rHeaders.map(key => {
      return { id: key, title: key };
    })
  });

  rRows = [];

  participants.map(participant => {
    let id = participant.data.PROLIFIC_PID;

    let createTidyRow = function(measure, value) {
      return {
        prolificId: id,
        measure,
        value
      };
    };

    rRows.push(
      createTidyRow("browser", participant.data.browserInfo["Browser name"])
    );
    rRows.push(createTidyRow("age", participant.data.demographics.age));
    rRows.push(createTidyRow("degree", participant.data.demographics.degree));
    rRows.push(createTidyRow("sex", participant.data.demographics.sex));
    rRows.push(
      createTidyRow(
        "visExperience",
        participant.data.demographics.vis_experience
      )
    );
    rRows.push(createTidyRow("minutesOnTask", participant.data.minutesOnTask));
    rRows.push(
      createTidyRow("averageAccuracy", participant.data.averageAccuracy)
    );
  });

  csvWriter
    .writeRecords(rRows)
    .then(() =>
      console.log("participantInfoTidyR.csv was written successfully")
    );

  rHeaders = [
    "prolificId",
    "taskId",
    "taskNumber",
    "taskOrder",
    "taskTitle",
    "taskPrompt",
    "visType",
    "taskType",
    "topology",
    "node_attributes",
    "edge_attributes",
    "attributes",
    "hypothesis_1",
    "hypothesis_2",
    "measure",
    "value"
  ];

  csvWriter = createCsvWriter({
    path: "results/study/CSV/TidyR.csv",
    header: rHeaders.map(key => {
      return { id: key, title: key };
    })
  });

  rRows = [];

  results.map(participantData => {
    let id = participantData.data.workerID;

    Object.keys(participantData.data)
      .filter(key => key[0] === "S") //only look at task keys
      .map(taskId => {
        let createTidyRow = function(measure, value, customTaskId) {
          let hypothesis = data.hypothesis.split(",");
          return {
            prolificId: id,
            taskId: customTaskId ? customTaskId : taskId,
            taskNumber: customTaskId ? 'T' + customTaskId.replace('S-task','') : 'T' + taskId.replace('S-task','')  ,
            taskOrder:data.order,
            taskTitle: taskTitles[taskId],
            taskPrompt: customTaskId ? (customTaskId.includes('A') ? taskPrompts[taskId].split('.')[0]  : taskPrompts[taskId].split('.')[1] ) : taskPrompts[taskId],
            visType: data.visType,
            taskType: data.taxonomy.type,
            topology: data.taxonomy.target,
            node_attributes:data.attributes.node,
            edge_attributes:data.attributes.edge,
            attributes:data.attributes.node + data.attributes.edge,
            hypothesis_1: hypothesis[0],
            hypothesis_2: hypothesis[1] ? hypothesis[1] : "",
            measure,
            value
          };
        };

        let data = participantData.data[taskId];

        //create a row for every relevant value;
        data.answer.nodes
          .split(";")
          .map(n => n.trim())
          .map(node => {
            rRows.push(createTidyRow("nodeAnswer", node));
          });

        data.answer.value
          .split(";")
          .map(n => n.trim())
          .map(v => {
            if (v.length > 0) {
              v = v.replace(/,/g, "");
              v = v.replace(/\r?\n|\r/g, "");
              rRows.push(createTidyRow("valueAnswer", v));
            }
          });

        if (data.answer.radio) {
          rRows.push(createTidyRow("valueAnswer", data.answer.radio));
        }
        if (taskId == "S-task12") {
          rRows.push(
            createTidyRow("accuracy", data.answer.scoreCluster, "S-task12A")
          );
          rRows.push(
            createTidyRow("accuracy", data.answer.scoreAverage, "S-task12B")
          );
        }

        rRows.push(createTidyRow("accuracy", data.answer.accuracy));
        rRows.push(createTidyRow("correct", data.answer.correct));
        rRows.push(createTidyRow("difficulty", data.feedback.difficulty));
        rRows.push(createTidyRow("confidence", data.feedback.confidence));
        rRows.push(createTidyRow("minutesOnTask", data.minutesOnTask));
      });
  });

  csvWriter
    .writeRecords(rRows)
    .then(() => console.log("TidyR.csv was written successfully"));
}


function standardDeviation(values) {
  var avg = average(values);

  var squareDiffs = values.map(function(value) {
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });

  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

function average(data) {
  var sum = data.reduce(function(sum, value) {
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}

function exportTidyProvenance(){

  let rawdata;
  rawdata = fs.readFileSync("results/study/JSON/slimProvenance.json");
  let slimProvenance = JSON.parse(rawdata);

  //Read in JSON file for slimProvenance; 

    //write out provenance events for R processing
    const createCsvWriter = require("csv-writer").createObjectCsvWriter;
    let csvWriter;

    headers = ['id','taskId','visType','event'];

    csvWriter = createCsvWriter({
      path: "results/study/CSV/provenanceTidy.csv",
      header: headers.map(key => {
        return { id: key, title: key };
      })
    });

    let provCsv = [];
    // "5d49e0634aff6e0018fb7004": {
    //   "visType": "adjMatrix",
    //   "S-task08": [null, "search", "c

    Object.keys(slimProvenance).map(id=>{
      Object.keys(slimProvenance[id]).map(taskId=>{
        if (Array.isArray(slimProvenance[id][taskId])){
          slimProvenance[id][taskId].map(event=>{
            if (event){
              provCsv.push({
                id,
                taskId,
                visType:slimProvenance[id].visType,
                event
              })
            }
          })
        }
      })
    })

    csvWriter
      .writeRecords(provCsv)
      .then(() => console.log("provenanceTidy.csv was written successfully"));
  

  

}

//function to create events on a per participant basis;
function processProvenance() {
  let rawdata;
  rawdata = fs.readFileSync("results/events.json");
  let eventTypes = JSON.parse(rawdata);

  rawdata = fs.readFileSync("results/study/JSON/processed_results.json");
  let results = JSON.parse(rawdata);

  rawdata = fs.readFileSync("results/study/JSON/study_participants.json");
  let study_participants = JSON.parse(rawdata);

  rawdata = fs.readFileSync("results/study/JSON/participant_actions.json");
  let provenance = JSON.parse(rawdata);

  //create events objects per participant;
  let events = [];

  provenance.map(participant => {
    participantEventArray = [];

    let r = results.find(r => r.data.workerID === participant.id);
    r.data.browsedAwayTime = 0;

    let p = study_participants.find(p => p.id === participant.id);

    participant.data.provGraphs.map(action => {
      //see if this a single event, or the start/end of a long event;
      let event = eventTypes[action.event];

      if (event && event.type === "singleAction") {
        //create copy of event template
        let eventObj = JSON.parse(JSON.stringify(eventTypes[action.event]));
        eventObj.label = action.event;
        eventObj.time = action.time;
        if (eventObj.label !== "next" && eventObj.label !== "back") {
          participantEventArray.push(eventObj);
        }
      } else {
        //at the start of an event;
        if (event && event.start.trim() == action.event.trim()) {
          let eventObj = JSON.parse(JSON.stringify(eventTypes[action.event]));
          eventObj.startTime = action.time;
          eventObj.task = action.task;

          //if this event started after the last task, ignore it;
          // if (Date.parse(eventObj.startTime)< Date.parse(r.data['S-task16'].startTime)){
          participantEventArray.push(eventObj);
          // }
        } else {
          //at the end of an event;
          //find the 'start' eventObj;
          let startObj = participantEventArray
            .filter(e => {
              let value =
                e.type === "longAction" &&
                Array.isArray(e.end) &&
                e.end.includes(action.event) &&
                (e.label === "task" ? e.task === action.task : true);
              return value;
            })
            .pop();
          if (startObj === undefined) {
            // console.log("could not find start event for ", action.event, action.task);
          } else {
            startObj.endTime = action.time;
            let minutesBrowsedAway =
              (Date.parse(startObj.endTime) - Date.parse(startObj.startTime)) /
              1000 /
              60;

            if (
              startObj.label === "browse away" &&
              startObj.task &&
              startObj.task[0] === "S"
            ) {
              //only adjust time for browse away events during task completions
              if (
                Date.parse(startObj.startTime) <
                Date.parse(r.data["S-task16"].endTime)
              ) {
                if (minutesBrowsedAway < 50) {
                  r.data.browsedAwayTime =
                    r.data.browsedAwayTime + minutesBrowsedAway;

                  //catch case where browse away is logged at several hours;
                  r.data[startObj.task].minutesOnTask =
                    Math.round(
                      (r.data[startObj.task].minutesOnTask -
                        minutesBrowsedAway) *
                        10
                    ) / 10;
                }
              }
            }
          }
        }
      }
    });

    //update total on study time
    r.data.overallMinutesOnTask =
      r.data.overallMinutesToComplete - r.data.browsedAwayTime;
    //update total on participant_info
    p.data.minutesOnTask = r.data.overallMinutesOnTask;

    events.push({ id: participant.id, provEvents: participantEventArray });
    // console.log(participantEventArray.filter(e=>e.type === 'longAction' && e.endTime === undefined))
  });

  // console.log(events)
  fs.writeFileSync(
    "results/study/JSON/provenance_events.json",
    JSON.stringify(events)
  );
  console.log("exported provenance_events.json");

  // console.log(events)
  fs.writeFileSync(
    "results/study/JSON/provenance_processed_results.json",
    JSON.stringify(results)
  );
  console.log("exported provenance_processed_results.json");

  // console.log(events)
  fs.writeFileSync(
    "results/study/JSON/provenance_study_participants.json",
    JSON.stringify(study_participants)
  );
  console.log("exported provenance_study_participants.json");
}

function flatten(data) {
  var result = {};
  function recurse(cur, prop) {
    if (Object(cur) !== cur) {
      result[prop] = cur;
    } else if (Array.isArray(cur)) {
      for (var i = 0, l = cur.length; i < l; i++)
        recurse(cur[i], prop + "[" + i + "]");
      if (l == 0) result[prop] = [];
    } else {
      var isEmpty = true;
      for (var p in cur) {
        isEmpty = false;
        recurse(cur[p], prop ? prop + "." + p : p);
      }
      if (isEmpty && prop) result[prop] = {};
    }
  }
  recurse(data, "");
  return result;
}

function nameSpace(obj, path) {
  var property,
    path = path.split(".");
  while ((property = path.shift())) {
    if (typeof obj[property] === "undefined") return undefined;
    obj = obj[property];
  }
  return obj;
}

function setNested(obj, path, value) {
  var property,
    path = path.split(".");
  while ((property = path.shift())) {
    if (typeof obj[property] === "undefined") {
      if (path.length > 0) {
        obj[property] = {};
      }
    }

    if (path.length === 0) {
      obj[property] = value;
    } else {
      obj = obj[property];
    }
    // console.log(obj,property,obj[property])
  }
}
