var database = firebase.database();

function getRootKey() {
    return "-KkH0zfUpacGriWPSDZK";
}

function getHubble(key) {
    var user = firebase.auth().currentUser;
    if (user !== null) {
        var dataPath = 'users/' + user.uid + '/hubbles/' + key;
        var hubbleRef = database.ref(dataPath);
        return hubbleRef.once('value').then(function(result) { return result.val(); });
    }
    return null;
}

function getChildHubbles(parentKey) {
    var user = firebase.auth().currentUser;
    var dataPath = 'users/' + user.uid + '/hubbles';
    var query = firebase.database().ref(dataPath).orderByChild('parent').equalTo(parentKey);
    var result = query.once('value').then(
        function(snapshot) {
            return snapshot.val();
        });
    return result;
}