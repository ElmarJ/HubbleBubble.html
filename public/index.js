        var presenter = document.getElementById("hubblePresenter");
        var selector = document.getElementById("template_selector");

        window.onload = function() {
            selector.onchange = function() {
                updatePresenter();
            };

            fillTemplateSelector();
            updatePresenter();
        };

        window.onhashchange = function() {
            var contentelement = document.querySelector(".content")
            saveHubbleContent(contentelement.dataset.key, contentelement.innerText);
            updatePresenter();
        };

        window.onunload = function() {
            var contentelement = document.querySelector(".content")
            saveHubbleContent(contentelement.dataset.key, contentelement.innerText);
        };

        function updatePresenter() {
            if (firebase.auth().currentUser !== null) {
                var template = document.getElementById(selector.value);
                keyToHtml(getRootKey(), template).then(function(hubbleHtml) {
                    presenter.innerHTML = "";
                    presenter.appendChild(hubbleHtml);
                });
            }
        }

        function fillTemplateSelector() {
            var selector = document.getElementById("template_selector");

            var templates = document.querySelectorAll("[data-userselectable].hubbletemplate");

            Array.from(templates).forEach(function(element) {
                var option = document.createElement("option");
                option.text = element.id;
                selector.add(option);
            }, this);
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
            var contentElement = templatedNode.querySelector(".content");
            if (contentElement !== null) contentElement.innerText = hubble.content;
            if (contentElement !== null) contentElement.dataset.key = hubble.key;

            var linkElement = templatedNode.querySelector(".hubblelink");
            if (linkElement !== null) linkElement.href = "#" + hubble.key;

            // add children based on child template:
            var childrenelement = templatedNode.querySelector(".children");

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
            if (key === null || key === "") { key = "-KkH0zfUpacGriWPSDZK"; }
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
            var result = query.once('value').then(
                function(snapshot) {
                    return snapshot.val();
                });
            return result;
        }

        function saveHubbleContent(key, content) {
            var userId = firebase.auth().currentUser.uid;
            firebase.database().ref('users/' + userId + '/hubbles/' + key + '/content').set(content);
        }

        function moveHubble(key, destination_key) {
            var userId = firebase.auth().currentUser.uid;
            firebase.database().ref('users/' + userId + '/hubbles/' + key + '/parent').set(destination_key);
        }

        function newHubble(parent_key) {
            var userId = firebase.auth().currentUser.uid;
            var key = firebase.database().ref().child('hubbles').push().key;
            firebase.database().ref('users/' + userId + '/hubbles/' + key + '/parent').set(parent_key);

            return key;
        }