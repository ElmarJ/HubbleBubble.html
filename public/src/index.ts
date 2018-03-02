import { findElementAncestor } from "./helpers.js";
import { HubbleRenderer } from "./renderer.js";
import { Hubble } from "./data.js";
import * as Calendar from "./calendar.js";


var presenter = document.getElementById("hubblePresenter");

window.onhashchange = function() {
  updatePresenter();
};

window.addEventListener("load", () => {
  firebase.initializeApp({
    "apiKey": "AIzaSyA7zawVhVUXXzD5XKVSMBkqunjEI-Mp5Ek",
    "databaseURL": "https://hubblebubble-58ec9.firebaseio.com",
    "storageBucket": "hubblebubble-58ec9.appspot.com",
    "authDomain": "hubblebubble-58ec9.firebaseapp.com",
    "messagingSenderId": "889012243145",
    "projectId": "hubblebubble-58ec9"
  });

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
    success: function(response) {
      const urlBox = <HTMLInputElement>document.getElementById("urlBox");
      const urlNameElt = <HTMLInputElement>document.getElementById(
        "urlNameBox"
      );
      urlBox.value = response.value[0].webUrl;
      urlNameElt.value = response.value[0].name;
    },
    cancel: function() {
      console.log("oh");
    },
    error: function(e) {
      console.log("oops");
    }
  };
  OneDrive.open(odOptions);
}
