// import { Hubble } from "./data.js";

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
    const realtimedb = firebase.database();
    const user = firebase.auth().currentUser;
    const refAllData = realtimedb.ref("/users/" + user.uid);
    const returnObject = await refAllData.once("value");
    const data = returnObject.val();
    
}

async function exportRealtimeDBtoFirestore() {
    const realtimedb = firebase.database();
    const user = firebase.auth().currentUser;
    const refAllData = realtimedb.ref("/users/" + user.uid);
    const returnObject = await refAllData.once("value");
    const data = returnObject.val();

    const fsDb = firebase.firestore();
    const userDoc = fsDb.collection("users").doc(user.uid);
    const fsHubbles = userDoc.collection("hubbles");
    var count = 0;

    // for (let key in data.hubbles) {
    //     count++;
        
    //     let hubble = data.hubbles[key];
    //     hubble.oldKey = key;
    //     delete hubble.parent;

    //     const alreadyPresentResults = await fsHubbles.where("oldKey", "==", key).get();
        
    //     if(!alreadyPresentResults.docs[0]) {
    //         fsHubbles.add(hubble);
    //         console.log(`Adding hubble number ${count}`);
    //     }
    //     else {
    //         console.log(`This hubble is already present ${count}`)
    //     }
    // }
    
    count = 0;
    for (let parentKey in data.childrenof) {
        let position = 1;
        for (let childKey in data.childrenof[parentKey]) {
            var childSnapshot = await fsHubbles.where("oldKey", "==", childKey).get();
            var parentSnapshot = await fsHubbles.where("oldKey", "==", parentKey).get();
            count++;

            if(childSnapshot.docs && childSnapshot.docs[0] && childSnapshot.docs[0].ref && parentSnapshot.docs && parentSnapshot.docs[0] && parentSnapshot.docs[0].ref)
            {
                var child = childSnapshot.docs[0].ref;
                var parent = parentSnapshot.docs[0].ref;
                child.update({
                    parent: parent,
                    position: position++
                });

                console.log(`Storing parent for hubble ${count}`);
            }
            else {
                console.log(`Could not find parent for hubble ${count}`);
            }
        }
    }

    console.log(`Storing root reference`);    
    var rootSnapshot = await fsHubbles.where("oldKey", "==", data.root).get();
    var rootRef = rootSnapshot.docs[0].ref;
    fsHubbles.parent.set( { root: rootRef });

    console.log("done");
}