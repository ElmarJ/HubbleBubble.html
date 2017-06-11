

interface HubbleData {
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
    private name: string;
    protected myHubble: Hubble;
    prepareChange: (newValue: T) => void;

    constructor(name: string, hubble: Hubble) {
        this.name = name;
        this.myHubble = hubble;
        this.prepareChange = (value) => { };
    }

    get() {
        return <Promise<T>>this.ref().once('value').then(snapshot => snapshot.val());
    }

    set(value: T) {
        this.prepareChange(value);
        return this.ref().set(value);
    }

    update(newValueCreator: (Hubble: Hubble) => T) {
        return <Promise<void>>this.set(newValueCreator(this.myHubble));
    }

    ref() {
        return this.myHubble.ref.child(this.name);
    }
}

class IsActiveHubbleProperty extends HubbleProperty<boolean>{
    rebuild() {
        return this.myHubble.getProperties([this.myHubble.snoozed, this.myHubble.done, this.myHubble.activechildren]).then(hubble => {
            this.set(!hubble.snoozed && (!hubble.done || (hubble.activechildren > 0)));
            this.myHubble.parent.hubble().then(parent => parent.activechildren.rebuild());
        });
    }
}

class ActivityChildCountHubbleProperty extends HubbleProperty<number>{
    rebuild() {
        return this.myHubble.children.hubbles().then(hubbles => {
            const promisesToGetChildActivity = hubbles.map(hubble => hubble.active.get());

            Promise.all(promisesToGetChildActivity).then(childActivities => {
                var activeChildCount = 0;
                for (const childIsActive of childActivities) {
                    if (childIsActive) activeChildCount++;
                }
                this.set(activeChildCount);
                this.myHubble.active.rebuild();
            });
        });
    }
}

class StatusHubbleProperty extends HubbleProperty<boolean>{
    constructor(name: string, hubble: Hubble) {
        super(name, hubble);
        this.prepareChange = newvVal => hubble.active.rebuild();
    }
}

class ParentHubbleProperty extends HubbleProperty<string> {
    hubble() {
        return this.get().then(value => new Hubble(value));
    }
}

class ChildrenProperty extends HubbleProperty<string[]> {
    rebuild() {
        // Need to get the old child-query from previous code version to sanatize properly
        // Query to all hubbles that have me as a parent (i.e. my children):
        const childrenQuery = this.ref().parent.parent.orderByChild("parent").equalTo(this.myHubble.hubbleKey);
        return childrenQuery.once("value").then(
            snapshot => {
                const childKeyList: string[] = [];
                const childKeys = snapshot.val();
                for (var childKey in childKeys) {
                    childKeyList.push(childKey);
                }
                return childKeyList;
            }).then(childKeyList => {
                this.set(childKeyList)
            });
    }

    add(hubble: Hubble) {
        return this.ref().limitToLast(1).once("key").then(highestKey => {
            if(!highestKey) {
                highestKey = -1;
            }
            this.ref().child(String(highestKey + 1)).set(hubble.hubbleKey);
        });
    }

    remove(hubble: Hubble) {
        return this.get().then(children => {
            children.splice(children.indexOf(hubble.hubbleKey), 1);
            this.set(children);
        });
    }

    hubbles() {
        return this.get().then(childKeys => {
            if (childKeys) {
                return childKeys.map(childKey => new Hubble(childKey));
            }
            else {
                return [];
            }
        });
    }

    new() {
        var childConnection = new Hubble(this.myHubble.ref.parent.push().key)
        childConnection.parent.set(this.myHubble.hubbleKey);
        childConnection.content.set("");
        childConnection.snoozed.set(false);
        childConnection.done.set(false);
        this.add(childConnection);
        return childConnection;
    }
}

class Hubble {
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

    getHubbleData() {
        return <Promise<HubbleData>>this.ref.once('value').then(snapshot => {
            const hubble = <HubbleData>snapshot.val();
            hubble.key = this.hubbleKey;
            return hubble;
        });
    }

    getProperties(properties: HubbleProperty<any>[]) {
        const promises = properties.map(property => property.get().then(value => ({ name: property.name, value: value })));
        return Promise.all(promises).then(properties => {
            const hubble = <HubbleData>(new Object);
            for (const property of properties) {
                hubble[property.name] = property.value;
            }
            return hubble;
        });
    }

    move(newParent: Hubble) {
        return this.parent.hubble().then(oldParent => {
            oldParent.children.remove(this);
            newParent.children.add(this);
            this.parent.set(newParent.hubbleKey);
        });
    }

    delete() {
        this.parent.hubble().then(parent => parent.children.remove(this));
        this.ref.remove();
    }

    sanatize() {
        return this.children.rebuild().then(value => this.activechildren.rebuild());
    }

    recurse(childrenFirst: boolean, task: (Hubble: Hubble) => void) {
        // If not childrenFirst, first do it for myself:
        if (!childrenFirst) {
            task(this);
        }

        // then, get child hubbles and do it for all my children:
        this.children.hubbles().then(childConnections => {
            for (const childConnection of childConnections) {
                childConnection.recurse(childrenFirst, task);
            }
        })

        // if childrenFirst, do it for myself now:
        if (childrenFirst) {
            task(this);
        }
    }
}