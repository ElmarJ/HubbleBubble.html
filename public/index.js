var presenter = document.getElementById('hubblePresenter');
var selector = document.getElementById('template_selector');
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
    for (var element of contentelements) {
        persistHubbleContentElement(element);
    }
}
function updatePresenter() {
    if (firebase.auth().currentUser !== null) {
        if (selector !== null) {
            var template = document.getElementById(selector.value);
            if (template !== null) {
                presenter.innerHTML = "";
                renderHubbleByKey(getRootKey(), template, presenter)
                    .then(function () {
                });
            }
        }
    }
}
function setCaretPosition() {
    var content_element = document.getElementsByClassName("content")[0];
    if (content_element !== null && content_element.contentEditable) {
        placeCaretAtEnd(content_element);
    }
}
function fillTemplateSelector() {
    var selector = document.getElementById('template_selector');
    var templates = document.querySelectorAll('[data-userselectable].hubbletemplate');
    Array.from(templates).forEach(function (element) {
        var option = document.createElement('option');
        option.text = element.id;
        selector.add(option);
    }, this);
    selector.value = 'cardViewTemplate';
}
function renderHubbleByKey(key, template, containerElement) {
    var p = getHubble(key);
    return p.then(function (hubble) {
        renderHubble(hubble, template, containerElement);
    });
}
function renderHubble(hubble, template, containerElement) {
    const templatedNode = document.importNode(template.content, true);
    const hubbleElement = templatedNode.querySelector('.hubble');
    hubbleElement.dataset.key = hubble.key;
    hubbleElement.dataset.active = String(hubble.active);
    const contentElement = templatedNode.querySelector('.content');
    if (contentElement !== null) {
        contentElement.innerText = hubble.content;
        contentElement.onblur = (ev => persistHubbleContentElement(contentElement));
    }
    var linkElement = templatedNode.querySelector('.hubblelink');
    if (linkElement !== null)
        linkElement.href = '#' + hubble.key;
    var parentlinkElement = templatedNode.querySelector('.parentlink');
    if (parentlinkElement !== null)
        parentlinkElement.href = '#' + hubble.parent;
    var childCountElement = templatedNode.querySelector('.child-count');
    if (childCountElement !== null)
        childCountElement.innerText = String(hubble.activechildren);
    var parentNode = templatedNode.querySelector('.parentcontent');
    if (parentNode !== null)
        parentNode.dataset.key = hubble.parent;
    var doneElement = templatedNode.querySelector(".doneToggle");
    if (doneElement !== null) {
        registerIconButton(doneElement, hubble.done, ev => saveHubbleDoneStatus(getScopedHubbleIdOfElement(ev.srcElement), ev.detail.isOn));
    }
    var snoozeElement = templatedNode.querySelector(".snoozeToggle");
    if (snoozeElement !== null) {
        registerIconButton(snoozeElement, hubble.snoozed, ev => saveHubbleSnoozeStatus(getScopedHubbleIdOfElement(ev.srcElement), ev.detail.isOn));
    }
    containerElement.appendChild(templatedNode);
    var childrenelement = containerElement.querySelector('.children');
    if (childrenelement !== null) {
        var childtemplate = document.getElementById(childrenelement.dataset.childtemplate);
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
function getRootKey() {
    var key = window.location.hash.substr(1);
    if (key === null || key === '') {
        key = '-KlYdxmFkIiWOFXp0UIP';
    }
    return key;
}
function persistHubbleContentElement(contentElement) {
    const key = getScopedHubbleIdOfElement(contentElement);
    saveHubbleContent(key, contentElement.innerText);
}
function navigateToNewChild() {
    var parent_key = getRootKey();
    var child_key = newHubble(parent_key);
    location.hash = child_key;
    updatePresenter();
}
function check_card_drop(ev) {
    ev.preventDefault();
}
function card_drop(ev) {
    ev.preventDefault();
    const source_key = ev.dataTransfer.getData("text/plain");
    const destination_key = getScopedHubbleIdOfElement(ev.target);
    if (source_key !== destination_key) {
        moveHubble(source_key, destination_key);
        updatePresenter();
    }
}
function card_drag(ev) {
    const source_key = getScopedHubbleIdOfElement(ev.target);
    ev.dataTransfer.setData("text/plain", source_key);
}
function placeCaretAtEnd(el) {
    el.focus();
    var range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}
function getScopedHubbleIdOfElement(element) {
    var ancestor = $(element).closest(".hubble")[0];
    return ancestor.dataset.key;
}
function registerIconButton(element, initialValue, onchange) {
    if (element !== null) {
        const toggle = new mdc.iconToggle.MDCIconToggle(element);
        toggle.on = initialValue;
        element.addEventListener('MDCIconToggle:change', onchange);
    }
}
//# sourceMappingURL=index.js.map