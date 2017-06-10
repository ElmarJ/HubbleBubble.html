const rootKey = "-KlYdxmFkIiWOFXp0UIP";

function sanatizeAllChildrenLists() {
    const rootConnection = new HubbleConnection(rootKey);
    rootConnection.recurse(false, conn => conn.children.rebuild());
}


function sanatizeAllActivity() {
    const rootConnection = new HubbleConnection(rootKey);
    rootConnection.recurse(true, conn => {
        conn.activechildren.rebuild();
        conn.active.rebuild();
    });
}