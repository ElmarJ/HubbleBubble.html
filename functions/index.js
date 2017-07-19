'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// if done changes, update "active"
exports.donechange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/done').onWrite(event => {
    return updateActivity(event.data.ref.parent);
});

// if snooze changes, update "active"
exports.snoozedchange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/snoozed').onWrite(event => {
    return updateActivity(event.data.ref.parent);
});

// if number of active children changes, update "active"
exports.activechildrenchange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/activechildren').onWrite(event => {
    return updateActivity(event.data.ref.parent);
});

// // if activity changes, update "active children count" of parent
// exports.activechange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/active').onWrite(event => {
//     return updateActivityCountParent(event.data.ref.parent, event.data.val());
// });

// // if child show up, set me as its parent.
// exports.childrenlistentrychange = functions.database.ref('/users/{uid}/childrenof/{parentkey}/{childkey}').onWrite(event => {
//     // 1. set parentkey of child hubble
//     // 2. sanitation: remove all other childrenof entries with same child key (if present)
//     const childKey = event.data.val();
//     const thisHubbleRef = event.data.ref.parent.parent;

//     if (childKey) {
//         const childsParentKeyRef = thisHubbleRef.parent.child(childKey).child("parent");
//         return childsParentKeyRef.set(thisHubbleRef.key);
//     }
// });

// exports.childrenlistchange = functions.database.ref('/users/{uid}/childrenof/{parentkey}').onWrite(event => {
//     // 1. recount active children of parent hubble.

//     // a complete recount - even when children have only been sorted - is not the most efficient way to do this
//     // Solution: move this logic to parent-change, and substract one from old parent + add one to new parent if 
//     // hubble is active.

//     const children = event.data.val();
//     const activeChildCountRef = event.data.ref.parent.child("activechildren");

//     const promisesToGetChildActivity = [];

//     for (let childkey in children) {
//         const ref = event.data.ref.parent.parent.child(childkey).child("active");
//         promisesToGetChildActivity.push(ref.once("value").then(snapshot => snapshot.val()));
//     }

//     return Promise.all(promisesToGetChildActivity).then(childActivities => {
//         const activeChildCount = childActivities.reduce((counter, activity) => {
//             if (activity) counter++;
//             return counter;
//         }, 0);
//         activeChildCountRef.set(activeChildCount);
//     });
// });

/**
 * 
 * 
 * @param {admin.database.Reference} hubbleRef 
 */
function updateActivity(hubbleRef) {
    return hubbleRef.once('value').then(snapshot => {
        var hubble = snapshot.val();
        var activity = isActive(hubble.snoozed, hubble.done, hubble.activechildren);
        hubbleRef.child('active').set(activity);
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
function isActive(snoozed, done, activechildren) {
    return !snoozed && (!done || (activechildren > 0))
}

// function updateActivityCountParent(hubbleRef, newValue) {
//     return getParentRef(hubbleRef).then(parentRef => {
//         return parentRef.child('activechildren').once('value').then(childCountSnapshot => {
//             var count = childCountSnapshot.val();
//             if (newValue) count++;
//             else count--;
//             if (count < 0) count = 0;
//             parentRef.child('activechildren').set(count);
//         });
//     });
// }

// function getParentRef(hubbleRef) {
//     return hubbleRef.child('parent').once('value').then(parentSnapshot => {
//         var key = parentSnapshot.val();
//         return hubbleRef.parent.child(key);
//     });
// }