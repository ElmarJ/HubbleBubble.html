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
            var contentelement = document.querySelector('.content');

            if (contentelement !== null) {
                saveHubbleContent(contentelement.dataset.key, contentelement.innerText);
            }
        }

        function setToggleStates() {
            var doneelement = document.getElementById("doneToggle");
            if (doneelement !== null) {
                donetoggle = new mdc.iconToggle.MDCIconToggle(doneelement);
                doneelement.addEventListener('MDCIconToggle:change', ({ detail }) => {
                    saveHubbleDoneStatus(getRootKey(), detail.isOn);
                });

                donetoggle.on = doneelement.dataset.startvalue == "true";
            }

            var snoozeelement = document.getElementById("snoozeToggle");
            if (snoozeelement !== null) {
                snoozetoggle = new mdc.iconToggle.MDCIconToggle(snoozeelement);

                snoozeelement.addEventListener('MDCIconToggle:change', ({ detail }) => {
                    saveHubbleSnoozeStatus(getRootKey(), detail.isOn);
                });

                snoozetoggle.on = snoozeelement.dataset.startvalue == "true";
            }
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

        function keyToHtml(key, template) {
            var p = getHubble(key);
            return p.then(function(hubble) {
                return hubbleToHtml(hubble, template);
            });
        }

        function hubbleToHtml(hubble, template) {
            var templatedNode = document.importNode(template.content, true);

            // add content:
            var contentElement = templatedNode.querySelector('.content');
            if (contentElement !== null) contentElement.innerText = hubble.content;
            if (contentElement !== null) contentElement.dataset.key = hubble.key;

            var linkElement = templatedNode.querySelector('.hubblelink');
            if (linkElement !== null) linkElement.href = '#' + hubble.key;

            var parentlinkElement = templatedNode.querySelector('.parentlink');
            if (parentlinkElement !== null) parentlinkElement.href = '#' + hubble.parent;

            var parentNode = templatedNode.querySelector('.parentcontent');
            if (parentNode !== null) parentNode.dataset.key = hubble.parent;

            var doneelement = templatedNode.getElementById("doneToggle");
            if (doneelement !== null) doneelement.dataset.startvalue = hubble.done;

            var snoozeelement = templatedNode.getElementById("snoozeToggle");
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

        function getRootKey() {
            var key = window.location.hash.substr(1);
            if (key === null || key === '') { key = '-KkH0zfUpacGriWPSDZK'; }
            return key;
        }

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

        function saveHubbleContent(key, content) {
            var user = firebase.auth().currentUser;
            if (user !== null) {
                firebase.database().ref('users/' + user.uid + '/hubbles/' + key + '/content').set(content);
            }
        }

        function saveHubbleDoneStatus(key, isDone) {
            var user = firebase.auth().currentUser;
            if (user !== null) {
                const hubbleref = firebase.database().ref('users/' + user.uid + '/hubbles/' + key);
                hubbleref.child('/done').set(isDone);
                updateactive(hubbleref);
            }
        }

        function saveHubbleSnoozeStatus(key, isSnoozed) {
            var user = firebase.auth().currentUser;
            if (user !== null) {
                const hubbleref = firebase.database().ref('users/' + user.uid + '/hubbles/' + key);
                hubbleref.child('snoozed').set(isSnoozed);
                updateactive(hubbleref);
            }
        }

        function moveHubble(key, destination_key) {
            var userId = firebase.auth().currentUser.uid;
            firebase.database().ref('users/' + userId + '/hubbles/' + key + '/parent').set(destination_key);
        }

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

        function check_card_drop(ev) {
            ev.preventDefault();

        }

        function card_drop(ev) {
            var destination_key;
            ev.preventDefault();
            var source_key = ev.dataTransfer.getData("text/plain");

            if (ev.target.classList.contains("content")) {
                destination_key = ev.target.dataset.key;
            } else {
                destination_key = ev.target.getElementsByClassName("content")[0].dataset.key;
            }

            if (source_key !== destination_key) {
                moveHubble(source_key, destination_key);
                updatePresenter();
            }
        }

        function card_drag(ev) {
            var source_key;
            if (ev.target.classList.contains("content")) {
                source_key = ev.target.dataset.key;
            } else {
                source_key = ev.target.getElementsByClassName("content")[0].dataset.key;
            }

            ev.dataTransfer.setData("text/plain", source_key);
        }

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