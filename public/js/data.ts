

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

abstract class HubbleProperty<T>{
    name: string;
    protected owner: Hubble;
    prepareChange: (newValue: T) => void;
    ref = () => this.owner.ref.child(this.name);
    abstract default: T;

    constructor(name: string, hubble: Hubble) {
        this.name = name;
        this.owner = hubble;
        this.prepareChange = (value) => { };
    }

    async get() {
        const snapshot = await this.ref().orderByValue().once('value');
        let value = <T>snapshot.val();
        if (!value) {
            value = this.default;
        }
        return value;
    }

    async set(value: T) {
        this.prepareChange(value);
        await this.ref().set(value);
    }

    abstract setString(value: string);

    update(newValueCreator: (Hubble: Hubble) => T) {
        return <Promise<void>>this.set(newValueCreator(this.owner));
    }
}

abstract class BooleanHubbleProperty extends HubbleProperty<boolean> {
    setString(value: string) {
        // todo: check parameter
        this.set(new Boolean(value).valueOf());
    }
}

abstract class StringHubbleProperty extends HubbleProperty<string> {
    setString(value: string) {
        this.set(value);
    }

    default = "";
}

abstract class NumberHubbleProperty extends HubbleProperty<number> {
    setString(value: string) {
        // todo: check parameter
        this.set(new Number(value).valueOf());
    }

    default = 0;
}

class IsActiveHubbleProperty extends BooleanHubbleProperty {
    async rebuild() {
        const hubble = await this.owner.getProperties([this.owner.snoozed, this.owner.done, this.owner.activechildren]);
        this.set(!hubble.snoozed && (!hubble.done || (hubble.activechildren > 0)));
    }

    default = false;
}

class ActivityChildCountHubbleProperty extends NumberHubbleProperty {
    rebuild() {
        return this.owner.children.getHubbleArray().then(hubbles => {
            const promisesToGetChildActivity = hubbles.map(hubble => hubble.active.get());

            Promise.all(promisesToGetChildActivity).then(childActivities => {
                const activeChildCount = childActivities.reduce<number>((counter, activity) => {
                    if (activity) {
                        counter++; return counter;
                    }
                }, 0);
                this.set(activeChildCount);
            });
        });
    }

    default = 0;
}

class StatusHubbleProperty extends BooleanHubbleProperty {
    constructor(name: string, hubble: Hubble) {
        super(name, hubble);
    }

    default = false;
}

class ParentHubbleProperty extends StringHubbleProperty {
    async getHubble() {
        const value = await this.get();
        return new Hubble(value);
    }

    default = null;
}

class ChildrenProperty extends HubbleProperty<string[]> {
    setString(value: string) {
        throw new Error("Method not implemented.");
    }

    default = [];

    async rebuild() {
        // Need to get the old child-query from previous code version to sanatize properly
        // Query to all hubbles that have me as a parent (i.e. my children):
        const childrenQuery = this.ref().parent.parent.orderByChild("parent").equalTo(this.owner.hubbleKey);
        const snapshot = await childrenQuery.once("value");
        const children = [];
        const childKeys = snapshot.val();

        for (var childKey in childKeys) {
            children.push(childKey);
        }

        this.set(children)
    }

    /**
     * Returns the number of children.
     */
    async length() {
        const children = await this.get();
        return children.length;
    }

    async getChildAt(position: number) {
        const ref = this.ref().child(String(position));
        const snapshot = await ref.once("value");
        const key = snapshot.val();
        if (key) {
            return new Hubble(key);
        }
        return null;
    }

    async getPositionOf(hubble: Hubble) {
        const query = this.ref().orderByValue().equalTo(hubble.hubbleKey);
        var snapshot = await query.once("value");
        return snapshot.key;
    }

    async getHubbleArray() {
        const childKeys = await this.get();

        if (childKeys) {
            return childKeys.map(childKey => new Hubble(childKey));
        }
        else {
            return [];
        }
    }

    async setHubbleArray(hubbles: Hubble[]) {
        await this.set(hubbles.map(hubble => hubble.hubbleKey));
    }
}

class ContentHubbleProperty extends StringHubbleProperty {
    default: "";
}

class Hubble {
    database = firebase.database();
    user = firebase.auth().currentUser;
    hubbleKey: string;
    ref: firebase.database.Reference;

    parent = new ParentHubbleProperty("parent", this);
    children = new ChildrenProperty("children", this);
    content = new ContentHubbleProperty("content", this);
    active = new IsActiveHubbleProperty("active", this);
    snoozed = new StatusHubbleProperty("snoozed", this);
    done = new StatusHubbleProperty("done", this);
    activechildren = new ActivityChildCountHubbleProperty("activechildren", this);

    constructor(hubbleKey?: string) {
        if(!hubbleKey || hubbleKey === "") {
            // Generate a new key:
            hubbleKey = this.database.ref("users/" + this.user.uid + "/hubbles").push().key;
        }

        this.hubbleKey = hubbleKey;
        this.ref = this.database.ref("users/" + this.user.uid + "/hubbles/" + hubbleKey);
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

    async delete() {
        await this.ref.remove();
    }

    async deleteRecursively() {
        const children = await this.children.getHubbleArray();
        for (var child of children) {
            await child.deleteRecursively();
        }
        this.delete();
    }

    async recurse(childrenFirst: boolean, task: (Hubble: Hubble) => void) {
        // If not childrenFirst, first do it for myself:
        if (!childrenFirst) {
            task(this);
        }

        // then, get child hubbles and do it for all my children:
        const children = await this.children.getHubbleArray();
        for (const child of children) {
            child.recurse(childrenFirst, task);
        }

        // if childrenFirst, do it for myself now:
        if (childrenFirst) {
            task(this);
        }
    }
}

