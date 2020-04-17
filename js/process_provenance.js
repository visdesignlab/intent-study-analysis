console.log("running node script");
("use strict");

const fs = require("fs");

(async function() {
  let mode = process.argv[2];
  console.log("mode is ", mode);
  // switch (mode) {
  //   case "provenance":
  //     processProvenance();
  //     break;
  // }

  processProvenance(mode);
})();




//function to create events on a per participant basis;
function processProvenance(mode) {
  let rawdata;
  rawdata = fs.readFileSync("results/events.json");
  let eventTypes = JSON.parse(rawdata);

  rawdata = fs.readFileSync("results/"+ mode + "/JSON/study_results.json");
  let results = JSON.parse(rawdata);


  rawdata = fs.readFileSync("results/" + mode + "/JSON/study_provenance.json");
  let provenance = JSON.parse(rawdata);

  //create events objects per participant;
  let events = [];

  provenance.map(participant => {
    // console.log(participant)
    participantEventArray = [];

    let r = results.find(r => r.data.participantId === participant.id);
    r.data.browsedAwayTime = 0;

    // let p = study_participants.find(p => p.id === participant.id);
// console.log(eventTypes)
    participant.data.map(action => {

      //modify task labels; 
      if (action.label.includes('Start task')){
        action.label = 'Start task'
      };
      if (action.label.includes('Complete task')){
        action.label = 'Complete task'
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
        console.log('never here')
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
            .filter(e => {
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

            if (startObj.label == 'Task'){
              startObj.task.result= r.data[startObj.task.id]
            }
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
    // p.data.minutesOnTask = r.data.overallMinutesOnTask;

    events.push({ id: participant.id, provEvents: participantEventArray });
    // console.log(participantEventArray.filter(e=>e.type === 'longAction' && e.endTime === undefined))
  });

  // console.log(events)
  fs.writeFileSync(
    "results/"+mode+"/JSON/provenance_events.json",
    JSON.stringify(events)
  );
  console.log("exported provenance_events.json");

  // console.log(events)
  fs.writeFileSync(
    "results/"+mode+"/JSON/provenance_processed_results.json",
    JSON.stringify(results)
  );
  console.log("exported provenance_processed_results.json");

}