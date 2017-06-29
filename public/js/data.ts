

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
    protected myHubble: Hubble;
    prepareChange: (newValue: T) => void;

    constructor(name: string, hubble: Hubble) {
        this.name = name;
        this.myHubble = hubble;
        this.prepareChange = (value) => { };
    }

    async get() {
        const snapshot = await this.ref().once('value');
        return <T>snapshot.val();
    }

    set(value: T) {
        this.prepareChange(value);
        return <Promise<void>>this.ref().set(value);
    }

    abstract setString(value: string);

    update(newValueCreator: (Hubble: Hubble) => T) {
        return <Promise<void>>this.set(newValueCreator(this.myHubble));
    }

    ref() {
        return this.myHubble.ref.child(this.name);
    }

    bindContentIfVisible(element: HTMLElement) {
        respondToVisibility(
            element,
            visible => {
                if (visible) {
                    this.bindContent(element);
                } else {
                    this.unbindContent(element);
                }
            }
        );
    }

    bindAttributeIfVisible(element: HTMLElement, attribute: string) {
        respondToVisibility(
            element,
            visible => {
                if (visible) {
                    this.bindAttribute(element, attribute);
                } else {
                    this.unbindAttribute(element, attribute);
                }
            }
        );
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

class IsActiveHubbleProperty extends BooleanHubbleProperty{
    async rebuild() {
        const hubble = await this.myHubble.getProperties([this.myHubble.snoozed, this.myHubble.done, this.myHubble.activechildren]);
        this.set(!hubble.snoozed && (!hubble.done || (hubble.activechildren > 0)));
        
        const parent = await this.myHubble.parent.hubble();
        parent.activechildren.rebuild();
    }
}

class ActivityChildCountHubbleProperty extends NumberHubbleProperty{
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

class StatusHubbleProperty extends BooleanHubbleProperty{
    constructor(name: string, hubble: Hubble) {
        super(name, hubble);
        this.prepareChange = () => hubble.active.rebuild();
    }
}

class ParentHubbleProperty extends StringHubbleProperty {
    async hubble() {
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
        const childrenQuery = this.ref().parent.parent.orderByChild("parent").equalTo(this.myHubble.hubbleKey);
        const snapshot = await childrenQuery.once("value");
        const childKeyList: string[] = [];
        const childKeys = snapshot.val();

        for (var childKey in childKeys) {
            childKeyList.push(childKey);
        }

        this.set(childKeyList)
    }

    async push(hubble: Hubble) {
        const snapshot = await this.ref().orderByKey().once("value")
        var newIndex = 0;
        if (snapshot) {
            newIndex = snapshot.numChildren();
        }
        await this.ref().child(String(newIndex)).set(hubble.hubbleKey);
        this.myHubble.activechildren.rebuild();
        return hubble;
    }

    async remove(hubble: Hubble) {
        const children = await this.get();
        children.splice(children.indexOf(hubble.hubbleKey), 1);
        this.set(children);
        this.myHubble.activechildren.rebuild();
    }

    async swapPosition(child1: Hubble, child2: Hubble) {
        const children = await this.get();
        const child1index = children.indexOf(child1.hubbleKey);
        const child2index = children.indexOf(child2.hubbleKey);

        children[child1index] = child2.hubbleKey;
        children[child2index] = child1.hubbleKey;

        this.set(children);
    }

    async moveDown(child: Hubble) {
        const position = await this.positionOf(child);
        const nextSibling = await this.hubbleAtPosition(position+1);
        if (nextSibling) {
            this.swapPosition(child, nextSibling);
        }
    }

    async moveUp(child: Hubble) {
        const position = await this.positionOf(child);
        const previousSibling = await this.hubbleAtPosition(position - 1);
        
        if (previousSibling) {
            await this.swapPosition(child, previousSibling);
        }
    }

    async moveDeep(child: Hubble) {
        const position = await this.positionOf(child);
        const previousSibling = await this.hubbleAtPosition(position - 1);
        await this.myHubble.move(previousSibling);
    }

    async moveOut(child: Hubble) {
        await child.moveAfter(this.myHubble);
    }

    async hubbleAtPosition(position: number) {
        const ref = this.ref().child(String(position));
        const snapshot = await ref.once("value");
        return new Hubble(snapshot.val());
    }

    async positionOf(hubble: Hubble) {
        const query = this.ref().orderByValue().equalTo(hubble.hubbleKey);
        const snapshot = await query.once("value");
        return Number(snapshot.val());
    }

    async rePosition(hubble: Hubble, after: Hubble) {
        const children = await this.get();
        const hubbleIndex = children.indexOf(hubble.hubbleKey);
        const targetIndex = children.indexOf(after.hubbleKey);

        children.splice(hubbleIndex, 1);
        children.splice(targetIndex + 1, 0, hubble.hubbleKey);

        this.set(children);
    }

    async hubbles() {
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
    content = new StringHubbleProperty("content", this);
    active = new IsActiveHubbleProperty("active", this);
    snoozed = new StatusHubbleProperty("snoozed", this);
    done = new StatusHubbleProperty("done", this);
    activechildren = new ActivityChildCountHubbleProperty("activechildren", this);

    constructor(hubbleKey: string) {
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
        const oldParent = await this.parent.hubble();
        oldParent.children.remove(this);
        newParent.children.push(this);
        this.parent.set(newParent.hubbleKey);
    }

    async moveAfter(newSibling: Hubble) {
        const newParent = await newSibling.parent.hubble();
        await this.move(newParent);
        await newParent.children.rePosition(this, newSibling);
    }


    async delete() {
        const parent = await this.parent.hubble()
        parent.children.remove(this);
        this.ref.remove();
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
        const children = await this.children.hubbles();
        for (const child of children) {
            child.recurse(childrenFirst, task);
        }

        // if childrenFirst, do it for myself now:
        if (childrenFirst) {
            task(this);
        }
    }
}

