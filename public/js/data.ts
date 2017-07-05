

interface HubbleData {
    snoozed: boolean;
    done: boolean;
    activechildren: number;
    content: string;
    parent: string;
    active: boolean;
    key: string;
    children: string[];
    position: number;
}

abstract class HubbleProperty<T>{
    name: string;
    protected owner: Hubble;
    prepareChange: (newValue: T) => void;
    ref = () => this.owner.ref.child(this.name);

    constructor(name: string, hubble: Hubble) {
        this.name = name;
        this.owner = hubble;
        this.prepareChange = (value) => { };
    }

    async get() {
        const snapshot = await this.ref().orderByValue().once('value');
        return <T>snapshot.val();
    }

    set(value: T) {
        this.prepareChange(value);
        return <Promise<void>>this.ref().set(value);
    }

    abstract setString(value: string);

    update(newValueCreator: (Hubble: Hubble) => T) {
        return <Promise<void>>this.set(newValueCreator(this.owner));
    }

    bindContent(element: HTMLElement) {
        const callback = snapshot => element.innerText = snapshot.val();

        this.ref().on("value", callback);

        element.onblur = () => this.setString(element.innerText);
    }

    unbindContent(element: HTMLElement) {
        // todo
    }

    bindAttribute(element: HTMLElement, attribute: string) {
        this.ref().on("value", snapshot => {
            element.setAttribute(attribute, snapshot.val());
        });

        const observer = new MutationObserver((mutations) => {
            this.setString(element.getAttribute(attribute));
        });

        observer.observe(element, { attributeFilter: [attribute] });
    }

    unbindAttribute(element: HTMLElement, attribute: string) {
        // todo
    }

}

class BooleanHubbleProperty extends HubbleProperty<boolean> {
    setString(value: string) {
        // todo: check parameter
        this.set(new Boolean(value).valueOf());
    }
}

class StringHubbleProperty extends HubbleProperty<string> {
    setString(value: string) {
        this.set(value);
    }
}

class NumberHubbleProperty extends HubbleProperty<number> {
    setString(value: string) {
        // todo: check parameter
        this.set(new Number(value).valueOf());
    }
}

class IsActiveHubbleProperty extends BooleanHubbleProperty {
    async rebuild() {
        const hubble = await this.owner.getProperties([this.owner.snoozed, this.owner.done, this.owner.activechildren]);
        this.set(!hubble.snoozed && (!hubble.done || (hubble.activechildren > 0)));

        const parent = await this.owner.parent.getHubble();
        parent.activechildren.rebuild();
    }
}

class ActivityChildCountHubbleProperty extends NumberHubbleProperty {
    rebuild() {
        return this.owner.children.getHubbleArray().then(hubbles => {
            const promisesToGetChildActivity = hubbles.map(hubble => hubble.active.get());

            Promise.all(promisesToGetChildActivity).then(childActivities => {
                const activeChildCount = childActivities.reduce<number>((counter, activity) => {
                    if (activity) counter++; return counter;
                }, 0);
                this.set(activeChildCount);
                this.owner.active.rebuild();
            });
        });
    }
}

class StatusHubbleProperty extends BooleanHubbleProperty {
    constructor(name: string, hubble: Hubble) {
        super(name, hubble);
        this.prepareChange = () => hubble.active.rebuild();
    }
}

class ParentHubbleProperty extends StringHubbleProperty {
    async getHubble() {
        const value = await this.get();
        return new Hubble(value);
    }
}

class ChildrenProperty extends HubbleProperty<string[]> {
    setString(value: string) {
        throw new Error("Method not implemented.");
    }

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

    async push(hubble: Hubble) {
        const children = await this.getHubbleArray();
        const position = children.push(hubble) - 1;
        await this.setHubbleArray(children);
        return position;
    }

    async insertAt(hubble: Hubble, position: number) {
        const children = await this.getHubbleArray();
        children.splice(position, 0 ,hubble);
        await this.setHubbleArray(children);        
    }

    async remove(hubble: Hubble) {
        const children = await this.get();
        const index = children.indexOf(hubble.hubbleKey);
        children.splice(index, 1);
        await this.set(children);
        await this.owner.activechildren.rebuild();
    }

    async shiftTo(hubble: Hubble, position: number) {
        const children = await this.getHubbleArray();
        const index = children.indexOf(hubble);
        children.splice(index, 1);
        children.splice(position, 0 ,hubble);
        await this.setHubbleArray(children);                
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

    async getHubbleArray() {
        const childKeys = await this.get();

        if (childKeys) {
            return childKeys.map(childKey => new Hubble(childKey));
        }
        else {
            return [];
        }
    }

    async getPositionOf(hubble: Hubble) {
        const query = this.ref().orderByValue().equalTo(hubble.hubbleKey);
        var snapshot = await query.once("value");
        return snapshot.key;
    }

    async setHubbleArray(hubbles: Hubble[]) {
        await this.set(hubbles.map(hubble => hubble.hubbleKey));
        await this.owner.activechildren.rebuild();
    }

    async swap(hubble: Hubble, distance: number) {
        const children = await this.getHubbleArray();
        const oldPos = children.findIndex(item => item.hubbleKey == hubble.hubbleKey);
        const newPos = oldPos + distance;
        
        if(newPos < 0 || newPos >= children.length) return;

        const otherHubble = children[newPos];

        children[newPos] = hubble;
        children[oldPos] = otherHubble;

        await this.setHubbleArray(children);
    }



    addnew() {
        const updatePromises: Promise<any>[] = []
        const child = new Hubble(this.owner.ref.parent.push().key)

        updatePromises.push(child.parent.set(this.owner.hubbleKey));
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
    content = new StringHubbleProperty("content", this);
    active = new IsActiveHubbleProperty("active", this);
    snoozed = new StatusHubbleProperty("snoozed", this);
    done = new StatusHubbleProperty("done", this);
    activechildren = new ActivityChildCountHubbleProperty("activechildren", this);

    constructor(hubbleKey: string) {
        if(!hubbleKey) {
            throw "Hubble key cannot be empty";
        }
        
        this.hubbleKey = hubbleKey;
        this.ref = this.database.ref('users/' + this.user.uid + '/hubbles/' + hubbleKey);
    }

    async getHubbleData() {
        const snapshot = await this.ref.once('value')
        const hubble = <HubbleData>snapshot.val();
        hubble.key = this.hubbleKey;
        return hubble;
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

    async move(newParent: Hubble) {
        const oldParent = await this.parent.getHubble();
        await oldParent.children.remove(this);
        await newParent.children.push(this);
        this.parent.set(newParent.hubbleKey);
    }

    async shiftAfter(sibling: Hubble) {
        const parent = await this.parent.getHubble();
        const position = await parent.children.getPositionOf(sibling);
        parent.children.shiftTo(this, position);
    }

    async delete() {
        const parent = await this.parent.getHubble()
        await parent.children.remove(this);
        await this.ref.remove();
    }

    async sanatize() {
        await this.children.rebuild();
        await this.activechildren.rebuild();
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

    static create(parent: Hubble) {
        const updatePromises: Promise<any>[] = []
        const child = new Hubble(parent.ref.parent.push().key)

    }

    async moveUp() {
        await this.swap(-1);
    }

    async moveDown() {
        await this.swap(1);
    }

    async moveToPosition(position: number) {

    }

    async swap(distance: number) {
        const parent = await this.parent.getHubble();
        await parent.children.swap(this, distance);
    }
}

