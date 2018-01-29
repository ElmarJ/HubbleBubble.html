import firebase from '../node_modules/@firebase/app/dist/esm/index';

/**
 * FirebaseUI initialization to be used in a Single Page application context.
 */
// FirebaseUI config.
var uiConfig = {
  callbacks: {
    // Called when the user has been successfully signed in.
    signInSuccess: function(user, credential, redirectUrl) {
      handleSignedInUser(user);
      // Do not redirect.
      return false;
    }
  },
  // Opens IDP Providers sign-in flow in a popup.
  signInFlow: "popup",
  signInOptions: [
    // TODO(developer): Remove the providers you don't need for your app.
    {
      provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
      // Whether the display name should be displayed in Sign Up page.
      requireDisplayName: true
    }
  ],
  // Terms of service url.
  tosUrl: "https://hubblebubble.elmarjansen.nl"
};

// Initialize the FirebaseUI Widget using Firebase.
var ui = new firebaseui.auth.AuthUI(firebase.auth());

// Keep track of the currently signed in user.
var currentUid: string;

var handleSignedInUser = function(user: firebase.User) {
  window.location.href = "/";
};

/**
 * Displays the UI for a signed out user.
 */
var handleSignedOutUser = function() {
  document.getElementById("user-signed-out").style.display = "block";
  ui.start("#firebaseui-container", uiConfig);
};

// Listen to change in auth state so it displays the correct UI for when
// the user is signed in or not.
firebase.auth().onAuthStateChanged(function(user) {
  // The observer is also triggered when the user's token has expired and is
  // automatically refreshed. In that case, the user hasn't changed so we should
  // not update the UI.
  if (user && user.uid === currentUid) {
    return;
  }
  document.getElementById("loading").style.display = "none";
  document.getElementById("loaded").style.display = "block";
  user ? handleSignedInUser(user) : handleSignedOutUser();
});

/**
 * Deletes the user's account.
 */
var deleteAccount = function() {
  firebase
    .auth()
    .currentUser.delete()
    .catch(function(error) {
      if ((<any>error).code === "auth/requires-recent-login") {
        // The user's credential is too old. She needs to sign in again.
        firebase
          .auth()
          .signOut()
          .then(function() {
            // The timeout allows the message to be displayed after the UI has
            // changed to the signed out state.
            setTimeout(function() {
              alert("Please sign in again to delete your account.");
            }, 1);
          });
      }
    });
};

/**
 * Initializes the app.
 */
var initApp = function() {
  // signout user if still signed in:
  firebase.auth().signOut();
};

window.addEventListener("load", initApp);
