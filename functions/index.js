'use strict';

var functions = require('firebase-functions');

// if done changes, update "active"
exports.donechange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/done').onWrite(event => {
    return updateactive(event.data.ref.parent);
});

// if snooze changes, update "active"
exports.snoozedchange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/snoozed').onWrite(event => {
    return updateactive(event.data.ref.parent);
});

// if active child count changes, update "active"
exports.activecountchange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/activechildcount').onWrite(event => {
    return updateactive(event.data.ref.parent);
});

// if active changes, update "active-child-count of parent"
exports.activechange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/active').onWrite(event => {
    if (false) {
        const parentKeyRef = event.data.ref.child('parent').ref;
        parentKeyRef.once('value').then(snapshot => {
            const hubble_key = snapshot.val();
            updateActiveChildCount(functions.database.ref('/users/{uid}/hubbles/' + hubble_key));
        });
    }
});

// if parent changes, update "active-child-count of parent"
exports.parentchange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/parent').onWrite(event => {
    if (false) {
        event.data.ref.once('value').then(snapshot => updateActiveChildCount(functions.database.ref('/users/{uid}/hubbles/' + snapshot.val())));
        event.data.previous.ref.once('value').then(snapshot => updateActiveChildCount(functions.database.ref('/users/{uid}/hubbles/' + snapshot.val())));
    }
});

/**
 * 
 * 
 * @param {admin.database.Reference} hubbleRef 
 */
function updateactive(hubbleRef) {
    return hubbleRef.once('value').then(
        snapshot => {
            const hubble = snapshot.val();
            return hubbleRef.child('active').set(isactive(hubble.snoozed, hubble.done, 0));
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
 * @param {admin.database.Reference} hubbleRef 
 */
function updateActiveChildCount(hubbleRef) {

    return hubbleRef.child('key').once('value').then(snapshot => {
        const parentKey = snapshot.val();
        return query = hubbleRef.parent.orderByChild('parent').equalTo(parentKey).orderByChild('active').equalTo(true);
    }).then(query => {
        return query.once('value').then(
            snapshot => {
                return snapshot.numChildren();
            }).then(
            number => {
                hubbleRef.child('activechildcount').set(number);
            }
        );
    });
}