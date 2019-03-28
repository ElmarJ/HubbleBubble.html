import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp(functions.config().firebase);

// Update the "active" property
export const updateMyActivityOnUpdate = functions.firestore
  .document("users/{userId}/hubbles/{hubbleId}")
  .onUpdate(async change => {
    const newValue = change.after.data();

    const computedActivity = isActive(
      newValue.snoozed,
      newValue.done,
      newValue.activechildren,
      newValue.scheduled
    );

    // Only update if the current value is incorrect
    if (newValue.active !== computedActivity) {
      await change.after.ref.set({
        active: computedActivity
      });
    }
  });

export const updateParentActiveChildCount = functions.firestore
  .document("users/{userId}/hubbles/{hubbleId}")
  .onWrite(async change => {
    const newValue = change.after.data();
    const oldValue = change.before.data();

    // If neither activity nor parent changed, nothing is to be updated
    if (
      oldValue &&
      newValue &&
      newValue.active === oldValue.active &&
      newValue.parent === oldValue.parent
    ) {
      return;
    }

    // Not super efficient, but very straight forward:
    //    first reduce old parent's activity (if I already existed and was active)

    if (oldValue && oldValue.active) {
      const parentRef = oldValue.parent;
      const parent = (await parentRef.ref.get()).data();
      parentRef.set({ activechildren: parent.activechildren-- });
    }

    //    then increase new parent's activity (if I still exist and am active)
    if (newValue && newValue.active) {
      const parentRef = newValue.parent;
      const parent = (await parentRef.ref.get()).data();
      parentRef.set({ activechildren: parent.activechildren++ });
    }
  });

function isActive(
  snoozed: boolean,
  done: boolean,
  activechildren: number,
  scheduled: Date
) {
  return !(snoozed || scheduled < new Date()) && (!done || activechildren > 0);
}
