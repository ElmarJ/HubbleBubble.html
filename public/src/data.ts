import { DocumentReference } from '../node_modules/@firebase/firestore-types/index.js'

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

// Todo: reimplement using Proxy objects?
//    Or simply TypeScript properties?
export abstract class HubbleProperty<T> {
  prepareChange: (newValue: T) => void;
  abstract default: T;

  constructor(readonly name: string, readonly owner: Hubble) {
    this.prepareChange = value => {};
  }

  async get(defaultIfEmpty?: boolean) {
    const value = await this.owner.getCachedProperty(this.name);

    if (defaultIfEmpty && !value) {
      return this.default;
    }

    return <T>value;
  }

  valueToString(value: T) {
    return String(value);
  }

  async getString(defaultIfEmpty = false) {
    const value = await this.get(defaultIfEmpty);
    return value ? this.valueToString(value) : null;
  }

  async set(value: T, emptyIfDefault = true) {
    this.prepareChange(value);
    await this.owner.ref.update({
      [this.name]: value
    });
  }

  abstract setString(value: string);

  update(newValueCreator: (Hubble: Hubble) => T) {
    return <Promise<void>>this.set(newValueCreator(this.owner));
  }

  async bindToContent(
    element: HTMLElement,
    twoway = false,
    defaultIfEmpty = false
  ) {
    const value = await this.getString(defaultIfEmpty);
    if (value) {
      element.innerText = value;
    }

    if (twoway && element.contentEditable) {
      element.onblur = () => this.setString(element.innerText);
    }
  }

  async bindToAttribute(
    element: HTMLElement,
    attribute: string,
    prefix = "",
    postfix = ""
  ) {
    // Todo: this no longer subscribes / listens for updates.

    const value = await this.getString();
    if (value) {
      element.setAttribute(attribute, prefix + String(value) + postfix);
    } else {
      element.setAttribute(attribute, prefix + String(this.default) + postfix);
    }
  }
}

abstract class BooleanHubbleProperty extends HubbleProperty<boolean> {
  setString(value: string) {
    // todo: check parameter
    this.set(new Boolean(value).valueOf());
  }

  async bindToAttributePresence(element: HTMLElement, attribute: string) {
    const value = await this.get();
    if (value) {
      element.setAttribute(attribute, "");
    } else {
      element.removeAttribute(attribute);
    }
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

abstract class HubbleReferenceHubbleProperty extends HubbleProperty<
DocumentReference
> {
  valueToString(value: DocumentReference) {
    return value.id;
  }
}

class NumberHubbleProperty extends HubbleProperty<number> {
  setString(value: string) {
    // todo: check parameter
    this.set(new Number(value).valueOf());
  }

  default = 0;
}

abstract class DateHubbleProperty extends HubbleProperty<Date> {
  setString(value: string) {
    this.set(new Date(value));
  }
}

class ScheduledProperty extends DateHubbleProperty {
  default = null;
}

class IsActiveHubbleProperty extends BooleanHubbleProperty {
  async rebuild() {
    const hubble = await this.owner.getProperties([
      this.owner.snoozed,
      this.owner.done,
      this.owner.activechildren
    ]);
    this.set(!hubble.snoozed && (!hubble.done || hubble.activechildren > 0));
  }

  default = false;
}

class ActivityChildCountHubbleProperty extends NumberHubbleProperty {
  default = 0;
}

class StatusHubbleProperty extends BooleanHubbleProperty {
  default = false;
}

class ParentHubbleProperty extends HubbleReferenceHubbleProperty {
  setString(value: string) {
    throw new Error("Method not implemented.");
  }
  async getHubble() {
    const value = await this.get();
    return new Hubble(value.id);
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

class UrlHubbleProperty extends HubbleProperty<string> {
  default = "";
  setString(value: string) {
    this.set(value);
  }
}

export class Hubble {
  database = firebase.firestore();
  user = firebase.auth().currentUser;
  ref: DocumentReference;

  parent = new ParentHubbleProperty("parent", this);
  children = new ChildrenProperty("children", this);
  content = new ContentHubbleProperty("content", this);
  active = new IsActiveHubbleProperty("active", this);
  snoozed = new StatusHubbleProperty("snoozed", this);
  done = new StatusHubbleProperty("done", this);
  position = new NumberHubbleProperty("position", this);
  activechildren = new ActivityChildCountHubbleProperty("activechildren", this);
  url = new UrlHubbleProperty("url", this);
  scheduled = new ScheduledProperty("scheduled", this);

  constructor(readonly hubbleKey: string) {
    this.ref = this.database
      .collection("users/")
      .doc(this.user.uid)
      .collection("/hubbles")
      .doc(hubbleKey);
    this.url.default = "#" + hubbleKey;
  }

  static async create() {
    const user = firebase.auth().currentUser;
    const newDoc = await firebase
      .firestore()
      .collection("users/")
      .doc(user.uid)
      .collection("/hubbles")
      .add({});
    return new Hubble(newDoc.id);
  }

  getProperties(properties: HubbleProperty<any>[]) {
    const promises = properties.map(property =>
      property.get().then(value => ({ name: property.name, value: value }))
    );

    return Promise.all(promises).then(properties => {
      const hubble = <HubbleData>new Object();
      for (const property of properties) {
        hubble[property.name] = property.value;
      }
      return hubble;
    });
  }

  async get() {
    const snapshot = await this.ref.get();
    return snapshot.data();
  }

  private dataCache;
  async getCachedProperty(property: string) {
    if (!this.dataCache) {
      this.dataCache = await this.get();
    }
    return this.dataCache[property];
  }

  async delete() {
    await this.ref.delete();
  }

  async deleteRecursively() {
    const children = await this.getChildren();
    for (var child of children) {
      await child.deleteRecursively();
    }
    this.delete();
  }

  setParent(parent: Hubble) {
    this.ref.update({ parent: parent.ref });
  }

  makeParentOf(child: Hubble) {
    child.ref.update({ parent: this.ref });
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

  private getChildrenQuery() {
    const hubbleCollection = this.ref.parent;
    return hubbleCollection.where("parent", "==", this.ref).orderBy("position");
  }

  async getChildrenKeys() {
    const snapshot = await this.getChildrenQuery().get();
    let keys = [];
    for (var doc of snapshot.docs) {
      keys.push(doc.id);
    }
    return keys;
  }

  async getChildren() {
    const keys = await this.getChildrenKeys();
    return keys.map(key => new Hubble(key));
  }

  // async rebuildChildren() {
  //     const childrenQuery = this.ref.parent.orderByChild("parent").equalTo(this.hubbleKey);
  //     const snapshot = await childrenQuery.once("value");
  //     const children = [];
  //     const childKeys = snapshot.val();

  //     const newchildrenref = this.ref.parent.parent.child("childrenof").child(this.hubbleKey);
  //     let order = 1;
  //     for (let childKey in childKeys) {
  //         newchildrenref.child(childKey).set(order++);
  //     }
  // }

  static async getRootHubble() {
    const database = firebase.firestore();
    const user = firebase.auth().currentUser;
    const userDoc = database.collection("users/").doc(user.uid);
    const userDocSnapshot = await userDoc.get();
    const rootHubbleDoc = <DocumentReference>userDocSnapshot.get(
      "root"
    );

    if (rootHubbleDoc) {
      return new Hubble(rootHubbleDoc.id);
    } else {
      const hubble = await Hubble.create();
      userDoc.update({ root: hubble.ref });
      return hubble;
    }
  }
}
