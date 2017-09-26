import { Hubble } from "./data.js";

const rootKey = "-KlYdxmFkIiWOFXp0UIP";

export function sanatizeAllChildrenLists() {
    const rootConnection = new Hubble(rootKey);
    rootConnection.recurse(false, hubble => hubble.rebuildChildren());
    // rootConnection.recurse(false, hubble => hubble.position.rebuild());
}

export function sanatizeAllActivity() {
    // const rootConnection = new Hubble(rootKey);
    // rootConnection.recurse(true, hubble => {
    //     hubble.activechildren.rebuild();
    //     hubble.active.rebuild();
    // });

    const tempHubble = new Hubble("-KlYdxoY9rmo9CJhL7k3");
    tempHubble.rebuildChildren();
}