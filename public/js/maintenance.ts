const rootKey = "-KlYdxmFkIiWOFXp0UIP";

function sanatizeAllChildrenLists() {
    const rootConnection = new Hubble(rootKey);
    rootConnection.recurse(false, hubble => hubble.children.rebuild());
}

function sanatizeAllActivity() {
    // const rootConnection = new Hubble(rootKey);
    // rootConnection.recurse(true, hubble => {
    //     hubble.activechildren.rebuild();
    //     hubble.active.rebuild();
    // });

    const tempHubble = new Hubble("-KlYdxoY9rmo9CJhL7k3");
    tempHubble.children.rebuild();
}