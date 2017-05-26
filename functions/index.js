// /*'use strict';

// const functions = require('firebase-functions');
// const admin = require('firebase-admin');
// admin.initializeApp(functions.config().firebase);


// // if done changes, update "active"
// exports.donechange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/done').onWrite(event => {
//     return updateactive(event.data.ref.parent);
// });

// // if snooze changes, update "active"
// exports.snoozedchange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/snoozed').onWrite(event => {
//     return updateactive(event.data.ref.parent);
// });

// // if active child count changes, update "active"
// exports.activecountchange = functions.database.ref('/users/{uid}/hubbles/{hubblekey}/activechildren').onWrite(event => {
//     return updateactive(event.data.ref.parent);
// });

// /**
//  * 
//  * 
//  * @param {admin.database.Reference} hubbleRef 
//  */
// function updateactive(hubbleRef) {
//     return hubbleRef.once('value').then(
//         snapshot => {
//             const hubble = snapshot.val();
//             return hubbleRef.child('active').set(isactive(hubble.snoozed, hubble.done, hubble.activechildren));
//         });
// }

// /**
//  * 
//  * 
//  * @param {boolean} snoozed 
//  * @param {boolean} done 
//  * @param {number} activechilds 
//  * @returns 
//  */
// function isactive(snoozed, done, activechildren) {
//     return !snoozed && (!done || (activechildren > 0))
// }*/