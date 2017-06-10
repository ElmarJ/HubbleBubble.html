

interface Hubble {
    snoozed: boolean;
    done: boolean;
    activechildren: number;
    content: string;
    parent: string;
    active: boolean;
    key: string;
    children: string[];
}

class HubbleProperty<T>{
    name: string;
    connection: HubbleConnection;
    ref: firebase.database.Reference;
    prepareChange: (newValue: T) => void;

    constructor(name: string, connection: HubbleConnection) {
        this.name = name;
        this.connection = connection;
        this.ref = connection.ref.child(this.name);
        this.prepareChange = (value) => { };
    }

    get() {
        return <Promise<T>>this.ref.once('value').then(snapshot => snapshot.val());
    }

    set(value: T) {
        this.prepareChange(value);
        return this.ref.set(value);
    }

    update(newValueCreator: (hubbleConnection: HubbleConnection) => T) {
        return <Promise<void>>this.set(newValueCreator(this.connection));
    }
}

class IsActiveHubbleProperty extends HubbleProperty<boolean>{
    rebuild() {
        return this.connection.getProperties([this.connection.snoozed, this.connection.done, this.connection.activechildren]).then(hubble => {
            this.set(!hubble.snoozed && (!hubble.done || (hubble.activechildren > 0)));
        });
    }
}

class ActivityChildCountHubbleProperty extends HubbleProperty<number>{
    rebuild() {
        return this.connection.children.connections().then(connections => {
            const promisesToGetChildActivity = connections.map(connection => connection.active.get());

            Promise.all(promisesToGetChildActivity).then(childActivities => {
                var activeChildCount = 0;
                for (const childIsActive of childActivities) {
                    if (childIsActive) activeChildCount++;
                }
                this.set(activeChildCount);
            });
        });
    }
}

class StatusHubbleProperty extends HubbleProperty<boolean>{
    constructor(name: string, connection: HubbleConnection) {
        super(name, connection);
        this.prepareChange = newvVal => connection.active.rebuild();
    }
}

class ParentHubbleProperty extends HubbleProperty<string> {
    parentConnection() {
        return this.get().then(value => new HubbleConnection(value));
    }
}

class ChildrenProperty extends HubbleProperty<string[]> {
    rebuild() {
        // Need to get the old child-query from previous code version to sanatize properly
        // Query to all hubbles that have me as a parent (i.e. my children):
        const childrenQuery = this.ref.parent.orderByChild("parent").equalTo(this.connection.hubbleKey);
        return childrenQuery.once("value",
            snapshot => {
                const childKeyList: string[] = [];
                const childKeys = snapshot.val();
                for (var childKey in childKeys) {
                    childKeyList.push(childKey);
                }
                return childKeyList;
            }).then(childKeyList => this.set(childKeyList));
    }

    add(key: string) {
        return this.get().then(children => {
            children.push(key);
            this.set(children);
        });
    }

    remove(key: string) {
        return this.get().then(children => {
            children.splice(children.indexOf(key), 1);
            this.set(children);
        });
    }

    connections() {
        return this.get().then(childKeys => {
            return childKeys.map(childKey => new HubbleConnection(childKey));
        });
    }
}

class HubbleConnection {
    database = firebase.database();
    user = firebase.auth().currentUser;
    hubbleKey: string;
    ref: firebase.database.Reference;

    parent = new ParentHubbleProperty("parent", this);
    children = new ChildrenProperty("children", this);
    content = new HubbleProperty<string>("content", this);
    active = new IsActiveHubbleProperty("active", this);
    snoozed = new StatusHubbleProperty("snoozed", this);
    done = new StatusHubbleProperty("done", this);
    activechildren = new ActivityChildCountHubbleProperty("activechildren", this);

    constructor(hubbleKey: string) {
        this.hubbleKey = hubbleKey;
        this.ref = this.database.ref('users/' + this.user.uid + '/hubbles/' + hubbleKey);
    }

    getHubble() {
        return <Promise<Hubble>>this.ref.once('value').then(snapshot => {
            const hubble = <Hubble>snapshot.val();
            hubble.key = this.hubbleKey;
            return hubble;
        });
    }

    getProperties(properties: HubbleProperty<any>[]) {
        const promises = properties.map(property => property.get().then(value => ({ name: property.name, value: value })));
        return Promise.all(promises).then(properties => {
            const hubble = <Hubble>(new Object);
            for (const property of properties) {
                hubble[property.name] = property.value;
            }
            return hubble;
        });
    }

    move(newParent: HubbleConnection) {
        return this.parent.parentConnection().then(oldParent => {
            oldParent.children.remove(this.hubbleKey);
            newParent.children.add(this.hubbleKey);
            this.parent.set(newParent.hubbleKey);
        });
    }

    sanatize() {
        return this.children.rebuild().then(value => this.activechildren.rebuild()).then(value => this.active.rebuild());
    }

    recurse(childrenFirst: boolean, task: (hubbleConnection: HubbleConnection) => void) {
        // If not childrenFirst, first do it for myself:
        if (!childrenFirst) {
            task(this);
        }

        // then, get child hubbles and do it for all my children:
        this.children.connections().then(childConnections => {
            for (const childConnection of childConnections) {
                childConnection.recurse(childrenFirst, task);
            }
        })

        // if childrenFirst, do it for myself now:
        if (childrenFirst) {
            task(this);
        }
    }

    newChild(): HubbleConnection {
        var childConnection = new HubbleConnection(this.ref.parent.push().key)
        childConnection.parent.set(this.hubbleKey);
        childConnection.content.set("");
        childConnection.snoozed.set(false);
        childConnection.done.set(false);
        this.children.get().then(children => children.push(childConnection.hubbleKey));
        return childConnection;
    }
}


const rootKey = "-KlYdxmFkIiWOFXp0UIP";



function sanatizeAll(connection: HubbleConnection) {
    connection.recurse(true, conn => conn.sanatize());
}