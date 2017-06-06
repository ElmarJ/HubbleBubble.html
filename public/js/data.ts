
interface Hubble {
    snoozed: boolean,
    done: boolean,
    activechildren: number,
    content: string,
    parent: string,
    active: boolean,
    key: string
}

function updateDeepActiveChildCount(key: string): firebase.Promise<void> {
    return getChildHubbles(key)
        .then(children => {
            var activeChildrenCount: number = 0;

            // create promise for each child to update and count children:
            var childUpdatePromises: Array<firebase.Promise<boolean>> = [];

            for (var childkey in children) {
                if (children.hasOwnProperty(childkey)) {
                    var childhubble: Hubble = children[childkey];
                    // create promise for this child:
                    const childUpdatePromise: firebase.Promise<boolean> = updateDeepActiveChildCount(childkey)
                        .then(function (): boolean {
                            // update child activity:
                            const childActive: boolean = isactive(childhubble.snoozed, childhubble.done, childhubble.activechildren);
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
                        if (isActive) activeCount++;
                    }, this);

                    setActiveChildCount(key, activeCount);
                });
        });
}

function getActiveChildCount(parentKey: string): firebase.Promise<number> {
    return getChildHubbles(parentKey).then(
        function (children): number {
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

function setActiveChildCount(parentKey: string, count: number) {
    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref('users/' + userId + '/hubbles/' + parentKey + '/activechildren').set(count);
}


function updateShallowActiveChildCount(parentKey: string) {
    getActiveChildCount(parentKey).then(count => {
        setActiveChildCount(parentKey, count);
    });
}

function updateActive(hubbleRef: firebase.database.Reference) {
    return hubbleRef.once('value').then(
        snapshot => {
            const hubble = snapshot.val();
            hubbleRef.child('active').set(isactive(hubble.snoozed, hubble.done, hubble.activechildren));
            updateShallowActiveChildCount(hubble.parent);
        });
}

function setActive(key: string, active: boolean) {
    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref('users/' + userId + '/hubbles/' + key + '/active').set(active);
}

function isactive(snoozed: boolean, done: boolean, activechildren: number) {
    return !snoozed && (!done || (activechildren > 0))
}

function newHubble(parent_key: string): string {
    var userId = firebase.auth().currentUser.uid;
    var key = firebase.database().ref().child('hubbles').push().key;
    firebase.database().ref('users/' + userId + '/hubbles/' + key + '/parent').set(parent_key);
    firebase.database().ref('users/' + userId + '/hubbles/' + key + '/content').set("");
    return key;
}

function saveHubbleContent(key: string, content: string) {
    var user = firebase.auth().currentUser;
    if (user !== null) {
        firebase.database().ref('users/' + user.uid + '/hubbles/' + key + '/content').set(content);
    }
}

function saveHubbleDoneStatus(key: string, isDone: boolean) {
    var user = firebase.auth().currentUser;
    if (user !== null) {
        const hubbleref = firebase.database().ref('users/' + user.uid + '/hubbles/' + key);
        hubbleref.child('/done').set(isDone);
        updateActive(hubbleref);
    }
}

function saveHubbleSnoozeStatus(key: string, isSnoozed: boolean) {
    var user = firebase.auth().currentUser;
    if (user !== null) {
        const hubbleref = firebase.database().ref('users/' + user.uid + '/hubbles/' + key);
        hubbleref.child('snoozed').set(isSnoozed);
        updateActive(hubbleref);
    }
}

function moveHubble(key: string, destination_key: string) {
    var userId = firebase.auth().currentUser.uid;
    firebase.database().ref('users/' + userId + '/hubbles/' + key + '/parent').set(destination_key);
}

/**
 * 
 * 
 * @param {string} parentKey 
 * @returns {Promise<object>}
 */
function getChildHubbles(parentKey: string): firebase.Promise<Hubble> {
    var user = firebase.auth().currentUser;
    var database = firebase.database();
    var dataPath = 'users/' + user.uid + '/hubbles';
    var query = database.ref(dataPath).orderByChild('parent').equalTo(parentKey);
    return query.once('value').then(
        function (snapshot): Hubble {
            return <Hubble>(snapshot.val());
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
        function (snapshot) {
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
        return hubbleRef.once('value').then(function (result) {
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
        return hubbleRef.on('value', function (result) {
            var hubble = result.val();
            hubble.key = key;
            return hubble;
        });
    }
    return null;
}