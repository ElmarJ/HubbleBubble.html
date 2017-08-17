class HubbleRenderer {
    hubble: Hubble;
    element: HTMLElement;
    template: HTMLTemplateElement;
    childTemplate: HTMLTemplateElement;
    contentLoaded: boolean;
    childrenElement: HTMLElement;

    constructor(hubble: Hubble, template: HTMLTemplateElement, childTemplate: HTMLTemplateElement = template) {
        this.hubble = hubble;
        this.template = template;
        this.childTemplate = childTemplate;
        this.setupTemplate();
    }

    private render() {
        this.contentLoaded = true;

        this.hubble.active.bindToAttribute(this.element, "data-active");
        this.hubble.activechildren.bindToAttribute(this.element, "data-active-children");
        
        this.hubble.content.bindToContent(<HTMLElement>this.element.querySelector(".content"), true);
        this.hubble.content.bindToContent(<HTMLElement>this.element.querySelector(".summary"), false);
        this.element.querySelectorAll(".hubblelink").forEach((link) => this.hubble.url.bindToAttribute(<HTMLElement>link, "href"));
        this.hubble.activechildren.bindToContent(<HTMLElement>this.element.querySelector(".child-count"), false);
        this.hubble.done.bindToCheckbox(<HTMLInputElement>this.element.querySelector(".doneToggle"), true);
        this.hubble.snoozed.bindToCheckbox(<HTMLInputElement>this.element.querySelector(".snoozeToggle"), true);

        useDragoverClass(this.element);

        this.addChildren();
    }

    private setupTemplate() {
        this.element = <HTMLElement>document.importNode(this.template.content, true).querySelector(".hubble");
        this.childrenElement = <HTMLElement>this.element.querySelector(".children");
        this.element.dataset.key = this.hubble.hubbleKey;
    }

    private async storeContent(element: HTMLElement, property: HubbleProperty<any>) {
        property.setString(element.innerText);
    }

    private async addChildren() {
        const snapshot = await this.hubble.childrenref.once("value");

        for (var childkey in snapshot.val()) {
            const childRenderer = new HubbleRenderer(new Hubble(childkey), this.childTemplate);
            this.childrenElement.appendChild(childRenderer.element);
             // rendering as soon as the parent is in sight to precache (children may be shown soon):
             // to improve UI responsiveness / prevent UI rendering lags.
            childRenderer.renderOnParentVisible();
        }

        this.beginPersistingChildlistOnChange();
    }

    renderOnVisible() {
        this.element.respondToVisibility(visible => {
            if (visible && !this.contentLoaded) {
                this.render();
            }
        });
        return this.element;
    }

    renderOnParentVisible() {
        this.element.parentElement.findAncestor("hubble").respondToVisibility(visible => {
            if (visible && !this.contentLoaded) {
                this.render();
            }
        });
        return this.element;
    }

    private beginPersistingChildlistOnChange() {
        const observer = new MutationObserver(() => this.persistChildList());
        observer.observe(this.childrenElement, { attributes: false, childList: true, characterData: false, subtree: false })
    }

    private async persistChildList() {
        var childobject = {};
        var childelement = <HTMLElement>this.childrenElement.firstElementChild;

        let order = 1;
        while (childelement) {
            childobject[childelement.dataset.key] = order++;
            childelement = <HTMLElement>childelement.nextElementSibling;
        }

        await this.hubble.childrenref.set(childobject);
    }

    
private startUpdatingActivity() {
    const ref = this.hubble.ref.child("active");
    const updater = snapshot => this.element.dataset.active = String(snapshot.val());

    if (this.element) {
        ref.on("value", updater);
    } else {
        ref.off("value", updater)
    }
    }
}