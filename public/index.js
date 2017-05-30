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
                keyToHtml(getRootKey(), template).then(function(hubbleHtml) {
                    presenter.innerHTML = '';
                    presenter.appendChild(hubbleHtml);
                    var content_element = document.getElementsByClassName("content")[0];
                    if (content_element !== null && content_element.contentEditable) {
                        placeCaretAtEnd(content_element);
                    }

                    setToggleStates();
                });
            }
        }
    }
}

function fillTemplateSelector() {
    var selector = document.getElementById('template_selector');

    var templates = document.querySelectorAll('[data-userselectable].hubbletemplate');

    Array.from(templates).forEach(function(element) {
        var option = document.createElement('option');
        option.text = element.id;
        selector.add(option);
    }, this);

    selector.value = 'keepViewTemplate';
}


/**
 * 
 * 
 * @param {string} key 
 * @param {HTMLTemplateElement} template 
 * @returns {Promise<DocumentFragment>}
 */
function keyToHtml(key, template) {
    var p = getHubble(key);
    return p.then(function(hubble) {
        return hubbleToHtml(hubble, template);
    });
}

/**
 * 
 * 
 * @param {object} hubble 
 * @param {HTMLTemplateElement} template 
 * @returns {Promise<DocumentFragment>}
 */
function hubbleToHtml(hubble, template) {
    const templatedNode = document.importNode(template.content, true);

    const hubbleElement = templatedNode.querySelector('.hubble');
    hubbleElement.dataset.key = hubble.key;

    // add content:

    const contentElement = templatedNode.querySelector('.content');
    if (contentElement !== null) {
        contentElement.innerText = hubble.content;
        contentElement.dataset.key = hubble.key;
        contentElement.onblur = (ev => persistHubbleContentElement(contentElement));
    }

    var linkElement = templatedNode.querySelector('.hubblelink');
    if (linkElement !== null) linkElement.href = '#' + hubble.key;

    var parentlinkElement = templatedNode.querySelector('.parentlink');
    if (parentlinkElement !== null) parentlinkElement.href = '#' + hubble.parent;

    var parentNode = templatedNode.querySelector('.parentcontent');
    if (parentNode !== null) parentNode.dataset.key = hubble.parent;

    var doneelement = templatedNode.querySelector(".doneToggle");
    if (doneelement !== null) doneelement.dataset.startvalue = hubble.done;

    var snoozeelement = templatedNode.querySelector(".snoozeToggle");
    if (snoozeelement !== null) snoozeelement.dataset.startvalue = hubble.snoozed;

    // add children based on child template:
    var childrenelement = templatedNode.querySelector('.children');

    if (childrenelement !== null) {
        // lookup childtemplate
        var childtemplate = document.getElementById(childrenelement.dataset.childtemplate);

        return getChildHubbles(hubble.key).then(function(childhubbles) {
            var addElement = function(element) {
                childrenelement.appendChild(element);
            };

            for (var childkey in childhubbles) {
                if (childhubbles.hasOwnProperty(childkey)) {
                    var childhubble = childhubbles[childkey];
                    childhubble.key = childkey;
                    hubbleToHtml(childhubble, childtemplate).then(addElement);
                }
            }
            return templatedNode;
        });
    }

    return new Promise(function(resolve, reject) { resolve(templatedNode); });
}

/**
 * 
 * 
 * @returns string
 */
function getRootKey() {
    var key = window.location.hash.substr(1);
    if (key === null || key === '') { key = '-KkH0zfUpacGriWPSDZK'; }
    return key;
}

/**
 * 
 * 
 * @param {string} key 
 * @returns object
 */
function getHubble(key) {
    var user = firebase.auth().currentUser;
    var database = firebase.database();
    if (user !== null) {
        var dataPath = 'users/' + user.uid + '/hubbles/' + key;
        var hubbleRef = database.ref(dataPath);
        return hubbleRef.once('value').then(function(result) {
            var hubble = result.val();
            hubble.key = key;
            return hubble;
        });
    }
    return null;
}

/**
 * 
 * 
 * @param {string} parentKey 
 * @returns Promise<object>
 */
function getChildHubbles(parentKey) {
    var user = firebase.auth().currentUser;
    var database = firebase.database();
    var dataPath = 'users/' + user.uid + '/hubbles';
    var query = database.ref(dataPath).orderByChild('parent').equalTo(parentKey);
    return query.once('value').then(
        function(snapshot) {
            return snapshot.val();
        });
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

/**
 * 
 * 
 * @param {string} key
 * @param {string} content 
 */
function saveHubbleContent(key, content) {
    var user = firebase.auth().currentUser;
    if (user !== null) {
        firebase.database().ref('users/' + user.uid + '/hubbles/' + key + '/content').set(content);
    }
}

/**
 * 
 * 
 * @param {string} key 
 * @param {boolean} isDone 
 */
function saveHubbleDoneStatus(key, isDone) {
    var user = firebase.auth().currentUser;
    if (user !== null) {
        const hubbleref = firebase.database().ref('users/' + user.uid + '/hubbles/' + key);
        hubbleref.child('/done').set(isDone);
        updateactive(hubbleref);
    }
}

/**
 * 
 * 
 * @param {string} key 
 * @param {boolean} isSnoozed 
 */
function saveHubbleSnoozeStatus(key, isSnoozed) {
    var user = firebase.auth().currentUser;
    if (user !== null) {
        const hubbleref = firebase.database().ref('users/' + user.uid + '/hubbles/' + key);
        hubbleref.child('snoozed').set(isSnoozed);
        updateactive(hubbleref);
    }
}

/**
 * 
 * 
 * @param {string} key 
 * @param {boolean} destination_key 
 */
function moveHubble(key, destination_key) {
    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref('users/' + userId + '/hubbles/' + key + '/parent').set(destination_key);
}

/**
 * 
 * 
 * @param {string} parent_key 
 * @returns string
 */
function newHubble(parent_key) {
    var userId = firebase.auth().currentUser.uid;
    var key = firebase.database().ref().child('hubbles').push().key;
    firebase.database().ref('users/' + userId + '/hubbles/' + key + '/parent').set(parent_key);
    firebase.database().ref('users/' + userId + '/hubbles/' + key + '/content').set("");
    return key;
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
 * @param {string} parentKey 
 * @returns number
 */
function getActiveChildCount(parentKey) {
    var user = firebase.auth().currentUser;
    var database = firebase.database();
    var dataPath = 'users/' + user.uid + '/hubbles';

    /* Todo: this is super inefficient (looping all child hubbles to see how many are active).
     *    should look into smarter (server side) solution at later moment. Combining multiple
     *    order by's is not possible unfortunately.
     */

    var query = database.ref(dataPath).orderByChild('parent').equalTo(parentKey);
    return query.once('value').then(
        function(snapshot) {
            var count = 0;
            snapshot.forEach(function(childSnapshot) {
                if (childSnapshot.val().active) {
                    count++;
                }
            });
            return count;
        });
}

/**
 * 
 * 
 * @param {string} parentKey 
 */
function setActiveChildCount(parentKey) {
    getActiveChildCount(parentKey).then(
        number => {
            var userId = firebase.auth().currentUser.uid;
            firebase.database().ref('users/' + userId + '/hubbles/' + parentKey + '/activechildren').set(number);
        }
    )
}

/**
 * 
 * 
 * @param {firebase.database.Reference} hubbleRef 
 */
function updateactive(hubbleRef) {
    return hubbleRef.once('value').then(
        snapshot => {
            const hubble = snapshot.val();
            hubbleRef.child('active').set(isactive(hubble.snoozed, hubble.done, hubble.activechildren));
            setActiveChildCount(hubble.parent);
        });
}

/**
 * 
 * 
 * @param {boolean} snoozed 
 * @param {boolean} done 
 * @param {number} activechilds 
 * @returns 
 */
function isactive(snoozed, done, activechildren) {
    return !snoozed && (!done || (activechildren > 0))
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