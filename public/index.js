var presenter = document.getElementById('hubblePresenter');
var selector = document.getElementById('template_selector');
var snoozetoggle;
var donetoggle;

window.onload = function() {
    selector.onchange = function() {
        updatePresenter();
    };

    fillTemplateSelector();
};

window.onhashchange = function() {
    saveCurrentHubble();
    updatePresenter();
};

window.onunload = function() {
    saveCurrentHubble();
};

function saveCurrentHubble() {
    var contentelements = document.querySelectorAll('[contenteditable].content');
    contentelements.forEach(element => persistHubbleContentElement(element));
}

function setToggleStates() {

    /* Unfortunately, this has to be done after inserting the templates into the DOM, so it can't
     *   be part of the templated content creation itself (the Material component gives an
     * error if instantiated before being inserted into the DOM)
     */

    const donetoggles = document.querySelectorAll(".doneToggle");
    donetoggles.forEach(function(doneelement) {
        donetoggle = new mdc.iconToggle.MDCIconToggle(doneelement);
        doneelement.addEventListener('MDCIconToggle:change', ({ detail }) => {
            saveHubbleDoneStatus(getScopedHubbleIdOfElement(doneelement), detail.isOn);
        });

        donetoggle.on = doneelement.dataset.startvalue == "true";
    }, this);

    const snoozetoggles = document.querySelectorAll(".snoozeToggle");
    snoozetoggles.forEach(function(snoozeelement) {
        snoozetoggle = new mdc.iconToggle.MDCIconToggle(snoozeelement);
        snoozeelement.addEventListener('MDCIconToggle:change', ({ detail }) => {
            saveHubbleSnoozeStatus(getScopedHubbleIdOfElement(snoozeelement), detail.isOn);
        });

        snoozetoggle.on = snoozeelement.dataset.startvalue == "true";
    }, this);
}

function updatePresenter() {
    if (firebase.auth().currentUser !== null) {
        if (selector !== null) {
            var template = document.getElementById(selector.value);
            if (template !== null) {
                presenter.innerHTML = "";
                renderHubbleByKey(getRootKey(), template, presenter)
                    .then(function() {
                        // setCaretPosition();
                        // setToggleStates();
                    });
            }
        }
    }
}

function setCaretPosition() {

    /** @type {HTMLElement} */
    var content_element = document.getElementsByClassName("content")[0];

    if (content_element !== null && content_element.contentEditable) {
        placeCaretAtEnd(content_element);
    }
}

function fillTemplateSelector() {

    /** @type {HTMLSelectElement} */
    var selector = document.getElementById('template_selector');

    var templates = document.querySelectorAll('[data-userselectable].hubbletemplate');

    Array.from(templates).forEach(function(element) {
        var option = document.createElement('option');
        option.text = element.id;
        selector.add(option);
    }, this);

    selector.value = 'cardViewTemplate';
}


/**
 * 
 * 
 * @param {string} key 
 * @param {HTMLTemplateElement} template 
 * @param {HTMLElement} containerElement
 */
function renderHubbleByKey(key, template, containerElement) {
    var p = getHubble(key);
    return p.then(function(hubble) {
        renderHubble(hubble, template, containerElement);
    });
}

/**
 * 
 * 
 * @param {object} hubble 
 * @param {HTMLTemplateElement} template 
 * @param {HTMLElement} containerElement
 */
function renderHubble(hubble, template, containerElement) {
    const templatedNode = document.importNode(template.content, true);

    /** @type {HTMLElement} */
    const hubbleElement = templatedNode.querySelector('.hubble');
    hubbleElement.dataset.key = hubble.key;
    hubbleElement.dataset.active = hubble.active;

    // add content:

    /** @type {HTMLElement} */
    const contentElement = templatedNode.querySelector('.content');
    if (contentElement !== null) {
        contentElement.innerText = hubble.content;
        contentElement.dataset.key = hubble.key;
        contentElement.onblur = (ev => persistHubbleContentElement(contentElement));
    }

    /** @type {HTMLLinkElement} */
    var linkElement = templatedNode.querySelector('.hubblelink');
    if (linkElement !== null) linkElement.href = '#' + hubble.key;

    /** @type {HTMLLinkElement} */
    var parentlinkElement = templatedNode.querySelector('.parentlink');
    if (parentlinkElement !== null) parentlinkElement.href = '#' + hubble.parent;

    /** @type {HTMLElement} */
    var childCountElement = templatedNode.querySelector('.child-count');
    if (childCountElement !== null) childCountElement.innerText = hubble.activechildren;

    /** @type {HTMLElement} */
    var parentNode = templatedNode.querySelector('.parentcontent');
    if (parentNode !== null) parentNode.dataset.key = hubble.parent;

    // set done toggle:
    /** @type {HTMLElement} */
    var doneelement = templatedNode.querySelector(".doneToggle");
    if (doneelement !== null) {
        donetoggle = new mdc.iconToggle.MDCIconToggle(doneelement);
        doneelement.addEventListener('MDCIconToggle:change', ({ detail }) => {
            saveHubbleDoneStatus(getScopedHubbleIdOfElement(doneelement), detail.isOn);
        });

        donetoggle.on = hubble.done;
    }

    // set snooze toggle:
    /** @type {HTMLElement} */
    var snoozeelement = templatedNode.querySelector(".snoozeToggle");
    if (snoozeelement !== null) {
        snoozetoggle = new mdc.iconToggle.MDCIconToggle(snoozeelement);
        snoozeelement.addEventListener('MDCIconToggle:change', ({ detail }) => {
            saveHubbleSnoozeStatus(getScopedHubbleIdOfElement(snoozeelement), detail.isOn);
        });

        snoozetoggle.on = hubble.snoozed;
    }

    // add rendered hubble to container:
    containerElement.appendChild(templatedNode);

    // add children based on child template:
    /** @type {HTMLElement} */
    var childrenelement = containerElement.querySelector('.children');
    if (childrenelement !== null) {
        // lookup childtemplate

        /** @type {HTMLTemplateElement} */
        var childtemplate = document.getElementById(childrenelement.dataset.childtemplate);

        getChildHubbles(hubble.key).then(function(childhubbles) {
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

/**
 * 
 * 
 * @returns {string}
 */
function getRootKey() {
    var key = window.location.hash.substr(1);
    if (key === null || key === '') { key = '-KkH0zfUpacGriWPSDZK'; }
    return key;
}

/**
 * 
 * 
 * @param {HTMLElement} contentElement 
 */
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

/**
 * 
 * 
 * @param {DragEvent} ev 
 */
function check_card_drop(ev) {
    ev.preventDefault();

}

/**
 * 
 * 
 * @param {DragEvent} ev 
 */
function card_drop(ev) {
    ev.preventDefault();

    const source_key = ev.dataTransfer.getData("text/plain");
    const destination_key = getScopedHubbleIdOfElement(ev.target);

    if (source_key !== destination_key) {
        moveHubble(source_key, destination_key);
        updatePresenter();
    }
}

/**
 * 
 * 
 * @param {DragEvent} ev 
 */
function card_drag(ev) {
    const source_key = getScopedHubbleIdOfElement(ev.target);
    ev.dataTransfer.setData("text/plain", source_key);
}

/**
 * 
 * 
 * @param {DragEvent} ev 
 */
function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection !== "undefined" &&
        typeof document.createRange !== "undefined") {
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (typeof document.body.createTextRange !== "undefined") {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(false);
        textRange.select();
    }
}

function switchtoggle() {
    snoozetoggle.on = !snoozetoggle.on;
}

/**
 * 
 * 
 * @param {HTMLElement} element 
 * @returns 
 */
function getScopedHubbleIdOfElement(element) {
    var ancestor = $(element).closest(".hubble")[0];
    return ancestor.dataset.key;
}