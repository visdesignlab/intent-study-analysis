console.log("running node script");
("use strict");

const fs = require("fs");

(async function () {
  let mode = process.argv[2];
  // let script = process.argv[3]
  // console.log("mode is ", mode);
  // switch (script) {
  //   case "provenance":
  //     processProvenance();
  //     break;
  //   case "tidy":
  //       exportResults(mode)
  //       break;
  // }

  processProvenance(mode);
  // exportResults(mode);
})();

//function to create events on a per participant basis;
function processProvenance(mode) {
  let rawdata;
  rawdata = fs.readFileSync("results/events.json");
  let eventTypes = JSON.parse(rawdata);

  rawdata = fs.readFileSync("results/" + mode + "/JSON/study_results.json");
  let results = JSON.parse(rawdata);

  rawdata = fs.readFileSync("results/" + mode + "/JSON/study_provenance.json");
  let provenance = JSON.parse(rawdata);

  //create events objects per participant;
  let events = [];

  results.map((participantData) => {
    let id = participantData.data.participantId;
    let pCount = 0;
    
    Object.keys(participantData.data.tasks).filter(taskId=>participantData.data.tasks[taskId].training !== 'yes').map((taskId)=>{
      let taskInfo = participantData.data.tasks[taskId];
  
      if (taskInfo['user-driven'] =="supported"){
        if (taskInfo.interactionDetails.autoCompleteUsed){
          pCount = pCount +1
        }  
      } 
  
    })
  
    //add flag for participants with at least 4 tasks using autoComplete
    participantData.data.keep = pCount >4;
  })



  provenance.map((participant) => {
    // console.log(participant)
    participantEventArray = [];

    let r = results.find((r) => r.data.participantId === participant.id);

    //remove all events prior to the 'Start phase: Video' task ;
    let startVideoEvent = participant.data.indexOf(
      participant.data.find((p) => p.label == "Start phase: Video")
    );
    participant.data.startedVideoTime = participant.data.splice(
      0,
      startVideoEvent
    );

    let browsedAwayTime = 0;
    // let p = study_participants.find(p => p.id === participant.id);
    // console.log(eventTypes)
    participant.data.map((action) => {
      //modify task labels;
      if (action.label.includes("Start task")) {
        action.label = "Start task";
      }
      if (action.label.includes("Complete task")) {
        action.label = "Complete task";
      }
      //see if this a single event, or the start/end of a long event;
      let event = eventTypes[action.label];
      // if (event == undefined) {
      //   // console.log("can't find " + action.label)
      // }

      if (event && event.type === "singleAction") {
        //create copy of event template
        let eventObj = JSON.parse(JSON.stringify(eventTypes[action.event]));
        eventObj.label = action.event;
        eventObj.time = action.time;
        if (eventObj.label !== "next" && eventObj.label !== "back") {
          participantEventArray.push(eventObj);
        }
        console.log("never here");
      } else {
        // console.log(eventTypes[action.event])
        //at the start of an event;
        if (event && event.start.trim() == action.label.trim()) {
          // console.log('here')

          let eventObj = JSON.parse(JSON.stringify(eventTypes[action.label]));
          eventObj.startTime = new Date(action.time);
          eventObj.task = action.task;

          // console.log('eventObj', eventObj)

          //if this event started after the last task, ignore it;
          // if (Date.parse(eventObj.startTime)< Date.parse(r.data['S-task16'].startTime)){
          participantEventArray.push(eventObj);
          // }
        }

        {
          //at the end of an event;
          //find the 'start' eventObj;
          let startObj = participantEventArray
            .filter((e) => {
              let value =
                e.type === "longAction" &&
                Array.isArray(e.end) &&
                e.end.includes(action.label) &&
                (e.label === "task" ? e.task.id === action.task.id : true);
              return value;
            })
            .pop();
          if (startObj === undefined) {
            // console.log("could not find start event for ", action.label) //action.event, action.task);
          } else {
            startObj.endTime = new Date(action.time);
            //add accuracy from results

            if (startObj.label == "Task") {
              startObj.task.result = r.data.tasks[startObj.task.id];
            }

            if (startObj.label === "Browse Away") {
              browsedAwayTime =
                browsedAwayTime +
                (Date.parse(startObj.endTime) - Date.parse(startObj.startTime));
            }
          }
        }
      }
    });

    //update total on study time

    let totalStudyTime =
      participantEventArray[participantEventArray.length - 1].endTime -
      participantEventArray[0].startTime;
    //update total on participant_info
    let timeOnTask = totalStudyTime - browsedAwayTime;

    // console.log("browsed away", browsedAwayTime);


    events.push({
      id: participant.id,
      totalStudyTime,
      timeOnTask,
      keep:r.data.keep,
      provEvents: participantEventArray,
    });
    // console.log(participantEventArray.filter(e=>e.type === 'longAction' && e.endTime === undefined))
  });

  // console.log(events)
  fs.writeFileSync(
    "results/" + mode + "/JSON/provenance_events.json",
    JSON.stringify(events)
  );
  console.log("exported provenance_events.json");

  // console.log(events)
  fs.writeFileSync(
    "results/" + mode + "/JSON/provenance_processed_results.json",
    JSON.stringify(results)
  );
  console.log("exported provenance_processed_results.json");
  exportResults(mode,results);
}

function exportResults(mode,results) {
  // let rawdata = fs.readFileSync("results/" + mode + "/JSON/study_results.json");
  // let results = JSON.parse(rawdata);
  // exportCSV(results);
  exportTidy(mode, results);
}

async function exportCSV(mode, results) {
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;
  let csvWriter;

  let csvKeys = [];

  results.map((r) => {
    Object.keys(flatten(r.data)).map((key) => {
      if (!csvKeys.includes(key)) {
        csvKeys.push(key);
      }
    });
  });

  csvKeys = csvKeys.filter((k) => {
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
    header: csvKeys.map((key) => {
      return { id: key, title: key };
    }),
  });

  let sorted = results
    //sort by visType
    .sort((a, b) => (a.data["S-task01"].visType === "nodeLink" ? 1 : -1));

  let csvValues = sorted.map((p) => {
    //fill in missing values;
    let obj = {};
    csvKeys.map((key) => {
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

async function exportTidy(mode, results) {
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;
  let csvWriter;

  // let rawdata = fs.readFileSync(
  //   "results/study/JSON/provenance_study_participants.json"
  // );
  // let participants = JSON.parse(rawdata);

  let rHeaders, rRows;

  rHeaders = ["prolificId","type", "measure", "value"];

  csvWriter = createCsvWriter({
    path: "results/" + mode + "/CSV/participantInfoTidyR.csv",
    header: rHeaders.map((key) => {
      return { id: key, title: key };
    }),
  });

  rRows = [];

  let  feedback = {};
  //create dict entry for every question;
  results[0].data.finalFeedback.scores.map(q=>feedback[q.question]={'values':[],'mean':0});

  results.map((participant) => {
    let id = participant.data.participantId;

    let createTidyRow = function (type,measure, value) {
      return {
        prolificId: id,
        type,
        measure,
        value,
      };
    };


    if ( participant.data.finalFeedback.scores){

      //check to see if all scores are the same; 
      let scoreCheck = participant.data.finalFeedback.scores.reduce((acc,cValue)=>{
        if (!acc.includes(cValue.score)){
          acc.push(cValue.score)
        } 
        return acc;     
      },[])

      // console.log(scoreCheck)
      if (scoreCheck.length>1){
        participant.data.finalFeedback.scores.map(q=>{
          feedback[q.question].values.push(q.score);
    
          rRows.push(
            createTidyRow('feedback',q.question, q.score)
          );
    
        })

      }else{
        console.log('participant ', participant.data.participantId, ' used all same scores',scoreCheck)
      }
  

    } else {

      console.log('no feedback scores for ', participant.data.participantId)
    }
   
    


    rRows.push(
      createTidyRow('demographics',"birthCountry", participant.data.demographics.country_birth)
    );
    rRows.push(
      createTidyRow('demographics',"employment", participant.data.demographics.employment)
    );
    rRows.push(
      createTidyRow('demographics',"nationality", participant.data.demographics.nationality)
    );
    rRows.push(createTidyRow('demographics',"sex", participant.data.demographics.sex));
    rRows.push(
      createTidyRow('demographics',"student", participant.data.demographics.student_status)
    );



    // rRows.push(createTidyRow("studyTime", participant.data.minutesOnTask)); //need to compute and add to file or compute here on the fly;

    rRows.push(createTidyRow('results',"averageAccuracy", participant.data.avgAcc));
  });

  Object.keys(feedback).map(key=>{    
    let values = feedback[key].values;
     feedback[key].mean = values.reduce((a,b) => a + b, 0)/values.length
  })
  // console.log(feedback)

  csvWriter
    .writeRecords(rRows)
    .then(() =>
      console.log("participantInfoTidyR.csv was written successfully")
    );

  rHeaders = [
    "prolificId",
    "taskId",
    "dataset",
    "taskPrompt",
    "taskDifficulty",
    "taskType",
    "userDriven",
    "group",
    "measure",
    "value",
  ];

  csvWriter = createCsvWriter({
    path: "results/" + mode + "/CSV/TidyR.csv",
    header: rHeaders.map((key) => {
      return { id: key, title: key };
    }),
  });

  rRows = [];

  let count = 0;
  // let excludeParticipants = 0;
  results.map((participantData) => {
    let id = participantData.data.participantId;
 if (participantData.data.keep){
  Object.keys(participantData.data.tasks).filter(taskId=>participantData.data.tasks[taskId].training !== 'yes').map((taskId) => {
    
    
    let taskInfo = participantData.data.tasks[taskId];

    if (taskInfo.group.includes('outlier_curve')){
      console.log('participant ', id , 'did a ', taskInfo.group , ' task')
    }

    // console.log(taskInfo.group)
    if (taskInfo.group.includes('medium_manual_outlier_cluster')){
      // console.log(taskInfo.group)
      // console.log(taskInfo)
      // console.log('accuracy is ', taskInfo.accuracy)
    }
   
    let createTidyRow = function (measure, value) {
      return {
        prolificId: id,
        taskId,
        dataset: taskInfo.dataset,
        taskPrompt: taskInfo.task,
        taskDifficulty: taskInfo.difficulty,
        taskType: taskInfo.type,
        userDriven: taskInfo["user-driven"],
        group: taskInfo.group.replace('_manual_','_').replace('_supported_','_'),
        measure,
        value,
      };
    };

 
    let timeOnTask = Date.parse(taskInfo.completedAt) - Date.parse(taskInfo.startedAt);
    //If mode is supported, only add data if they actually picked a selection; 
    let addRow = true;
    
    if (taskInfo['user-driven'] =="supported"){
      if (!taskInfo.interactionDetails.autoCompleteUsed){
        addRow = false;
        count = count +1;
      }  
    } 

    

    if (addRow){
      rRows.push(createTidyRow("accuracy", taskInfo.accuracy));
      rRows.push(createTidyRow("difficulty", taskInfo.user_difficulty));
      rRows.push(createTidyRow("confidence", taskInfo.user_confidence));
      rRows.push(createTidyRow("secondsOnTask", timeOnTask/1000));
    }
   

  });


 }

  });

  console.log('removed ' , results.reduce((acc,cValue)=>!cValue.data.keep ? acc + 1 : acc,0), ' participants')

  csvWriter
    .writeRecords(rRows)
    .then(() => console.log("TidyR.csv was written successfully"));
}
