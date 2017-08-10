var presenter = document.getElementById("hubblePresenter");

window.onhashchange = function () {
  updatePresenter();
};

currentUid = "";

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
    const root = getRootHubble();
    const rootHubbleTemplate = <HTMLTemplateElement>document.getElementById("hubbleListTemplate");;
    const childHubbleTemplate = <HTMLTemplateElement>document.getElementById("hubbleListItemTemplate");
    const rootRenderer = new HubbleRenderer(root, rootHubbleTemplate, childHubbleTemplate);
    presenter.appendChild(rootRenderer.element);
    await rootRenderer.renderOnVisible();
  }
}

function getRootHubble(): Hubble {
  var key = window.location.hash.substr(1);
  if (key === null || key === "") {
    key = "-KlYdxmFkIiWOFXp0UIP";
  }
  return new Hubble(key);
}

// TODO: switch to this for reordering: https://github.com/RubaXa/Sortable/issues/1008
function check_card_drop(ev: DragEvent) {
  ev.preventDefault();
}

function card_drop(ev: DragEvent) {
  ev.preventDefault();

  // move me into the children-element of the element I was dropped on:
  const sourceKey = ev.dataTransfer.getData("text/plain");
  const sourceHubbleElement = <HTMLElement>document.querySelector(`[data-key=${sourceKey}].hubble`);
  const destinationHubbleElement = (<HTMLElement>ev.target).findAncestor("hubble");
  const destinationChildrenElement = destinationHubbleElement.querySelector(".children");
  destinationChildrenElement.appendChild(sourceHubbleElement);
}

function card_drag(ev: DragEvent) {
  const sourceHubbleKey = (<HTMLElement>ev.target).dataset.key;
  ev.dataTransfer.setData("text/plain", sourceHubbleKey);
}

function placeCaretAtEnd(el: HTMLElement) {
  el.focus();
  var range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  var sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function addNewChild(childrenElement: HTMLElement, before?: HTMLElement) {
  const childHubbleTemplate = <HTMLTemplateElement>document.getElementById("hubbleListItemTemplate");
  const renderer = new HubbleRenderer(new Hubble(), childHubbleTemplate);

  if (before) {
    childrenElement.insertBefore(renderer.element, before);
  } else {
    childrenElement.appendChild(renderer.element);
  }
  renderer.renderOnParentVisible();

  return renderer;
}

async function onEditorKeyPress(ev: KeyboardEvent) {
  const hubbleEl = (<HTMLElement>event.srcElement).findAncestor("hubble");

  if (ev.key === "Enter") {
    ev.preventDefault();

    const currentContentEl = <HTMLElement>ev.srcElement
    const childrenEl = hubbleEl.findAncestor("children");
    const renderer = addNewChild(childrenEl, <HTMLElement>hubbleEl.nextElementSibling);

    // SPlit the text of the current Hubble in the part before and the part after the cursor:
    const cursorPos = window.getSelection().anchorOffset;
    const beforeCursor = currentContentEl.textContent.substr(0, cursorPos);
    const afterCursor = currentContentEl.textContent.substr(cursorPos, currentContentEl.textContent.length);

    // Before the cursor remains in the current hubble:
    currentContentEl.innerHTML = beforeCursor;

    // After the cursor goes into the new hubble:
    renderer.element.querySelector(".content").innerHTML = afterCursor;

    setFocus(renderer.element);
  }
}

function keyDown(ev: KeyboardEvent) {
  const hubbleEl = (<HTMLElement>event.srcElement).findAncestor("hubble");

  if (ev.key === "Tab") {
    ev.preventDefault();
  }

  // Ctrl + key:
  if (ev.ctrlKey && !ev.altKey && !ev.shiftKey) {
    switch (ev.key) {
      case "ArrowDown":
        ev.preventDefault();
        setFocus(<HTMLElement>hubbleEl.nextElementSibling);
        break;
      case "ArrowUp":
        ev.preventDefault();
        setFocus(<HTMLElement>hubbleEl.previousElementSibling);
        break;
      case "ArrowLeft":
        ev.preventDefault();
        setFocus(hubbleEl.parentElement.findAncestor("hubble"));
        break;
      case "ArrowRight":
        ev.preventDefault();
        setFocus(<HTMLElement>hubbleEl.querySelector(".children").firstElementChild);
        break;
      case " ":
        ev.preventDefault();
        (<HTMLInputElement>hubbleEl.querySelector(".collapseToggle")).checked = !(<HTMLInputElement>hubbleEl.querySelector(".collapseToggle")).checked;
      default:
        break;
    }
  }

  // ctrl + alt + key:
  if (ev.ctrlKey && ev.altKey && !ev.shiftKey) {
    switch (ev.key) {
      case "ArrowDown":
        ev.preventDefault();
        moveHubbleElementDown(hubbleEl);
        break;
      case "ArrowUp":
        ev.preventDefault();
        moveHubbleElementUp(hubbleEl);
        break;
      case "ArrowLeft":
        ev.preventDefault();
        moveHubbleElementAfterParent(hubbleEl);
        break;
      case "ArrowRight":
        ev.preventDefault();
        moveHubbleElementInPrevious(hubbleEl);
        break;
      default:
        break;
    }

    setFocus(hubbleEl);
  }
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

function setFocus(hubbleEl: HTMLElement) {
  if (hubbleEl) {
    makeVisible(<HTMLElement>hubbleEl)
    const contentEl = <HTMLElement>hubbleEl.querySelector("[contenteditable].content");
    contentEl.focus();
  }
}

function makeVisible(hubbleEl: HTMLElement) {
  if (hubbleEl.offsetParent === null) {
    const parentHubbleEl = hubbleEl.parentElement.findAncestor("hubble")
    const checkBox = <HTMLInputElement>parentHubbleEl.querySelector(".collapseToggle");
    makeVisible(parentHubbleEl);
    checkBox.checked = false;
  }
}

function moveHubbleElementDown(element: HTMLElement) {
  if (element.nextElementSibling) {
    element.parentElement.insertBefore(element, element.nextElementSibling.nextElementSibling);
  }
}

function moveHubbleElementUp(element: HTMLElement) {
  if (element.previousElementSibling) {
    element.parentElement.insertBefore(element, element.previousElementSibling);
  }
}

function moveHubbleElementInPrevious(element: HTMLElement) {
  const newParent = <HTMLElement>element.previousElementSibling;
  const newChildrenElement = <HTMLElement>newParent.querySelector(".children");
  newChildrenElement.appendChild(element);
}

function moveHubbleElementAfterParent(element: HTMLElement) {
  const currentParentElement = element.parentElement.findAncestor("hubble");
  currentParentElement.parentElement.insertBefore(element, currentParentElement.nextElementSibling);
}

interface HTMLElement {
  findAncestor: (className: string) => HTMLElement;
  respondToVisibility: (callback: (visibility: boolean) => void) => void;
}

HTMLElement.prototype.respondToVisibility = function (callback) {
  var options: IntersectionObserverInit = {
    root: document.documentElement
  }

  var observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      callback(entry.intersectionRatio > 0);
    });
  }, options);

  observer.observe(this);
}

HTMLElement.prototype.findAncestor = function (className: string) {
  var element = this;
  while (!element.classList.contains(className) && (element = element.parentElement)) { }
  return element;
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
  const dialog = <any>document.getElementById("dialog");
  const childrenElt = (<HTMLElement>event.srcElement).findAncestor("hubble").querySelector(".children");

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

