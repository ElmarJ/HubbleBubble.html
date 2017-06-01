function updateDeepActiveChildCount(key) {
    return getChildHubbles(key)
        .then(children => {
        var activeChildrenCount = 0;
        var childUpdatePromises = [];
        for (var childkey in children) {
            if (children.hasOwnProperty(childkey)) {
                var childhubble = children[childkey];
                const childUpdatePromise = updateDeepActiveChildCount(childkey)
                    .then(function () {
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
            activeList.forEach(function (isActive) {
                if (isActive)
                    activeCount++;
            }, this);
            setActiveChildCount(key, activeCount);
        });
    });
}
function getActiveChildCount(parentKey) {
    return getChildHubbles(parentKey).then(function (children) {
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
function setActiveChildCount(parentKey, count) {
    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref('users/' + userId + '/hubbles/' + parentKey + '/activechildren').set(count);
}
function updateShallowActiveChildCount(parentKey) {
    getActiveChildCount(parentKey).then(count => {
        setActiveChildCount(parentKey, count);
    });
}
function updateActive(hubbleRef) {
    return hubbleRef.once('value').then(snapshot => {
        const hubble = snapshot.val();
        hubbleRef.child('active').set(isactive(hubble.snoozed, hubble.done, hubble.activechildren));
        updateShallowActiveChildCount(hubble.parent);
    });
}
function setActive(key, active) {
    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref('users/' + userId + '/hubbles/' + key + '/active').set(active);
}
function isactive(snoozed, done, activechildren) {
    return !snoozed && (!done || (activechildren > 0));
}
function newHubble(parent_key) {
    var userId = firebase.auth().currentUser.uid;
    var key = firebase.database().ref().child('hubbles').push().key;
    firebase.database().ref('users/' + userId + '/hubbles/' + key + '/parent').set(parent_key);
    firebase.database().ref('users/' + userId + '/hubbles/' + key + '/content').set("");
    return key;
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
        updateActive(hubbleref);
    }
}
function saveHubbleSnoozeStatus(key, isSnoozed) {
    var user = firebase.auth().currentUser;
    if (user !== null) {
        const hubbleref = firebase.database().ref('users/' + user.uid + '/hubbles/' + key);
        hubbleref.child('snoozed').set(isSnoozed);
        updateActive(hubbleref);
    }
}
function moveHubble(key, destination_key) {
    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref('users/' + userId + '/hubbles/' + key + '/parent').set(destination_key);
}
function getChildHubbles(parentKey) {
    var user = firebase.auth().currentUser;
    var database = firebase.database();
    var dataPath = 'users/' + user.uid + '/hubbles';
    var query = database.ref(dataPath).orderByChild('parent').equalTo(parentKey);
    return query.once('value').then(function (snapshot) {
        return (snapshot.val());
    });
}
function listenChildHubbleChanges(parentKey) {
    var user = firebase.auth().currentUser;
    var database = firebase.database();
    var dataPath = 'users/' + user.uid + '/hubbles';
    var query = database.ref(dataPath).orderByChild('parent').equalTo(parentKey);
    return query.on("value", function (snapshot) {
        return snapshot.val();
    });
}
function getHubble(key) {
    var user = firebase.auth().currentUser;
    var database = firebase.database();
    if (user !== null) {
        var dataPath = 'users/' + user.uid + '/hubbles/' + key;
        var hubbleRef = database.ref(dataPath);
        return hubbleRef.once('value').then(function (result) {
            var hubble = result.val();
            hubble.key = key;
            return hubble;
        });
    }
    return null;
}
function listenHubbleChanges(key) {
    var user = firebase.auth().currentUser;
    var database = firebase.database();
    if (user !== null) {
        var dataPath = 'users/' + user.uid + '/hubbles/' + key;
        var hubbleRef = database.ref(dataPath);
        return hubbleRef.on('value', function (result) {
            var hubble = result.val();
            hubble.key = key;
            return hubble;
        });
    }
    return null;
}
//# sourceMappingURL=data.js.map