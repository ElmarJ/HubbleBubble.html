var presenter = document.getElementById('hubblePresenter');
var selector = <HTMLSelectElement>document.getElementById('template_selector');

window.onload = function () {
    selector.onchange = function () {
        updatePresenter();
    };

    fillTemplateSelector();
};

window.onhashchange = function () {
    saveCurrentHubble();
    updatePresenter();
};

window.onunload = function () {
    saveCurrentHubble();
};

function saveCurrentHubble() {
    var contentelements = document.querySelectorAll('[contenteditable].content');
    for (var element of contentelements) { persistHubbleContentElement(<HTMLElement>element); }
}

function updatePresenter() {
    if (firebase.auth().currentUser !== null) {
        if (selector !== null) {
            var template = <HTMLTemplateElement>document.getElementById(selector.value);
            if (template !== null) {
                presenter.innerHTML = "";
                renderHubble(getRootConnection(), template, presenter);
            }
        }
    }
}

function setCaretPosition() {
    var content_element = <HTMLElement>document.getElementsByClassName("content")[0];

    if (content_element !== null && content_element.contentEditable) {
        placeCaretAtEnd(content_element);
    }
}

function fillTemplateSelector() {
    var selector = <HTMLSelectElement>document.getElementById('template_selector');

    var templates = document.querySelectorAll('[data-userselectable].hubbletemplate');

    Array.from(templates).forEach(function (element) {
        var option = document.createElement('option');
        option.text = element.id;
        selector.add(option);
    }, this);

    selector.value = 'cardViewTemplate';
}

class HubbleTemplateBuilder {
    templatedNode: DocumentFragment;
    childTemplateElement: HTMLTemplateElement;
    hubbleElement: HTMLElement;
    contentElement: HTMLElement;
    linkElement: HTMLLinkElement;
    parentLinkElement: HTMLLinkElement;
    childCountElement: HTMLElement;
    parentHubbleElement: HTMLElement;
    doneElement: HTMLElement;
    snoozeElement: HTMLElement;
    childrenelement: HTMLElement;

    constructor(template: HTMLTemplateElement) {
        this.templatedNode = <DocumentFragment>document.importNode(template.content, true);
        this.lookupElements();
    }

    lookupElements() {
        this.hubbleElement = <HTMLElement>this.templatedNode.querySelector('.hubble');
        this.contentElement = <HTMLElement>this.templatedNode.querySelector('.content');
        this.linkElement = <HTMLLinkElement>this.templatedNode.querySelector('.hubblelink');
        this.parentLinkElement = <HTMLLinkElement>this.templatedNode.querySelector('.parentlink');
        this.childCountElement = <HTMLElement>this.templatedNode.querySelector('.child-count');
        this.parentHubbleElement = <HTMLElement>this.templatedNode.querySelector('.parentcontent');
        this.doneElement = <HTMLElement>this.templatedNode.querySelector(".doneToggle");
        this.snoozeElement = <HTMLElement>this.templatedNode.querySelector(".snoozeToggle");
        this.childrenelement = <HTMLElement>this.templatedNode.querySelector('.children');
    }

    insertHubbleData(hubble: Hubble) {
        this.setDatasetFields(hubble);
        this.setActivitySwitchElements(hubble);
        this.setLinks(hubble);
        this.setText(hubble);
    }

    setDatasetFields(hubble: Hubble) {
        this.hubbleElement.dataset.key = hubble.key;
        this.hubbleElement.dataset.active = String(hubble.active);
        this.hubbleElement.dataset.activeChildren = String(hubble.activechildren);
        if (this.parentHubbleElement) this.parentHubbleElement.dataset.key = hubble.parent;
    }
    setText(hubble: Hubble) {
        if (this.contentElement !== null) {
            this.contentElement.innerText = hubble.content;
            this.contentElement.onblur = (ev => persistHubbleContentElement(this.contentElement));
        }

        // Number of active children details
        if (this.childCountElement) (this.childCountElement.innerText = String(hubble.activechildren));
    }
    setLinks(hubble: Hubble) {
        if (this.linkElement) this.linkElement.href = '#' + hubble.key;
        if (this.parentLinkElement) (this.parentLinkElement.href = '#' + hubble.parent);
    }

    setActivitySwitchElements(hubble: Hubble) {
        if (this.doneElement) registerIconButton(this.doneElement, hubble.done, ev => getScopedHubbleConnection(<HTMLElement>ev.srcElement).done.set((<any>ev).detail.isOn));
        if (this.snoozeElement) registerIconButton(this.snoozeElement, hubble.snoozed, ev => getScopedHubbleConnection(<HTMLElement>ev.srcElement).snoozed.set((<any>ev).detail.isOn));
    }
}

function renderHubble(connection: HubbleConnection, template: HTMLTemplateElement, containerElement: HTMLElement) {
    connection.getHubble().then(hubble => {

        const templatedNode = <DocumentFragment>document.importNode(template.content, true);

        const hubbleElement = <HTMLElement>templatedNode.querySelector('.hubble');
        hubbleElement.dataset.key = hubble.key;
        hubbleElement.dataset.active = String(hubble.active);
        hubbleElement.dataset.activeChildren = String(hubble.activechildren);

        // add content:
        const contentElement = <HTMLElement>templatedNode.querySelector('.content');
        if (contentElement !== null) {
            contentElement.innerText = hubble.content;
            contentElement.onblur = (ev => persistHubbleContentElement(contentElement));
        }

        const linkElement = <HTMLLinkElement>templatedNode.querySelector('.hubblelink');
        if (linkElement !== null) linkElement.href = '#' + hubble.key;

        const parentlinkElement = <HTMLLinkElement>templatedNode.querySelector('.parentlink');
        if (parentlinkElement !== null) parentlinkElement.href = '#' + hubble.parent;

        const childCountElement = <HTMLElement>templatedNode.querySelector('.child-count');
        if (childCountElement !== null) childCountElement.innerText = String(hubble.activechildren);

        const parentNode = <HTMLElement>templatedNode.querySelector('.parentcontent');
        if (parentNode !== null) parentNode.dataset.key = hubble.parent;

        // set done toggle:
        const doneElement = <HTMLElement>templatedNode.querySelector(".doneToggle");
        if (doneElement !== null) {
            registerIconButton(doneElement, hubble.done, ev => getScopedHubbleConnection(<HTMLElement>ev.srcElement).done.set((<any>ev).detail.isOn));
        }

        // set snooze toggle:
        const snoozeElement = <HTMLElement>templatedNode.querySelector(".snoozeToggle");
        if (snoozeElement !== null) {
            registerIconButton(snoozeElement, hubble.snoozed, ev => getScopedHubbleConnection(<HTMLElement>ev.srcElement).snoozed.set((<any>ev).detail.isOn));
        }

        // add children based on child template:
        const childrenElement = <HTMLElement>templatedNode.querySelector(".children");
        if (childrenElement !== null) {
            // lookup childtemplate

            var childTemplate = <HTMLTemplateElement>document.getElementById(childrenElement.dataset.childtemplate);

            connection.children.connections().then(function (childConnections) {
                for (var child of childConnections) {
                    renderHubble(child, childTemplate, childrenElement);
                }
            });
        }

        // add rendered hubble to container:
        containerElement.appendChild(templatedNode);
    });
}

function getRootConnection(): HubbleConnection {
    var key = window.location.hash.substr(1);
    if (key === null || key === '') { key = '-KlYdxmFkIiWOFXp0UIP'; }
    return new HubbleConnection(key);
}

function persistHubbleContentElement(contentElement: HTMLElement) {
    getScopedHubbleConnection(contentElement).content.set(contentElement.innerText);
}

function navigateToNewChild() {
    location.hash = getRootConnection().children.new().hubbleKey;
    updatePresenter();
}

function check_card_drop(ev: DragEvent) {
    ev.preventDefault();
}

function card_drop(ev: DragEvent) {
    ev.preventDefault();

    const sourceKey = ev.dataTransfer.getData("text/plain");
    const source = new HubbleConnection(sourceKey);
    const destination = getScopedHubbleConnection(<HTMLElement>ev.target);

    if (source.hubbleKey !== destination.hubbleKey) {
        source.move(destination);
        updatePresenter();
    }
}

function card_drag(ev: DragEvent) {
    const source = getScopedHubbleConnection(<HTMLElement>ev.target);
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

function getScopedHubbleConnection(element: HTMLElement): HubbleConnection {
    var ancestor = $(element).closest(".hubble")[0];
    return new HubbleConnection(ancestor.dataset.key);
}

function registerIconButton(element: HTMLElement, initialValue: boolean, onchange: EventListenerOrEventListenerObject) {
    if (element !== null) {
        const toggle = new (<any>mdc).iconToggle.MDCIconToggle(element);
        toggle.on = initialValue;

        element.addEventListener('MDCIconToggle:change', onchange);
    }
}

