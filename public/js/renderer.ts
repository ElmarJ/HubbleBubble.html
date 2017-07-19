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

    private startRender() {
        this.contentLoaded = true;

        this.hubble.active.bindToAttribute(this.element, "data-active");
        this.hubble.activechildren.bindToAttribute(this.element, "data-active-children");
        
        this.hubble.content.bindToContent(<HTMLElement>this.element.querySelector(".content"), true);
        this.hubble.content.bindToContent(<HTMLElement>this.element.querySelector(".summary"), false);
        (<HTMLLinkElement>this.element.querySelector(".hubblelink")).href = "#" + this.hubble.hubbleKey;
        this.hubble.activechildren.bindToContent(<HTMLElement>this.element.querySelector(".child-count"), false);
        this.hubble.done.bindToCheckbox(<HTMLInputElement>this.element.querySelector(".doneToggle"), true);
        this.hubble.snoozed.bindToCheckbox(<HTMLInputElement>this.element.querySelector(".snoozeToggle"), true);

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
            childRenderer.renderOnVisible();
        }

        this.beginPersistingChildlistOnChange();
    }

    renderOnVisible() {
        this.element.respondToVisibility(visible => {
            if (visible && !this.contentLoaded) {
                this.startRender();
            }
        });
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
}