var events = [
    {
        starttime: new Date("2017-10-10T14:30"),
        endtime: new Date("2017-10-10T15:30"),
        summary: "event 1"
    },
    {
        starttime: new Date("2017-10-11T14:30"),
        endtime: new Date("2017-10-11T15:30"),
        summary: "event 2"
    },
    {
        starttime: new Date("2017-10-10T17:30"),
        endtime: new Date("2017-10-10T19:30"),
        summary: "event 3"
    }
]

window.addEventListener("load", () => addEvents());


// Next steps:
// - use CSS grid for calendar view
// - base grid position of event on date (column) and time (rows)

function addEvents() {
    const calendarElement = document.getElementById("calendar");
    let i=1;
    for (let event of events) {
        const eventElement = document.createElement("li")
        eventElement.innerText = event.summary;
        eventElement.style.gridColumn = i++;
        eventElement.style.gridRow = event.starttime.getHours() * 2;
        eventElement.style.background = "#aaa";
        eventElement.style.background = "#aaa";
        calendarElement.appendChild(eventElement);
    }

    document.body.appendChild(calendarElement);
}