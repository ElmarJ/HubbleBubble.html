var presenter = document.getElementById("hubblePresenter");

window.onhashchange = function () {
  updatePresenter();
};

// Load / save view-settings for this user:
window.onload = () => document.documentElement.setAttribute("class", window.localStorage.getItem("viewerSettings"));
window.onblur = () => window.localStorage.setItem("viewerSettings", document.documentElement.getAttribute("class"));

var currentUid = "";

// Listen to change in auth state so it displays the correct UI for when
// the user is signed in or not.
firebase.auth().onAuthStateChanged(function (user) {
  // The observer is also triggered when the user's token has expired and is
  // automatically refreshed. In that case, the user hasn't changed so we should
  // not update the UI.
  if (user && user.uid === currentUid) {
    return;
  }

  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  currentUid = user.uid;

  updatePresenter();
});

async function updatePresenter() {
  if (firebase.auth().currentUser !== null) {
    presenter.innerHTML = "";
    const root = await getScopedHubble();
    const rootHubbleTemplate = <HTMLTemplateElement>document.getElementById("hubbleListTemplate");;
    const childHubbleTemplate = <HTMLTemplateElement>document.getElementById("hubbleListItemTemplate");
    const rootRenderer = new HubbleRenderer(root, rootHubbleTemplate, childHubbleTemplate);
    presenter.appendChild(rootRenderer.element);
    await rootRenderer.renderOnVisible();
  }
}

async function getScopedHubble() {
  var key = window.location.hash.substr(1);
  if (key === null || key === "") {
    const currentEvents = await getCurrentEvents();
    if (currentEvents){
      const currentHubble = getLinkedHubble(currentEvents[0]);
      if (currentHubble) {
        return currentHubble;
      }
    }
    return await Hubble.getRootHubble();
  }
  return new Hubble(key);
}

async function navigateToScheduledHubble() {
  const currentEvents = await getCurrentEvents();
  if (currentEvents && currentEvents[0]){
    const currentHubble = getLinkedHubble(currentEvents[0]);
    if (currentHubble) {
      window.location.hash = "#" + currentHubble.hubbleKey;
    }
  }
}

// TODO: switch to this for reordering: https://github.com/RubaXa/Sortable/issues/1008
function check_card_drop(ev: DragEvent) {
  ev.preventDefault();
  var elt = <HTMLElement>ev.srcElement;
  if (!elt.classList.contains("hubble")) {
    elt = findElementAncestor(elt, "hubble");
  }
  addDropTargets(elt);
  for(const e of document.querySelectorAll(".dragover")) {
    if (e !== elt) {
      e.classList.remove("dragover");
    }
  }
  elt.classList.add("dragover");
}

function addDropTargets(elt: HTMLElement) {
  if(!dropTargetBeforeElt) {
    dropTargetBeforeElt = generateNewDropTarget();
  }
  if(!dropTargetAfterElt) {
    dropTargetAfterElt = generateNewDropTarget();
  }

  elt.parentElement.insertBefore(dropTargetBeforeElt, elt);
  elt.parentElement.insertBefore(dropTargetAfterElt, elt.nextElementSibling);
}

function generateNewDropTarget() {
  const elt = document.createElement("li");
  elt.classList.add("dropTarget");

  elt.addEventListener("drop", (event) => {
    const sourceKey = event.dataTransfer.getData("text/plain");
    const sourceHubbleElement = <HTMLElement>document.querySelector(`[data-key=${sourceKey}].hubble`);
    elt.parentElement.insertBefore(sourceHubbleElement, elt);
    removeDropTargets();
  });

  elt.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  useDragoverClass(elt);

  return elt;
}

function useDragoverClass(elt: HTMLElement) {
  elt.addEventListener("dragenter", event => {
    elt.classList.add("dragOver");
  });
  elt.addEventListener("dragleave", event => {
    elt.classList.remove("dragOver");
  });
}

function removeDropTargets() {
  if(dropTargetAfterElt) {
    dropTargetAfterElt.remove();
  }

  if(dropTargetBeforeElt) {
    dropTargetBeforeElt.remove();
  }
}

var dropTargetBeforeElt: HTMLElement;
var dropTargetAfterElt: HTMLElement;


function card_drop(ev: DragEvent) {
  ev.preventDefault();

  removeDropTargets();
  // move me into the children-element of the element I was dropped on:
  const sourceKey = ev.dataTransfer.getData("text/plain");
  const sourceHubbleElement = <HTMLElement>document.querySelector(`[data-key=${sourceKey}].hubble`);
  const destinationHubbleElement = findElementAncestor(<HTMLElement>ev.target, "hubble");
  const destinationChildrenElement = destinationHubbleElement.querySelector(".children");
  destinationChildrenElement.appendChild(sourceHubbleElement);
}

function card_drag(ev: DragEvent) {
  const sourceHubbleKey = (<HTMLElement>ev.target).dataset.key;
  ev.dataTransfer.setData("text/plain", sourceHubbleKey);
}



function toggleUISetting(setting: string) {
  document.documentElement.classList.toggle(setting);
}

function onFullscreenSwitch() {
  const fullscreenCheckBox = <HTMLInputElement>document.getElementById("fullscreenSwitch");

  if (fullscreenCheckBox.checked) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozExitFullScreen) {
      document.mozExitFullScreen();
    }
  }
}

function expandAll() {
  const allCheckboxes = <NodeListOf<HTMLElement>>document.querySelectorAll(".collapseToggle");
  for (var checkBox of allCheckboxes) {
    (<HTMLInputElement>checkBox).checked = false;
  }
}

function onHubbleDragEnd() {
  removeDropTargets();
}


function launchOneDrivePicker() {
  var odOptions = {
   /*
    * Required. Provide the AppId for a registered application. Register an
    * app on https://apps.dev.microsoft.com
    */
    clientId: "5edfe457-c20b-4ad4-ba94-ea609bd21aa3",
    action: "share",
    multiSelect: false,
    advanced: {},
    success: function (response) { 
      const urlBox = <HTMLInputElement>document.getElementById("urlBox");
      const urlNameElt = <HTMLInputElement>document.getElementById("urlNameBox");
      urlBox.value = response.value[0].webUrl;
      urlNameElt.value = response.value[0].name;
     },
    cancel: function () { console.log("oh"); },
    error: function (e) { console.log("oops"); }
  }
  OneDrive.open(odOptions);
}

function startAddLinkUI(event: MouseEvent) {
  const dialog = <any>document.getElementById("addExternalLinkDialog");
  const childrenElt = findElementAncestor(<HTMLElement>event.srcElement,"hubble").querySelector(".children");

  dialog.showModal();
  dialog.addEventListener('close', async function (event) {
    if (dialog.returnValue === 'confirm') {
      const urlElt = <HTMLInputElement>document.getElementById("urlBox");
      const urlNameElt = <HTMLInputElement>document.getElementById("urlNameBox");

      const hubble = new Hubble();
      await hubble.url.setString(urlElt.value);
      await hubble.content.setString(urlNameElt.value);

      const renderer = new HubbleRenderer(hubble, <HTMLTemplateElement>document.getElementById("hubbleListItemTemplate"));
      childrenElt.appendChild(renderer.element);
      renderer.renderOnParentVisible();
   }
 });
}

function startScheduleUI(event: MouseEvent) {
  const dialog = <any>document.getElementById("scheduleDialog");
  const hubbleElt = findElementAncestor(<HTMLElement>event.currentTarget,"hubble");
  const hubble = new Hubble(hubbleElt.dataset.key);

  const startTimeElt = <HTMLInputElement>document.getElementById("startTimeSelector");
  const endTimeElt = <HTMLInputElement>document.getElementById("endTimeSelector");
  
  dialog.showModal();
  dialog.addEventListener("close", async (event) => {
    schedule(new Date(startTimeElt.value), new Date(endTimeElt.value), hubble);
  });
}

                
                /**
                 * Print the summary and start datetime/date of the next ten events in
                 * the authorized user's calendar. If no events are found an
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
          
                            const startTimeElt = <HTMLTimeElement>document.getElementById("current-event-start");
                            const endTimeElt = <HTMLTimeElement>document.getElementById("current-event-end");
                            
                            startTimeElt.innerHTML = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            startTimeElt.dateTime = startTime.toISOString();
          
                            endTimeElt.innerHTML = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            endTimeElt.dateTime = endTime.toISOString();
                            
                            var c = <HTMLCanvasElement>document.getElementById("progress-indicator");
                            var ctx = c.getContext("2d");
                            ctx.strokeStyle = "#666";
          
                            placeSliderPosition(startTime, endTime, ctx, c);
                            window.setInterval(() => placeSliderPosition(startTime, endTime, ctx, c), 1000);
                        }
                    } else { // no current event
                    }
             }
        
             
        function placeSliderPosition(startTime: Date, endTime: Date, ctx: CanvasRenderingContext2D, c: HTMLCanvasElement) {
            ctx.clearRect(0, 0, c.width, c.height);
            ctx.beginPath();
            ctx.moveTo(0, 5);
            ctx.lineTo(300, 5);
            ctx.stroke();
            const now = new Date();
            const pct = (now.getTime() - startTime.getTime()) / (endTime.getTime() - startTime.getTime())
            ctx.moveTo(pct * 300, 0);
            ctx.lineTo(pct * 300, 10);
            ctx.stroke();
          }
          
