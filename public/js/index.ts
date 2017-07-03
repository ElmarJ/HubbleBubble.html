var presenter = document.getElementById("hubblePresenter");

window.onhashchange = function () {
  saveCurrentHubble();
  updatePresenter();
};

window.onunload = function () {
  saveCurrentHubble();
};

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
  hubbleElement.style.order = String(await hubble.position.get());
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
  var ancestor = $(element).closest(".hubble")[0];
  return new Hubble(ancestor.dataset.key);
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
    const hubble = getScopedHubble(<HTMLElement>ev.srcElement);
    await hubble.parent.getHubble();
    parent => addNewChild(parent);
  }
}

function onLightSwitch() {
  const lightCheckBox = <HTMLInputElement>document.getElementById("lightSwitch");

  if (lightCheckBox.checked) {
    document.documentElement.classList.add("nightMode");
  }

  else {
    document.documentElement.classList.remove("nightMode");
  }
}

function onBulletSwitch() {
  const bulletCheckBox = <HTMLInputElement>document.getElementById("bulletSwitch");

  if (bulletCheckBox.checked) {
    document.documentElement.classList.add("noBulletView");
  }

  else {
    document.documentElement.classList.remove("noBulletView");
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

function onInactiveVisibleSwitch() {
  const showInactiveVisibleCheckBox = <HTMLInputElement>document.getElementById("inactiveVisibleSwitch");
  if (showInactiveVisibleCheckBox.checked) {
    document.documentElement.classList.remove("hideInactive");
  }

  else {
    document.documentElement.classList.add("hideInactive");
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
    const hubbleElement = $(collapseCheckbox).closest(".hubble")[0];

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

async function moveOut(event: MouseEvent) {
    event.preventDefault();
    const hubble = getScopedHubble(<HTMLElement>event.srcElement);
    await hubble.move(await hubble.parent.getHubble());
}

async function moveIn(event: MouseEvent) {
    event.preventDefault();
    const hubble = getScopedHubble(<HTMLElement>event.srcElement);
    await hubble.moveAfter(await hubble.position.previous());
}

async function moveDown(event: MouseEvent) {
    event.preventDefault();
    const hubble = getScopedHubble(<HTMLElement>event.srcElement);
    await hubble.position.moveDown();
}

async function moveUp(event: MouseEvent) {
    event.preventDefault();
    const hubble = getScopedHubble(<HTMLElement>event.srcElement);
    await hubble.position.moveUp();
}
