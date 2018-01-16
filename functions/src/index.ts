import * as functions from "firebase-functions";
import { database } from "firebase-admin";

admin.initializeApp(functions.config().firebase);

// if done changes, update "active"
const donechange = functions.database
  .ref("/users/{uid}/hubbles/{hubblekey}/done")
  .onWrite(event => {
    return updateActivity(event.data.ref.parent);
  });

// if snooze changes, update "active"
const snoozedchange = functions.database
  .ref("/users/{uid}/hubbles/{hubblekey}/snoozed")
  .onWrite(event => updateActivity(event.data.ref.parent));

// if number of active children changes, update "active"
const activechildrenchange = functions.database
  .ref("/users/{uid}/hubbles/{hubblekey}/activechildren")
  .onWrite(event => updateActivity(event.data.ref.parent));

// if activity changes, update "active children count" of parent
const activechange = functions.database
  .ref("/users/{uid}/hubbles/{hubblekey}/active")
  .onWrite(event =>
    updateActivityCountParent(event.data.ref.parent, event.data.val())
  );

// if child show up, set me as its parent.
const childrenlistentrychange = functions.database
  .ref("/users/{uid}/childrenof/{parentkey}/{childkey}")
  .onWrite(event => {
    // 1. set parentkey of child hubble
    // 2. sanitation: remove all other childrenof entries with same child key (if present)
    const childKey = event.data.val();
    const thisHubbleRef = event.data.ref.parent.parent;

    if (childKey) {
      const childsParentKeyRef = thisHubbleRef.parent
        .child(childKey)
        .child("parent");
      return childsParentKeyRef.set(thisHubbleRef.key);
    }

    return null;
  });

const childrenlistchange = functions.database
  .ref("/users/{uid}/childrenof/{parentkey}")
  .onWrite(async event => {
    // 1. recount active children of parent hubble.

    // a complete recount - even when children have only been sorted - is not the most efficient way to do this
    // Solution: move this logic to parent-change, and substract one from old parent + add one to new parent if
    // hubble is active.

    const children = event.data.val();
    const activeChildCountRef = event.data.ref.parent.child("activechildren");

    const promisesToGetChildActivity = [];

    for (const childkey in children) {
      const ref = event.data.ref.parent.parent.child(childkey).child("active");
      promisesToGetChildActivity.push(async () =>
        (await ref.once("value")).val()
      );
    }

    const childActivities = await Promise.all(promisesToGetChildActivity);

    const activeChildCount = childActivities.reduce((counter, activity) => {
      if (activity) return counter + 1;
      return counter;
    }, 0);

    activeChildCountRef.set(activeChildCount);
  });

async function updateActivity(hubbleRef: database.Reference) {
  const snapshot = await hubbleRef.once("value");
  const hubble = snapshot.val();
  const activity = isActive(hubble.snoozed, hubble.done, hubble.activechildren);
  hubbleRef.child("active").set(activity);
}

function isActive(snoozed: boolean, done: boolean, activechildren: number) {
  return !snoozed && (!done || activechildren > 0);
}

function updateActivityCountParent(
  hubbleRef: database.Reference,
  newValue: boolean
) {
  return getParentRef(hubbleRef).then(parentRef => {
    return parentRef
      .child("activechildren")
      .once("value")
      .then(childCountSnapshot => {
        let count = childCountSnapshot.val();
        if (newValue) count++;
        else count--;
        if (count < 0) count = 0;
        parentRef.child("activechildren").set(count);
      });
  });
}

async function getParentRef(hubbleRef: database.Reference) {
  const parentSnapshot = await hubbleRef.child("parent").once("value");
  const key = parentSnapshot.val();
  return hubbleRef.parent.child(key);
}
