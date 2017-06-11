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
        if (this.parentHubbleElement) this.parentHubbleElement.dataset.key = data.parent;
    }
    setText(data: HubbleData) {
        if (this.contentElement !== null) {
            this.contentElement.innerText = data.content;
            this.contentElement.onblur = (ev => persistHubbleContentElement(this.contentElement));
        }

        // Number of active children details
        if (this.childCountElement) (this.childCountElement.innerText = String(data.activechildren));
    }
    setLinks(data: HubbleData) {
        if (this.linkElement) this.linkElement.href = '#' + data.key;
        if (this.parentLinkElement) (this.parentLinkElement.href = '#' + data.parent);
    }

    setActivitySwitchElements(data: HubbleData) {
        if (this.doneElement) registerIconButton(this.doneElement, data.done, ev => getScopedHubbleConnection(<HTMLElement>ev.srcElement).done.set((<any>ev).detail.isOn));
        if (this.snoozeElement) registerIconButton(this.snoozeElement, data.snoozed, ev => getScopedHubbleConnection(<HTMLElement>ev.srcElement).snoozed.set((<any>ev).detail.isOn));
    }
}

function renderHubble(hubble: Hubble, template: HTMLTemplateElement, containerElement: HTMLElement) {
    hubble.getHubbleData().then(data => {

        const templatedNode = <DocumentFragment>document.importNode(template.content, true);

        const hubbleElement = <HTMLElement>templatedNode.querySelector('.hubble');
        hubbleElement.dataset.key = data.key;
        hubbleElement.dataset.active = String(data.active);
        hubbleElement.dataset.activeChildren = String(data.activechildren);

        // add content:
        const contentElement = <HTMLElement>templatedNode.querySelector('.content');
        if (contentElement !== null) {
            contentElement.innerText = data.content;
            contentElement.onblur = (ev => persistHubbleContentElement(contentElement));
        }

        const linkElement = <HTMLLinkElement>templatedNode.querySelector('.hubblelink');
        if (linkElement !== null) linkElement.href = '#' + data.key;

        const parentlinkElement = <HTMLLinkElement>templatedNode.querySelector('.parentlink');
        if (parentlinkElement !== null) parentlinkElement.href = '#' + data.parent;

        const childCountElement = <HTMLElement>templatedNode.querySelector('.child-count');
        if (childCountElement !== null) childCountElement.innerText = String(data.activechildren);

        const parentNode = <HTMLElement>templatedNode.querySelector('.parentcontent');
        if (parentNode !== null) parentNode.dataset.key = data.parent;

        // set done toggle:
        const doneElement = <HTMLElement>templatedNode.querySelector(".doneToggle");
        if (doneElement !== null) {
            registerIconButton(doneElement, data.done, ev => getScopedHubbleConnection(<HTMLElement>ev.srcElement).done.set((<any>ev).detail.isOn));
        }

        // set snooze toggle:
        const snoozeElement = <HTMLElement>templatedNode.querySelector(".snoozeToggle");
        if (snoozeElement !== null) {
            registerIconButton(snoozeElement, data.snoozed, ev => getScopedHubbleConnection(<HTMLElement>ev.srcElement).snoozed.set((<any>ev).detail.isOn));
        }

        // add children based on child template:
        const childrenElement = <HTMLElement>templatedNode.querySelector(".children");
        if (childrenElement !== null) {
            // lookup childtemplate

            var childTemplate = <HTMLTemplateElement>document.getElementById(childrenElement.dataset.childtemplate);

            hubble.children.hubbles().then(function (childHubbles) {
                for (var child of childHubbles) {
                    renderHubble(child, childTemplate, childrenElement);
                }
            });
        }

        // add rendered hubble to container:
        containerElement.appendChild(templatedNode);
    });
}

function getRootConnection(): Hubble {
    var key = window.location.hash.substr(1);
    if (key === null || key === '') { key = '-KlYdxmFkIiWOFXp0UIP'; }
    return new Hubble(key);
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
    const source = new Hubble(sourceKey);
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

function getScopedHubble(element: HTMLElement): Hubble {
    var ancestor = $(element).closest(".hubble")[0];
    return new Hubble(ancestor.dataset.key);
}

function registerIconButton(element: HTMLElement, initialValue: boolean, onchange: EventListenerOrEventListenerObject) {
    if (element !== null) {
        const toggle = new (<any>mdc).iconToggle.MDCIconToggle(element);
        toggle.on = initialValue;

        element.addEventListener('MDCIconToggle:change', onchange);
    }
}

function addNewChild(parentHubble: Hubble) {
    const childHubble = parentHubble.children.new();
    const childrenElement = <HTMLElement>getElementOf(parentHubble).getElementsByClassName("children")[0];
    if (childrenElement) {
        const childTemplate = <HTMLTemplateElement>document.getElementById(childrenElement.dataset.childtemplate);
        renderHubble(childHubble, childTemplate, childrenElement);
    }

    focus(childHubble);
}

function getElementOf(hubble: Hubble) {
    return <HTMLElement>document.querySelector(".hubble[data-key=" + hubble.hubbleKey + "]");
}

function onEditorKeyPress(ev: KeyboardEvent) {
    if (ev.key == "Enter") {
        const hubble = getScopedHubble(<HTMLElement>ev.srcElement);
        addNewChild(hubble);
    }
}

function focus(hubble: Hubble) {
    const element = <HTMLElement>getElementOf(hubble).getElementsByClassName(".content")[1];
    if (element && element.contentEditable) {
        element.focus();
    } else {
        location.hash = hubble.hubbleKey;
    }
}