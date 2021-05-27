import firebase from "firebase/app";
import "firebase/auth";
import * as firebaseInit from "./init.js";
import { HubbleRenderer } from "./renderer.js";
import { Hubble } from "./data.js";
import * as Calendar from "./calendar.js";
var presenter = document.getElementById("hubblePresenter");

firebaseInit.firebaseInit();

window.onhashchange = function() {
  updatePresenter();
};

window.addEventListener("load", () => {
  // Initialize firebase

  // Load / save view-settings for this user:
  document.documentElement.setAttribute(
    "class",
    window.localStorage.getItem("viewerSettings")
  );
  document
    .getElementById("cardviewSwitch")
    .addEventListener("mousedown", () => toggleUISetting("hubbleCardView"));
  document
    .getElementById("inactiveVisibleSwitch")
    .addEventListener("mousedown", () => toggleUISetting("hideInactive"));
  document
    .getElementById("lightSwitch")
    .addEventListener("mousedown", () => toggleUISetting("nightMode"));
  document
    .getElementById("expandAllButton")
    .addEventListener("mousedown", () => expandAll());
  document
    .getElementById("bulletSwitch")
    .addEventListener("mousedown", () => toggleUISetting("noBulletView"));
  document
    .getElementById("fullscreenSwitch")
    .addEventListener("change", () => onFullscreenSwitch());
});
window.onblur = () =>
  window.localStorage.setItem(
    "viewerSettings",
    document.documentElement.getAttribute("class")
  );

var currentUid = "";

// Listen to change in auth state so it displays the correct UI for when
// the user is signed in or not.
firebase.auth().onAuthStateChanged(function(user) {
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
    const rootHubbleTemplate = <HTMLTemplateElement>document.getElementById(
      "hubbleListTemplate"
    );
    const childHubbleTemplate = <HTMLTemplateElement>document.getElementById(
      "hubbleListItemTemplate"
    );
    const rootRenderer = new HubbleRenderer(
      root,
      rootHubbleTemplate,
      childHubbleTemplate
    );
    presenter.appendChild(rootRenderer.element);
    await rootRenderer.renderOnVisible();
  }
}

async function getScopedHubble() {
  var key = window.location.hash.substr(1);

  if (key === null || key === "") {
    const currentEvents = await Calendar.getCurrentEvents();
    if (currentEvents) {
      const currentHubble = Calendar.getLinkedHubble(currentEvents[0]);
      if (currentHubble) {
        return currentHubble;
      }
    }
    return await Hubble.getRootHubble();
  }

  if (key.endsWith("_newchild")) {
    const parentKey = key.replace("_newchild", "");
    const parent = new Hubble(parentKey);

    const newChild = await Hubble.create();
    newChild.setParent(parent);

    window.location.hash = "#" + newChild.hubbleKey;
  }

  return new Hubble(key);
}

function toggleUISetting(setting: string) {
  document.documentElement.classList.toggle(setting);
}

function onFullscreenSwitch() {
  const fullscreenCheckBox = <HTMLInputElement>document.getElementById(
    "fullscreenSwitch"
  );

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
  const allCheckboxes = <NodeListOf<HTMLElement>>document.querySelectorAll(
    ".collapseToggle"
  );
  for (var checkBox of allCheckboxes) {
    (<HTMLInputElement>checkBox).checked = false;
  }
}


