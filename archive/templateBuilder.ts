
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
