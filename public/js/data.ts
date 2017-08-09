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
        return <T>snapshot.val();
    }

    async getString() {
        const value = await this.get();
        return value ? String(value) : null;
    }

    async set(value: T) {
        this.prepareChange(value);
        await this.ref().set(value);
    }

    abstract setString(value: string);

    update(newValueCreator: (Hubble: Hubble) => T) {
        return <Promise<void>>this.set(newValueCreator(this.owner));
    }

    async bindToContent(element: HTMLElement, twoway = false) {
        const value = await this.getString();
        if (value) {
            element.innerText = value;
        }

        if (twoway && element.contentEditable) {
            element.onblur = () => this.setString(element.innerText);;
        }
    }

    async bindToAttribute(element: HTMLElement, attribute: string) {
        const value = await this.getString();
        if (value) {
            element.setAttribute(attribute, value);
        } else {
            element.setAttribute(attribute, String(this.default));
        }
    }
}

abstract class BooleanHubbleProperty extends HubbleProperty<boolean> {
    setString(value: string) {
        // todo: check parameter
        this.set(new Boolean(value).valueOf());
    }

    async bindToCheckbox(element: HTMLInputElement, twoway = false) {
        const value = await this.get();
        if (value) {
            element.checked = value;
        }
        if (twoway) {
            element.onchange = () => this.set(element.checked);
        }
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
    childrenref: firebase.database.Reference;

    constructor(hubbleKey?: string) {
        if (!hubbleKey || hubbleKey === "") {
            // Generate a new key:
            hubbleKey = this.database.ref("users/" + this.user.uid + "/hubbles").push().key;
        }

        this.hubbleKey = hubbleKey;
        this.ref = this.database.ref("users/" + this.user.uid + "/hubbles/" + hubbleKey);
        this.childrenref = this.ref.parent.parent.child("childrenof").child(this.hubbleKey);
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
        const children = await this.getChildren();
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
        const children = await this.getChildren();
        for (const child of children) {
            child.recurse(childrenFirst, task);
        }

        // if childrenFirst, do it for myself now:
        if (childrenFirst) {
            task(this);
        }
    }

    async getChildrenKeys() {
        const snapshot = await this.childrenref.orderByValue().once("value");
        let keys = [];
        for (const key in snapshot.val()) {
            keys.push(key);
        }
        return keys;
    }

    async getChildren() {
        const keys = await this.getChildrenKeys();
        return keys.map(key => new Hubble(key));
    }

    async rebuildChildren() {
        const childrenQuery = this.ref.parent.orderByChild("parent").equalTo(this.hubbleKey);
        const snapshot = await childrenQuery.once("value");
        const children = [];
        const childKeys = snapshot.val();

        const newchildrenref = this.ref.parent.parent.child("childrenof").child(this.hubbleKey);
        let order = 1;
        for (let childKey in childKeys) {
            newchildrenref.child(childKey).set(order++);
        }
    }

}

