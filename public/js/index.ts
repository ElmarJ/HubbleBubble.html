var presenter = document.getElementById("hubblePresenter");

window.onhashchange = function () {
  saveCurrentHubble();
  updatePresenter();
};

window.onunload = function () {
  saveCurrentHubble();
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

function saveCurrentHubble() {
  // Is this necessarry at all now we save after leaving each editable field?
  var contentelement = document.querySelectorAll("[contenteditable].content")[0];
  persistHubbleContentElement(<HTMLElement>contentelement);
}

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

function setCaretPosition() {
  var content_element = <HTMLElement>document.getElementsByClassName(
    "content"
  )[0];

  if (content_element !== null && content_element.contentEditable) {
    placeCaretAtEnd(content_element);
  }
}



function startUpdatingActivity(hubble: Hubble) {
  const element = getElementOf(hubble);
  const ref = hubble.ref.child("active");
  const updater = snapshot => element.dataset.active = String(snapshot.val());

  if (element) {
    ref.on("value", updater);
  } else {
    ref.off("value", updater)
  }
}


function getRootHubble(): Hubble {
  var key = window.location.hash.substr(1);
  if (key === null || key === "") {
    key = "-KlYdxmFkIiWOFXp0UIP";
  }
  return new Hubble(key);
}

function persistHubbleContentElement(contentElement: HTMLElement) {
  getScopedHubble(contentElement).content.set(contentElement.innerText);
}

async function navigateToNewChild() {
  const hubble = new Hubble();

  location.hash = hubble.hubbleKey;
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

function getScopedHubble(element: HTMLElement): Hubble {
  if (element.classList.contains("hubble")) {
    return new Hubble(element.dataset.key);
  }

  const hubbleElement = hubbleElementOf(element);
  return new Hubble(hubbleElement.dataset.key);
}

function addNewChild(childrenElement: HTMLElement, before?: HTMLElement) {
  const childHubbleTemplate = <HTMLTemplateElement>document.getElementById("hubbleListItemTemplate");
  const renderer = new HubbleRenderer(new Hubble(), childHubbleTemplate);

  if (before) {
    childrenElement.insertBefore(renderer.element, before);
  } else {
    childrenElement.appendChild(renderer.element);
  }
  renderer.renderOnVisible();

  return renderer.element;
}

function getElementOf(hubble: Hubble) {
  return <HTMLElement>document.querySelector(
    ".hubble[data-key=" + hubble.hubbleKey + "]"
  );
}

async function onEditorKeyPress(ev: KeyboardEvent) {
  if (ev.key === "Enter") {
    ev.preventDefault();
    
    const currentContentElement = <HTMLElement>ev.srcElement
    const hubbleElement = hubbleElementOf(currentContentElement);
    const childrenElement = hubbleElement.findAncestor("children");
    
    let newElement: HTMLElement;
    if (hubbleElement.nextElementSibling) {
      newElement = addNewChild(childrenElement, <HTMLElement>hubbleElement.nextElementSibling);
    } else {
      newElement = addNewChild(childrenElement);
    }

    const cursorPos = window.getSelection().anchorOffset;
    const currentContent = currentContentElement.textContent;
    const beforeCursor = currentContent.substr(0, cursorPos);
    const afterCursor = currentContent.substr(cursorPos, currentContent.length);

    currentContentElement.innerHTML = beforeCursor;
    newElement.querySelector(".content").innerHTML = afterCursor;
    
    setFocus(newElement);
  }
}

function keyDown(ev: KeyboardEvent) {
  if (ev.key === "Tab") {
    ev.preventDefault();
    moveHubbleElementInPrevious(hubbleElementOf(<HTMLElement>event.srcElement));
  }
}

function switchUISetting(event: Event) {
  const checkbox = <HTMLInputElement>event.srcElement;
  if (checkbox.checked) {
    document.documentElement.classList.add(checkbox.dataset.themeSwitch);
  }

  else {
    document.documentElement.classList.remove(checkbox.dataset.themeSwitch);
  }
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

function onCardviewSwitch() {
  const cardviewCheckBox = <HTMLInputElement>document.getElementById("cardviewSwitch");
  if (cardviewCheckBox.checked) {
    document.documentElement.classList.add("hubbleCardView");
    document.documentElement.classList.remove("hubbleListView");
  } else {
    document.documentElement.classList.add("hubbleListView");
    document.documentElement.classList.remove("hubbleCardView");
  }
}

function expandAll() {
  const allHubbles = <NodeListOf<HTMLElement>>document.querySelectorAll(".hubble");
  for (var hubbleElement of allHubbles) {
    hubbleElement.classList.remove("collapsed");
  }
}

function setFocus(hubbleElement: HTMLElement) {
  if (hubbleElement) {
    const contentElement = <HTMLElement>hubbleElement.querySelector("[contenteditable].content");
    contentElement.focus();
  } else {
    location.hash = hubbleElement.dataset.key;
  }
}

function collapseChange(ev: Event) {
  const collapseCheckbox = <HTMLInputElement>ev.srcElement;
  const hubbleElement = hubbleElementOf(collapseCheckbox);

  if (collapseCheckbox.checked) {
    hubbleElement.classList.add("collapsed");
  } else {
    hubbleElement.classList.remove("collapsed");
  }
}


function moveDown(event: Event) {
  event.preventDefault();
  moveHubbleElementDown(hubbleElementOf(<HTMLElement>event.srcElement));
}

function moveUp(event: Event) {
  event.preventDefault();
  moveHubbleElementUp(hubbleElementOf(<HTMLElement>event.srcElement));
}

function moveIn(event: Event) {
  event.preventDefault();
  moveHubbleElementInPrevious(hubbleElementOf(<HTMLElement>event.srcElement));
}

function hubbleElementOf(element: HTMLElement) {
  return element.findAncestor("hubble");
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
  while (!element.classList.contains(className) && (element = element.parentElement)) {}
  return element;
}

