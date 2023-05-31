
// import { Hubble } from "./data.js";
import { getDatabase, ref, get, query as dbQuery } from "firebase/database";
import { getAuth } from "firebase/auth";
import { collection, doc, getFirestore, query as fsQuery } from "firebase/firestore";

const rootKey = "-KlYdxmFkIiWOFXp0UIP";

function sanatizeAllChildrenLists() {
  // const rootConnection = new Hubble(rootKey);
  // rootConnection.recurse(false, hubble => hubble.rebuildChildren());
  // rootConnection.recurse(false, hubble => hubble.position.rebuild());
}

function sanatizeAllActivity() {
  // const rootConnection = new Hubble(rootKey);
  // rootConnection.recurse(true, hubble => {
  //     hubble.activechildren.rebuild();
  //     hubble.active.rebuild();
  // });
  // const tempHubble = new Hubble("-KlYdxoY9rmo9CJhL7k3");
  // tempHubble.rebuildChildren();
}

async function count() {
  const realtimedb = getDatabase();
  const user = getAuth().currentUser;
  const refAllData = ref(realtimedb, "/users/" + user.uid);
  const returnObject = await get(refAllData);
  const data = returnObject.val();
}
