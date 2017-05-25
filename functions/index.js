'use strict';

var functions = require('firebase-functions');

// if done changes, update "active"
exports.donechange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/done/{done}').onWrite(event => {
    return updateactive(event.data.ref.parent);
});

// if snooze changes, update "active"
exports.snoozedchange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/snoozed/{snoozed}').onWrite(event => {
    return updateactive(event.data.ref.parent);
});

// if active child count changes, update "active"
exports.activecountchange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/activechildcount/{activecount}').onWrite(event => {
    return updateactive(event.data.ref.parent);
});

// if active changes, update "active-child-count of parent"
exports.activechange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/active/{active}').onWrite(event => {
    const parentKeyRef = event.data.ref.child('parent').ref;
    parentKeyRef.once('value').then(parentkey => updateActiveChildCount(functions.database.ref('/users/{uid}/hubbles/' + parentkey)))
});

// if parent changes, update "active-child-count of parent"
exports.parentchange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/parent/{parentkey}').onWrite(event => {
    event.data.ref.once('value').then(parentkey => updateActiveChildCount(functions.database.ref('/users/{uid}/hubbles/' + parentkey)));
    event.data.previous.ref.once('value').then(parentkey => updateActiveChildCount(functions.database.ref('/users/{uid}/hubbles/' + parentkey)));
});

/**
 * 
 * 
 * @param {admin.database.Reference} hubbleRef 
 */
function updateactive(hubbleRef) {
    return hubbleRef.once(
        hubble => { return hubbleRef.child('active').set(isactive(hubble.snoozed, hubble.done, hubble.activechildcount)) }
    );
}

/**
 * 
 * 
 * @param {boolean} snoozed 
 * @param {boolean} done 
 * @param {number} activechilds 
 * @returns 
 */
function isactive(snoozed, done, activechilds) {
    return !snoozed && (!done || (activechilds > 0))
}

/**
 * 
 * 
 * @param {admin.database.Reference} hubbleRef 
 */
function updateActiveChildCount(hubbleRef) {

    return hubbleRef.child('key').once(parentKey => {
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