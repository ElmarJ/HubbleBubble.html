// @ts-check


/**
 * 
 * 
 * @param {string} key 
 * @returns {Promise<void>}
 */
function updateDeepActiveChildCount(key) {
    return getChildHubbles(key).then(children => {
        var activeChildrenCount = 0;

        // Create promise for each child to update and count children:
        var childUpdatePromises = [];
        for (var childkey in children) {
            if (children.hasOwnProperty(childkey)) {
                var childhubble = children[childkey];
                // create promise for this child:
                const childUpdatePromise = updateDeepActiveChildCount(childkey)
                    .then(function() {
                        // update child activity:
                        const childActive = isactive(childhubble.snoozed, childhubble.done, childhubble.activechildren);
                        setActive(childkey, childActive);
                        return childActive;
                    });
                childUpdatePromises.push(childUpdatePromise);
            }
        }

        return Promise.all(childUpdatePromises)
            .then(activeList => {
                let activeCount = 0;
                activeList.forEach(function(isActive) {
                    if (isActive) activeCount++;
                }, this);

                setActiveChildCount(key, activeCount);
            });
    });
}

/**
 * 
 * 
 * @param {string} parentKey 
 * @returns {Promise<number>}
 */
function getActiveChildCount(parentKey) {
    return getChildHubbles(parentKey).then(children => {
        var count = 0;

        for (var childkey in children) {
            if (children.hasOwnProperty(childkey)) {
                var childhubble = children[childkey];
                if (childhubble.active) {
                    count++;
                }
            }
        }

        return count;
    });
}

/**
 * 
 * 
 * @param {string} parentKey 
 * @param {number} count
 */
function setActiveChildCount(parentKey, count) {
    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref('users/' + userId + '/hubbles/' + parentKey + '/activechildren').set(count);
}

/**
 * 
 * 
 * @param {string} parentKey 
 */
function updateShallowActiveChildCount(parentKey) {
    getActiveChildCount(parentKey).then(count => {
        setActiveChildCount(parentKey, count);
    });
}

/**
 * 
 * 
 * @param {firebase.database.Reference} hubbleRef 
 */
function updateActive(hubbleRef) {
    return hubbleRef.once('value').then(
        snapshot => {
            const hubble = snapshot.val();
            hubbleRef.child('active').set(isactive(hubble.snoozed, hubble.done, hubble.activechildren));
            updateShallowActiveChildCount(hubble.parent);
        });
}

function setActive(key, active) {
    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref('users/' + userId + '/hubbles/' + key + '/active').set(active);
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
        updateActive(hubbleref);
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
        updateActive(hubbleref);
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
 * @param {string} parentKey 
 * @returns {Promise<object>}
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
 * @param {string} parentKey 
 * @returns {Promise<object>}
 */
function listenChildHubbleChanges(parentKey) {
    var user = firebase.auth().currentUser;
    var database = firebase.database();
    var dataPath = 'users/' + user.uid + '/hubbles';
    var query = database.ref(dataPath).orderByChild('parent').equalTo(parentKey);
    return query.on("value",
        function(snapshot) {
            return snapshot.val();
        });
}

/**
 * 
 * 
 * @param {string} key 
 * @returns {Promise<object>}
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
 * @param {string} key 
 * @returns {object}
 */
function listenHubbleChanges(key) {
    var user = firebase.auth().currentUser;
    var database = firebase.database();
    if (user !== null) {
        var dataPath = 'users/' + user.uid + '/hubbles/' + key;
        var hubbleRef = database.ref(dataPath);
        return hubbleRef.on('value', function(result) {
            var hubble = result.val();
            hubble.key = key;
            return hubble;
        });
    }
    return null;
}