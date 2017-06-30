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

function updatePresenter() {
  if (firebase.auth().currentUser !== null) {
    presenter.innerHTML = "";
    renderHubble(getRootConnection(), getCurrentTemplate(), presenter);
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


class HubbleTemplateBuilder {
  templatedNode: DocumentFragment;
  childTemplateElement: HTMLTemplateElement;
  hubbleElement: HTMLElement;
  contentElement: HTMLElement;
  linkElement: HTMLLinkElement;
  parentLinkElements: NodeListOf<HTMLLinkElement>;
  childCountElement: HTMLElement;
  parentHubbleElement: HTMLElement;
  doneElement: HTMLInputElement;
  snoozeElement: HTMLInputElement;
  childrenelement: HTMLElement;

  constructor(template: HTMLTemplateElement) {
    this.templatedNode = <DocumentFragment>document.importNode(
      template.content,
      true
    );
    this.lookupElements();
  }

  lookupElements() {
    this.hubbleElement = <HTMLElement>this.templatedNode.querySelector(
      ".hubble"
    );
    this.contentElement = <HTMLElement>this.templatedNode.querySelector(
      ".content"
    );
    this.linkElement = <HTMLLinkElement>this.templatedNode.querySelector(
      ".hubblelink"
    );
    this.parentLinkElements = <NodeListOf<HTMLLinkElement>>this.templatedNode.querySelectorAll(
      ".parentlink"
    );
    this.childCountElement = <HTMLElement>this.templatedNode.querySelector(
      ".child-count"
    );
    this.parentHubbleElement = <HTMLElement>this.templatedNode.querySelector(
      ".parentcontent"
    );
    this.doneElement = <HTMLInputElement>this.templatedNode.querySelector(
      ".doneToggle"
    );
    this.snoozeElement = <HTMLInputElement>this.templatedNode.querySelector(
      ".snoozeToggle"
    );
    this.childrenelement = <HTMLElement>this.templatedNode.querySelector(
      ".children"
    );
  }

  insertHubbleData(data: HubbleData) {
    this.setDatasetFields(data);
    this.setActivitySwitchElements(data);
    this.setLinks(data);
    this.setText(data);
  }

  setDatasetFields(data: HubbleData) {
    this.hubbleElement.dataset.key = data.key;
    this.hubbleElement.dataset.active = String(data.active);
    this.hubbleElement.dataset.activeChildren = String(data.activechildren);
    if (this.parentHubbleElement)
      this.parentHubbleElement.dataset.key = data.parent;
  }
  setText(data: HubbleData) {
    if (this.contentElement !== null) {
      this.contentElement.innerText = data.content;
      this.contentElement.onblur = () => persistHubbleContentElement(this.contentElement);
    }

    // Number of active children details
    if (this.childCountElement)
      this.childCountElement.innerText = String(data.activechildren);
  }
  setLinks(data: HubbleData) {
    if (this.linkElement) this.linkElement.href = "#" + data.key;
    for (var linkElement of this.parentLinkElements) {
      linkElement.href =  "#" + data.parent;
    }
  }

  setActivitySwitchElements(data: HubbleData) {
    if (this.doneElement)
      registerToggle(this.doneElement, data.done, ev =>
        getScopedHubble(<HTMLElement>ev.srcElement).done.set(
          (<any>ev).detail.isOn
        )
      );
    if (this.snoozeElement)
      registerToggle(this.snoozeElement, data.snoozed, ev =>
        getScopedHubble(<HTMLElement>ev.srcElement).snoozed.set(
          (<any>ev).detail.isOn
        )
      );
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

    const childHubbles = await hubble.children.hubbles();
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
    await hubble.parent.hubble();
    parent => addNewChild(parent);
  }
}

function onLightSwitch() {
  const lightCheckBox = <HTMLInputElement>document.getElementById("lightSwitch");
  const bodyElement = document.querySelector("body");

  if (lightCheckBox.checked) {
    bodyElement.classList.add("nightMode");
  }

  else {
    bodyElement.classList.remove("nightMode");
  }
}

function onBulletSwitch() {
  const bulletCheckBox = <HTMLInputElement>document.getElementById("bulletSwitch");
  const templateElement = document.querySelector(".hubbleListView");

  if (bulletCheckBox.checked) {
    templateElement.classList.add("noBulletView");
  }

  else {
    templateElement.classList.remove("noBulletView");
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
    var observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            callback(entry.intersectionRatio > 0);
        });
    });
    observer.observe(element);
}
