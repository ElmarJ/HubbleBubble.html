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
                renderHubbleByKey(getRootKey(), template, presenter);
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

function renderHubbleByKey(key: string, template: HTMLTemplateElement, containerElement: HTMLElement) {
    var p = getHubble(key);
    return p.then(function (hubble) {
        renderHubble(hubble, template, containerElement);
    });
}

function renderHubble(hubble: Hubble, template: HTMLTemplateElement, containerElement: HTMLElement) {
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

    var linkElement = <HTMLLinkElement>templatedNode.querySelector('.hubblelink');
    if (linkElement !== null) linkElement.href = '#' + hubble.key;

    var parentlinkElement = <HTMLLinkElement>templatedNode.querySelector('.parentlink');
    if (parentlinkElement !== null) parentlinkElement.href = '#' + hubble.parent;

    var childCountElement = <HTMLElement>templatedNode.querySelector('.child-count');
    if (childCountElement !== null) childCountElement.innerText = String(hubble.activechildren);

    var parentNode = <HTMLElement>templatedNode.querySelector('.parentcontent');
    if (parentNode !== null) parentNode.dataset.key = hubble.parent;

    // set done toggle:
    var doneElement = <HTMLElement>templatedNode.querySelector(".doneToggle");
    if (doneElement !== null) {
        registerIconButton(doneElement, hubble.done, ev => saveHubbleDoneStatus(getScopedHubbleIdOfElement(<HTMLElement>ev.srcElement), (<any>ev).detail.isOn));
    }

    // set snooze toggle:
    var snoozeElement = <HTMLElement>templatedNode.querySelector(".snoozeToggle");
    if (snoozeElement !== null) {
        registerIconButton(snoozeElement, hubble.snoozed, ev => saveHubbleSnoozeStatus(getScopedHubbleIdOfElement(<HTMLElement>ev.srcElement), (<any>ev).detail.isOn));
    }

    // add rendered hubble to container:
    containerElement.appendChild(templatedNode);

    // add children based on child template:
    var childrenelement = <HTMLElement>containerElement.querySelector('.children');
    if (childrenelement !== null) {
        // lookup childtemplate

        var childtemplate = <HTMLTemplateElement>document.getElementById(childrenelement.dataset.childtemplate);

        getChildHubbles(hubble.key).then(function (childhubbles) {
            for (var childkey in childhubbles) {
                if (childhubbles.hasOwnProperty(childkey)) {
                    var childhubble = childhubbles[childkey];
                    childhubble.key = childkey;
                    renderHubble(childhubble, childtemplate, childrenelement);
                }
            }
        });
    }

}

function getRootKey(): string {
    var key = window.location.hash.substr(1);
    if (key === null || key === '') { key = '-KlYdxmFkIiWOFXp0UIP'; }
    return key;
}

function persistHubbleContentElement(contentElement: HTMLElement) {
    const key = getScopedHubbleIdOfElement(contentElement);
    saveHubbleContent(key, contentElement.innerText);
}

function navigateToNewChild() {
    var parent_key = getRootKey();
    var child_key = newHubble(parent_key);

    location.hash = child_key;
    updatePresenter();
}

function check_card_drop(ev: DragEvent) {
    ev.preventDefault();

}

function card_drop(ev: DragEvent) {
    ev.preventDefault();

    const source_key = ev.dataTransfer.getData("text/plain");
    const destination_key = getScopedHubbleIdOfElement(<HTMLElement>ev.target);

    if (source_key !== destination_key) {
        moveHubble(source_key, destination_key);
        updatePresenter();
    }
}

function card_drag(ev: DragEvent) {
    const source_key = getScopedHubbleIdOfElement(<HTMLElement>ev.target);
    ev.dataTransfer.setData("text/plain", source_key);
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

function getScopedHubbleIdOfElement(element: HTMLElement): string {
    var ancestor = $(element).closest(".hubble")[0];
    return ancestor.dataset.key;
}

function registerIconButton(element: HTMLElement, initialValue: boolean, onchange: EventListenerOrEventListenerObject) {
    if (element !== null) {
        const toggle = new (<any>mdc).iconToggle.MDCIconToggle(element);
        toggle.on = initialValue;

        element.addEventListener('MDCIconToggle:change', onchange);
    }
}

