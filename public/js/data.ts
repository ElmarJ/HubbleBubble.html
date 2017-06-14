

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
    name: string;
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
        return <Promise<void>> this.ref().set(value);
    }

    update(newValueCreator: (Hubble: Hubble) => T) {
        return <Promise<void>> this.set(newValueCreator(this.myHubble));
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
                const activeChildCount = childActivities.reduce<number>((counter, activity) => {
                    if (activity) counter++; return counter;
                }, 0);
                this.set(activeChildCount);
                this.myHubble.active.rebuild();
            });
        });
    }
}

class StatusHubbleProperty extends HubbleProperty<boolean>{
    constructor(name: string, hubble: Hubble) {
        super(name, hubble);
        this.prepareChange = () => hubble.active.rebuild();
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

    push(hubble: Hubble) {
        return <Promise<Hubble>> this.ref().orderByKey().once("value").then(snapshot => {
            var newIndex = 0;
            if (snapshot) {
                newIndex = snapshot.numChildren();
            }
            this.ref().child(String(newIndex)).set(hubble.hubbleKey).then(() => this.myHubble.activechildren.rebuild());
            return hubble;
        });
    }

    remove(hubble: Hubble) {
        return this.get().then(children => {
            children.splice(children.indexOf(hubble.hubbleKey), 1);
            this.set(children);
            this.myHubble.activechildren.rebuild();
        });
    }

    swapPosition(child1: Hubble, child2: Hubble) {
        return this.get().then(children => {
            const child1index = children.indexOf(child1.hubbleKey);
            const child2index = children.indexOf(child2.hubbleKey);

            children[child1index] = child2.hubbleKey;
            children[child2index] = child1.hubbleKey;

            this.set(children);
        });
    }

    rePosition(hubble: Hubble, after: Hubble) {
        return this.get().then(children => {
            const hubbleIndex = children.indexOf(hubble.hubbleKey);
            const targetIndex = children.indexOf(after.hubbleKey);

            children.splice(hubbleIndex, 1);
            children.splice(targetIndex + 1, 0, hubble.hubbleKey);

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

    addnew() {
        const updatePromises: Promise<any>[] = []
        const child = new Hubble(this.myHubble.ref.parent.push().key)
        
        updatePromises.push(child.parent.set(this.myHubble.hubbleKey));
        updatePromises.push(child.content.set(""));
        updatePromises.push(child.snoozed.set(false));
        updatePromises.push(child.done.set(false));
        updatePromises.push(child.active.set(true));
        updatePromises.push(child.activechildren.set(0));
        updatePromises.push(this.push(child));

        return Promise.all(updatePromises).then(() => {
            return child;
        });
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
            newParent.children.push(this);
            this.parent.set(newParent.hubbleKey);
        });
    }

    delete() {
        this.parent.hubble().then(parent => parent.children.remove(this));
        this.ref.remove();
    }

    sanatize() {
        return this.children.rebuild().then(() => this.activechildren.rebuild());
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