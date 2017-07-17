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

  const sourceKey = ev.dataTransfer.getData("text/plain");
  const source = new Hubble(sourceKey);
  const destination = getScopedHubble(<HTMLElement>ev.target);

  if (source.hubbleKey !== destination.hubbleKey) {
    move(source, destination);
  }
}

function card_drag(ev: DragEvent) {
  const source = getScopedHubble(<HTMLElement>ev.target);
  ev.dataTransfer.setData("text/plain", source.hubbleKey);
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

function registerToggle(
  element: HTMLInputElement,
  initialValue: boolean,
  onchange: (this: HTMLElement, ev: Event) => any
) {
  if (element !== null) {
    element.checked = initialValue;
    element.onchange = onchange;
  }
}

async function addNewChild(parentHubble: Hubble, before?: Hubble) {
  const parentElement = <HTMLElement>getElementOf(parentHubble)
  const childrenElement = parentElement.getElementsByClassName("children")[0];
  const hubble = new Hubble();
  if (childrenElement) {
    const hubbleElement = getNewHubbleElement(hubble, "hubbleListItemTemplate");

    if(before) {
      const beforeElement = getElementOf(before);
      childrenElement.insertBefore(hubbleElement, beforeElement);
    } else {
      childrenElement.appendChild(hubbleElement);
    }

    setFocus(hubbleElement);

    await hubbleElement.renderHubble();
    parentElement.persistHubbleChildlist();
  }
}

function getElementOf(hubble: Hubble) {
  return <HTMLElement>document.querySelector(
    ".hubble[data-key=" + hubble.hubbleKey + "]"
  );
}

async function onEditorKeyPress(ev: KeyboardEvent) {
  if (ev.key === "Enter") {
    ev.preventDefault();
    const hubbleElement = hubbleElementOf(<HTMLElement>ev.srcElement)
    const parentHubble = getScopedHubble(hubbleElement.parentElement);
    if (hubbleElement.nextElementSibling) {
      const beforeHubble = getScopedHubble(<HTMLElement>hubbleElement.nextElementSibling);
      addNewChild(parentHubble, beforeHubble);
    } else {
      addNewChild(parentHubble);
    }
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
    } else if(document.documentElement.webkitRequestFullscreen) {
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
  //  presenter.innerHTML = "";
  //  renderHubble(getRootConnection(), getCurrentTemplate(), presenter);

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

function newHubbleLinkClick(ev: MouseEvent) {
  ev.preventDefault();
  const hubble = getScopedHubble(<HTMLElement>ev.srcElement);
  addNewChild(hubble);
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

function move(target: Hubble, destination: Hubble) {
  const targetElement = getElementOf(target);
  const targetParentElement = targetElement.getParentHubbleElement();
  const destinationElement = getElementOf(destination);
  const destinationChildrenElement = destinationElement.getHubbleChildrenElement();

  destinationChildrenElement.appendChild(targetElement);
  destinationElement.persistHubbleChildlist();
  targetParentElement.persistHubbleChildlist();
}

function moveHubbleElementDown(element: HTMLElement) {
  if (element.nextElementSibling) {
    element.parentElement.insertBefore(element, element.nextElementSibling.nextElementSibling);
    hubbleElementOf(element.parentElement).persistHubbleChildlist();
  }
}

function moveHubbleElementUp(element: HTMLElement) {
  if (element.previousElementSibling) {
    element.parentElement.insertBefore(element, element.previousElementSibling);

    hubbleElementOf(element.parentElement).persistHubbleChildlist();
  }
}

function moveHubbleElementInPrevious(element: HTMLElement) {
  const newParent = <HTMLElement>element.previousElementSibling;
  const oldChildrenElement = element.parentElement;
  const newChildrenElement = newParent.getHubbleChildrenElement();
  const oldParent = hubbleElementOf(oldChildrenElement);

  if (newChildrenElement && !newParent.classList.contains("collapsed") && (newChildrenElement.dataset.rendered === "true")) {
    newChildrenElement.appendChild(element);

    oldParent.persistHubbleChildlist();
    oldParent.persistHubbleChildlist();
    element.persistHubbleParent();
  }
}



interface HTMLElement {
  hubble: Hubble;
  renderedHubble: boolean;
  renderHubble: () => Promise<void>;
  renderChildren: () => Promise<void>;
  getHubbleElement: () => HTMLElement;
  getParentHubbleElement: () => HTMLElement;
  getHubbleChildrenElement: () => HTMLElement;
  renderHubbleOnVisible: () => void;
  findAncestor: (className: string) => HTMLElement;
  respondToVisibility: (callback: (visibility: boolean) => void) => void;
  persistHubbleParent: () => Promise<void>;
  persistHubbleChildlist: () => Promise<void>;
}

HTMLElement.prototype.persistHubbleParent = () => {
  const hubble = getScopedHubble(this);
  const parentHubble = getScopedHubble(this.parentElement);

  return hubble.parent.set(parentHubble.hubbleKey);
}


HTMLElement.prototype.persistHubbleChildlist = async function () {
  const childrenElement = this.getHubbleChildrenElement();
  const hubble = new Hubble(this.dataset.key)

  var childrenArray = [];
  var childelement = <HTMLElement>childrenElement.firstElementChild;

  while (childelement) {
    if (!childelement.classList.contains("special-children")) {
      childrenArray.push(childelement.dataset.key);
    }
    childelement = <HTMLElement>childelement.nextElementSibling;
  }

  await hubble.children.set(childrenArray);
}

HTMLElement.prototype.respondToVisibility = function(callback) {
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
  while ((element = element.parentElement) && !element.classList.contains(className)) {}
  return element;
}

