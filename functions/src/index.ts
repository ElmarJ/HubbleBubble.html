import * as functions from "firebase-functions";
import { database } from "firebase-admin";

admin.initializeApp(functions.config().firebase);

// Update the "active" property
const updateMyActivity = functions.firestore
  .document("users/{userId}/hubbles/{hubbleId}")
  .onUpdate(async event => {
    const newValue = event.data.data();

    const computedActivity = isActive(
      newValue.snoozed,
      newValue.done,
      newValue.activechildren
    );

    // Only update if the current value is incorrect
    if (newValue.active !== computedActivity) {
      await event.data.ref.set({
        active: computedActivity
      });
    }
  });

const updateParentActiveChildCount = functions.firestore
  .document("users/{userId}/hubbles/{hubbleId}")
  .onUpdate(async event => {
    const newValue = event.data.data();
    const oldValue = event.data.previous.data();

    // If neither activity nor parent changed, nothing is to be updated
    if (
      newValue.active === oldValue.active &&
      newValue.parent === oldValue.parent
    )
      return;

    // Not super efficient, but very straight forward:
    //    first reduce old parent's activity (if I was active)

    if (oldValue.active) {
      const parentRef = oldValue.parent;
      const parent = (await parentRef.ref.get()).data();
      parentRef.set({ activechildren: parent.activechildren-- });
    }

    //    then increase new parent's activity (if I am active)
    if (newValue.active) {
      const parentRef = newValue.parent;
      const parent = (await parentRef.ref.get()).data();
      parentRef.set({ activechildren: parent.activechildren++ });
    }
  });

function isActive(snoozed: boolean, done: boolean, activechildren: number) {
  return !snoozed && (!done || activechildren > 0);
}
