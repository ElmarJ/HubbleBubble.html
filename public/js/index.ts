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
      window.location.href ="/login.html";
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
    await renderHubble(getRootConnection(), getCurrentTemplate(), presenter);
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

async function renderHubble(
  hubble: Hubble,
  template: HTMLTemplateElement,
  containerElement: HTMLElement
) {
  const data = await hubble.getHubbleData();
  const templatedNode = <DocumentFragment>document.importNode(
    template.content,
    true
  );

  const hubbleElement = <HTMLElement>templatedNode.querySelector(".hubble");
  hubbleElement.dataset.key = data.key;
  hubbleElement.dataset.active = String(data.active);
  hubbleElement.dataset.activeChildren = String(data.activechildren);
  // add content:
  const contentElements = <NodeListOf<HTMLElement>>templatedNode.querySelectorAll(".content");

  for (var contentElement of contentElements) {
    contentElement.innerText = data.content;
    if(contentElement.contentEditable) {
      contentElement.onblur = () => persistHubbleContentElement(contentElement);
    }
  }

  const linkElements = <NodeListOf<HTMLLinkElement>>templatedNode.querySelectorAll(".hubblelink");
  for (var linkElement of linkElements) { linkElement.href = "#" + data.key };

  const parentLinkElements = <NodeListOf<HTMLLinkElement>>templatedNode.querySelectorAll(".parentlink");
  for (var parentLinkElement of parentLinkElements) {parentLinkElement.href =  "#" + data.parent;}

  const childCountElement = <HTMLElement>templatedNode.querySelector(".child-count");
  if (childCountElement !== null) childCountElement.innerText = String(data.activechildren);

  const parentNode = <HTMLElement>templatedNode.querySelector(".parentcontent");
  if (parentNode !== null) parentNode.dataset.key = data.parent;

  // set done toggle:
  const doneElement = <HTMLInputElement>templatedNode.querySelector(".doneToggle");
  if (doneElement !== null) {
    registerToggle(doneElement, data.done, ev => getScopedHubble(<HTMLInputElement>ev.srcElement).done.set((<HTMLInputElement>ev.srcElement).checked));
  }

  // set snooze toggle:
  const snoozeElement = <HTMLInputElement>templatedNode.querySelector(".snoozeToggle");
  if (snoozeElement !== null) {
    registerToggle(snoozeElement, data.snoozed, ev => getScopedHubble(<HTMLInputElement>ev.srcElement).snoozed.set((<HTMLInputElement>ev.srcElement).checked));
  }

  // add children based on child template:
  const childrenElement = <HTMLElement>templatedNode.querySelector(".children");
  if (childrenElement !== null) {
    renderChildrenWhenVisible(childrenElement, hubble);
    }

  // add rendered hubble to container:
  containerElement.appendChild(templatedNode);
}

async function renderChildren(childrenElement: HTMLElement, hubble: Hubble) {
    var childTemplate = <HTMLTemplateElement>document.getElementById(childrenElement.dataset.childtemplate);
    childrenElement.dataset.rendered = "true"; //strictly speaking, it's not yet rendered, but it will be soon (and we don't want it to be rendered more than once)
    const childHubbles = await hubble.children.getHubbleArray();
    for (var child of childHubbles) {
      renderHubble(child, childTemplate, childrenElement);
    }
}

async function renderChildrenWhenVisible(childrenElement: HTMLElement, hubble: Hubble) {
  respondToVisibility(childrenElement, visible => {
    if(visible && !childrenElement.dataset.rendered) {
      renderChildren(childrenElement, hubble);
    }
  })

}

function getRootConnection(): Hubble {
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
  const hubble = await getRootConnection().children.addnew();
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
    source.move(destination);
    updatePresenter();
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
  if(element.classList.contains("hubble")) {
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

async function addNewChild(parentHubble: Hubble) {
  const childHubble = await parentHubble.children.addnew();
  const childrenElement = <HTMLElement>getElementOf(parentHubble).getElementsByClassName("children")[0];
  if (childrenElement) {
    const childTemplate = <HTMLTemplateElement>document.getElementById(childrenElement.dataset.childtemplate);
    await renderHubble(childHubble, childTemplate, childrenElement);
    setFocus(childHubble);
  } else {
    setFocus(childHubble);
  }
}

function getElementOf(hubble: Hubble) {
  return <HTMLElement>document.querySelector(
    ".hubble[data-key=" + hubble.hubbleKey + "]"
  );
}

async function onEditorKeyPress(ev: KeyboardEvent) {
  if (ev.key == "Enter") {
    ev.preventDefault();
    const hubble = getScopedHubble(hubbleElementOf(<HTMLElement>ev.srcElement).parentElement);
    addNewChild(hubble);
  }
}

function keyDown(ev: KeyboardEvent) {
  if (ev.key == "Tab") {
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
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    else if (document.documentElement.webkitRequestFullscreen) document.documentElement.webkitRequestFullscreen();
    else if (document.documentElement.mozRequestFullScreen) document.documentElement.mozRequestFullScreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozExitFullScreen) document.mozExitFullScreen();
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
    document.documentElement.classList.remove("hubbleCardView")  ;  
  }
}

function expandAll() {
  const allHubbles = <NodeListOf<HTMLElement>>document.querySelectorAll(".hubble");
  for (var hubbleElement of allHubbles) {
    hubbleElement.classList.remove("collapsed");
  }
}

function getCurrentTemplate() {
  var templatename = "hubbleListTemplate";
  return <HTMLTemplateElement>document.getElementById(templatename);
}

function setFocus(hubble: Hubble) {
  const hubbleElement = <HTMLElement>getElementOf(hubble);
  if (hubbleElement) {
    const contentElement = <HTMLElement>hubbleElement.getElementsByClassName("content")[0];
    if (contentElement.contentEditable) {
      contentElement.focus();
    } else {
      location.hash = hubble.hubbleKey;
    }
  } else {
    location.hash = hubble.hubbleKey;
  }
}

function newHubbleLinkClick(ev: MouseEvent) {
  ev.preventDefault();
  const hubble = getScopedHubble(<HTMLElement>ev.srcElement);
  addNewChild(hubble);
}

function collapseChange(ev:Event) {
    const collapseCheckbox = <HTMLInputElement>ev.srcElement;
    const hubbleElement = hubbleElementOf(collapseCheckbox);

    if(collapseCheckbox.checked) {
      hubbleElement.classList.add("collapsed");
    } else {
      hubbleElement.classList.remove("collapsed");      
    }
}

function respondToVisibility(element: HTMLElement, callback: (visbility: boolean) => void) {
    var options : IntersectionObserverInit = {
      root: document.documentElement
    }

    var observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            callback(entry.intersectionRatio > 0);
        });
    }, options);

    observer.observe(element);
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
  return findAncestor(element, "hubble");
}

function moveHubbleElementDown(element: HTMLElement) {
  if(element.nextElementSibling){
    element.parentElement.insertBefore(element, element.nextElementSibling.nextElementSibling);
    storeChildlist(hubbleElementOf(element.parentElement));
  }
}

function moveHubbleElementUp (element: HTMLElement) {
  if(element.previousElementSibling){
    element.parentElement.insertBefore(element, element.previousElementSibling);

    storeChildlist(hubbleElementOf(element.parentElement));
  }
}

function moveHubbleElementInPrevious(element: HTMLElement) {
  const newParent = <HTMLElement>element.previousElementSibling;
  const oldChildrenElement = element.parentElement;
  const newChildrenElement = getChildrenElement(newParent);
  const oldParent = hubbleElementOf(oldChildrenElement);

  if(newChildrenElement && !newParent.classList.contains("collapsed") && (newChildrenElement.dataset.rendered == "true")) {
    newChildrenElement.appendChild(element);

    storeChildlist(oldParent);
    storeChildlist(newParent);
    storeParent(element);
  }
}

async function storeChildlist(hubbleElement: HTMLElement) {
  const childrenElement = getChildrenElement(hubbleElement);
  const hubble = new Hubble(hubbleElement.dataset.key)

  var childrenArray = [];
  var childelement = <HTMLElement>childrenElement.firstElementChild;

  while (childelement) {
    if(!childelement.classList.contains("special-children")) {
      childrenArray.push(childelement.dataset.key);
    }
    childelement = <HTMLElement>childelement.nextElementSibling;
  }

  await hubble.children.set(childrenArray);
}

function storeParent(hubbleElement: HTMLElement) {
  const hubble = getScopedHubble(hubbleElement);
  const parentHubble = getScopedHubble(hubbleElement.parentElement);

  hubble.parent.set(parentHubble.hubbleKey);
}

async function renderSiblingsOf(hubble: Hubble) {
  const parent = await hubble.parent.getHubble();
  await renderChildrenOf(parent);
}

function renderChildrenOf(hubble: Hubble) {
  const childrenElement = getChildrenElement(getElementOf(hubble));
  renderChildren(childrenElement, hubble);
}

function getChildrenElement(element: HTMLElement) {
    return <HTMLElement>element.querySelector(".children");
}

function findAncestor (element: HTMLElement, className: string) {
    while ((element = element.parentElement) && !element.classList.contains(className));
    return element;
}