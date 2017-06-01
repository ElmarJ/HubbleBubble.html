var uiConfig = {
    'callbacks': {
        'signInSuccess': function (user, credential, redirectUrl) {
            handleSignedInUser(user);
            return false;
        }
    },
    'signInFlow': 'popup',
    'signInOptions': [
        {
            provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
            scopes: ['https://www.googleapis.com/auth/plus.login']
        },
        {
            provider: firebase.auth.FacebookAuthProvider.PROVIDER_ID,
            scopes: [
                'public_profile',
                'email',
                'user_likes',
                'user_friends'
            ]
        },
        firebase.auth.TwitterAuthProvider.PROVIDER_ID,
        firebase.auth.GithubAuthProvider.PROVIDER_ID,
        {
            provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
            requireDisplayName: true
        }
    ],
    'tosUrl': 'https://www.google.com'
};
var ui = new firebaseui.auth.AuthUI(firebase.auth());
var currentUid = null;
var handleSignedInUser = function (user) {
    currentUid = user.uid;
    document.getElementById('user-signed-in').style.display = 'block';
    document.getElementById('user-signed-out').style.display = 'none';
};
var handleSignedOutUser = function () {
    document.getElementById('user-signed-in').style.display = 'none';
    document.getElementById('user-signed-out').style.display = 'block';
    ui.start('#firebaseui-container', uiConfig);
};
firebase.auth().onAuthStateChanged(function (user) {
    if (user && user.uid === currentUid) {
        return;
    }
    document.getElementById('loading').style.display = 'none';
    document.getElementById('loaded').style.display = 'block';
    user ? handleSignedInUser(user) : handleSignedOutUser();
    updatePresenter();
});
var deleteAccount = function () {
    firebase.auth().currentUser.delete().catch(function (error) {
        if (error.code === 'auth/requires-recent-login') {
            firebase.auth().signOut().then(function () {
                setTimeout(function () {
                    alert('Please sign in again to delete your account.');
                }, 1);
            });
        }
    });
};
var initApp = function () {
    document.getElementById('sign-out').addEventListener('click', function () {
        firebase.auth().signOut();
    });
};
window.addEventListener('load', initApp);
//# sourceMappingURL=authentication.js.map