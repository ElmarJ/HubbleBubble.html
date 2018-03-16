import { Hubble } from "./data.js";

// Client ID and API key from the Developer Console
const CLIENT_ID =
  "889012243145-4ov1voghuk72q9k4k32pseqcrc5gg02b.apps.googleusercontent.com";

// Array of API discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"
];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = "https://www.googleapis.com/auth/calendar";

const authorizeButton = document.getElementById("authorize-button");

document
  .getElementById("gapi-script")
  .addEventListener("load", () => gapi.load("client:auth2", initGoogleClient));

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
async function initGoogleClient() {
  await gapi.client.init({
    discoveryDocs: DISCOVERY_DOCS,
    clientId: CLIENT_ID,
    scope: SCOPES
  });

  // Listen for sign-in state changes.
  gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

  // Handle the initial sign-in state.
  updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
  // authorizeButton.onclick = handleAuthClick;
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    // authorizeButton.style.display = "none";
    showCurrentEvent();
    navigateToScheduledHubble();
  } else {
    // authorizeButton.style.display = "block";
  }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
}

function setupProgressIndiciator() {}

async function linkEventToHubble(
  hubble: Hubble,
  event: gapi.client.calendar.Event
) {
  event.extendedProperties.private["linked-bubble"] = hubble.hubbleKey;

  const response = await gapi.client.calendar.events.update({
    calendarId: "primary",
    eventId: event.id,
    resource: event
  });

  return response.result;
}

async function getLinkedEvents(hubble: Hubble) {
  const response = await gapi.client.calendar.events.list({
    calendarId: "primary",
    showDeleted: false,
    singleEvents: true,
    maxResults: 10,
    orderBy: "startTime",
    privateExtendedProperty: "linked-hubble-key=" + hubble.hubbleKey
  });
  return response.result.items;
}

export function getLinkedHubble(event: gapi.client.calendar.Event) {
  return new Hubble(event.extendedProperties.private["linked-hubble-key"]);
}

export async function getCurrentEvents() {
  if (!gapi.client || !gapi.client.calendar) {
    return null;
  }

  const now = new Date();
  const soon = new Date();
  soon.setMinutes(soon.getMinutes() + 1); // apparently, you don"t get current event if timeMax = timeMin;

  const response = await gapi.client.calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: soon.toISOString(),
    showDeleted: false,
    singleEvents: true,
    maxResults: 10,
    orderBy: "startTime"
  });

  return response.result.items;
}

function getFractionPassedOfEvent(event: gapi.client.calendar.Event) {
  var start = event.start.dateTime;
  var end = event.end.dateTime;

  if (!start) {
    start = event.start.date;
    end = event.end.date;
  }

  var startTime = new Date(start);
  var endTime = new Date(end);
  var now = new Date();

  return (
    (now.getTime() - startTime.getTime()) /
    (endTime.getTime() - startTime.getTime())
  );
}

async function createLinkedEvent(startsAt: Date, endsAt: Date, hubble: Hubble) {
  const eventData: any = {
    summary: await hubble.content.get(),
    start: { dateTime: startsAt.toISOString() },
    end: { dateTime: endsAt.toISOString() },
    extendedProperties: {
      private: {
        "linked-hubble-key": hubble.hubbleKey
      },
      shared: {}
    }
  };

  const response = await gapi.client.calendar.events.insert({
    calendarId: "primary",
    resource: eventData
  });

  return response.result;
}

export async function schedule(startsAt: Date, endsAt: Date, hubble: Hubble) {
  const event = await createLinkedEvent(startsAt, endsAt, hubble);
  // Todo: we should check whether this actually is now the first upcoming
  //    scheduled date.
  if (startsAt > new Date()) {
    hubble.scheduled.set(startsAt);
  }
}

/**
 * Print the summary and start datetime/date of the next ten events in
 * the authorized user"s calendar. If no events are found an
 * appropriate message is printed.
 */
async function showCurrentEvent() {
  var events = await getCurrentEvents();

  if (events.length > 0) {
    for (var i = 0; i < events.length; i++) {
      var event = events[i];
      var start = event.start.dateTime;
      var end = event.end.dateTime;
      if (!start) {
        start = event.start.date;
        end = event.end.date;
      }
      var startTime = new Date(start);
      var endTime = new Date(end);

      document.getElementById("current-event-name").innerHTML = event.summary;

      const startTimeElt = <HTMLTimeElement>document.getElementById(
        "current-event-start"
      );
      const endTimeElt = <HTMLTimeElement>document.getElementById(
        "current-event-end"
      );

      startTimeElt.innerHTML = startTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
      startTimeElt.dateTime = startTime.toISOString();

      endTimeElt.innerHTML = endTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
      endTimeElt.dateTime = endTime.toISOString();

      var c = <HTMLCanvasElement>document.getElementById("progress-indicator");
      var ctx = c.getContext("2d");
      ctx.strokeStyle = "#666";

      placeSliderPosition(startTime, endTime, ctx, c);
      window.setInterval(
        () => placeSliderPosition(startTime, endTime, ctx, c),
        1000
      );
    }
  } else {
    // no current event
  }
}

function placeSliderPosition(
  startTime: Date,
  endTime: Date,
  ctx: CanvasRenderingContext2D,
  c: HTMLCanvasElement
) {
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.lineTo(300, 5);
  ctx.stroke();
  const now = new Date();
  const pct =
    (now.getTime() - startTime.getTime()) /
    (endTime.getTime() - startTime.getTime());
  ctx.moveTo(pct * 300, 0);
  ctx.lineTo(pct * 300, 10);
  ctx.stroke();
}

async function navigateToScheduledHubble() {
  const currentEvents = await getCurrentEvents();
  if (currentEvents && currentEvents[0]) {
    const currentHubble = getLinkedHubble(currentEvents[0]);
    if (currentHubble) {
      window.location.hash = "#" + currentHubble.hubbleKey;
    }
  }
}
