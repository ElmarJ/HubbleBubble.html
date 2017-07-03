

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

class PositionHubbleProperty extends NumberHubbleProperty {
    private async siblings() {
        const parent = await this.owner.parent.getHubble();
        return parent.children;
    }

    private async getRelativeSibling(distance: number) {
        const siblings = await this.siblings();
        const myPosition = await this.get();
        return await siblings.getChildAt(myPosition + distance);
    }

    async rebuild() {
        const siblings = await this.siblings();
        const myPosResult = await siblings.ref().child(this.owner.hubbleKey).once("value");
        this.set(<number>myPosResult.val());
    }

    async previous() {
        return await this.getRelativeSibling(-1);
    }

    async next() {
        return await this.getRelativeSibling(+1);
    }

    async moveUp() {
        const siblings = await this.siblings();
        siblings.shiftPosition(this.owner, -1);
    }

    async moveDown() {
        const siblings = await this.siblings();
        siblings.shiftPosition(this.owner, +1);
    }

    async moveAfter(sibling: Hubble) {
        const position = await sibling.position.get() + 1;
        const siblings = await this.siblings();
        await siblings.updatePosition(this.owner, position);
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
     * Returns current highest position in children list.
     */
    async getMaxPos() {
        const snapshot = await this.ref().once("value");
        const children = snapshot.val();
        if (children) { return children.length; } else { return 0; }
    }

    async push(hubble: Hubble) {
        const ref = this.ref().child(hubble.hubbleKey);
        var maxPos = await this.getMaxPos();
        this.updatePosition(hubble, maxPos + 1);

        this.owner.activechildren.rebuild();
        return hubble;
    }

    async remove(hubble: Hubble) {
        const nextSibling = await hubble.position.next();
        const childRef = this.ref().child(hubble.hubbleKey);
        await childRef.remove();

        // let the next sibling take my old position:
        this.shiftPosition(nextSibling, -1);
        this.owner.activechildren.rebuild();
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
    async getHubbleArray_old() {
        const childKeys = await this.get();

        if (childKeys) {
            return Object.keys(childKeys).map(childKey => new Hubble(childKey));
        }
        else {
            return [];
        }
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

    /**
     * Only for internal use - use move functions to change position.
     * Function updates position both in children list of parent as well
     * as this position property.
     */
    async updatePosition(child: Hubble, position: number) {
        const childSlotRef = this.ref().child(String(position));
        const originalPosition = await child.position.get();

        // if there is still a child present at this location, push it out of the way:
        const currentHubbleKey = (await childSlotRef.once("value")).val();
        if (currentHubbleKey) {
            const currentHubble = new Hubble(currentHubbleKey);
            await this.shiftPosition(currentHubble, 1);
        }

        // Because of denormalization, this has to be saved twice:
        // Update my position in parent's child list:
        await childSlotRef.set(this.owner.hubbleKey);
        // Update my position as my own property:
        await child.position.set(position);

        // Finally, if there are children past my original position,
        //   let them take my old place:
        const originalFollower = await this.getChildAt(originalPosition +1);
        if (originalFollower) {
            await this.shiftPosition(originalFollower, -1);
        }
    }

    async shiftPosition(child: Hubble, shift: number) {
        const currentPosition = await child.position.get();
        await this.updatePosition(child, currentPosition + shift);
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
    position = new PositionHubbleProperty("position", this);

    constructor(hubbleKey: string) {
        if(!hubbleKey) throw "Hubble key cannot be empty";
        
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
        oldParent.children.remove(this);
        newParent.children.push(this);
        this.parent.set(newParent.hubbleKey);
    }

    async moveAfter(newSibling: Hubble) {
        const newParent = await newSibling.parent.getHubble();
        await this.move(newParent);
        await this.position.moveAfter(newSibling);
    }

    async delete() {
        const parent = await this.parent.getHubble()
        parent.children.remove(this);
        this.ref.remove();
    }

    async sanatize() {
        await this.children.rebuild();
        await this.activechildren.rebuild();
        await this.position.rebuild();
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
}

