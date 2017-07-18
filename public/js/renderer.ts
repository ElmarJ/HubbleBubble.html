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

    private async render() {
        this.contentLoaded = true;

        this.element.dataset.active = String(await this.hubble.active.get());
        this.element.dataset.activeChildren = String(await this.hubble.activechildren.get());
        
        this.hubble.content.bindToContent(<HTMLElement>this.element.querySelector(".content"), true);
        this.hubble.content.bindToContent(<HTMLElement>this.element.querySelector(".summary"), false);
        (<HTMLLinkElement>this.element.querySelector(".hubblelink")).href = "#" + this.hubble.hubbleKey;
        (<HTMLLinkElement>this.element.querySelector(".parentlink")).href = "#" + await this.hubble.parent.get();
        this.hubble.activechildren.bindToContent(<HTMLElement>this.element.querySelector(".child-count"), false);
        this.hubble.done.bindToCheckbox(<HTMLInputElement>this.element.querySelector(".doneToggle"), true);
        this.hubble.snoozed.bindToCheckbox(<HTMLInputElement>this.element.querySelector(".snoozeToggle"), true);

        await this.addChildren();
        this.beginPersistingChildlistOnChange();
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
        const childHubbles = await this.hubble.children.getHubbleArray();

        for (var child of childHubbles) {
            const childRenderer = new HubbleRenderer(child, this.childTemplate);
            this.childrenElement.appendChild(childRenderer.element);
            childRenderer.renderOnVisible();
        }
    }

    renderOnVisible() {
        this.element.respondToVisibility(visible => {
            if (visible && !this.contentLoaded) {
                this.render();
            }
        });
    }

    private beginPersistingChildlistOnChange() {
        const observer = new MutationObserver(() => this.persistChildList());
        observer.observe(this.childrenElement, { attributes: false, childList: true, characterData: false, subtree: false })
    }

    private async persistChildList() {
        var childrenArray = [];
        var childelement = <HTMLElement>this.childrenElement.firstElementChild;

        while (childelement) {
            if (!childelement.classList.contains("special-children")) {
                childrenArray.push(childelement.dataset.key);
            }
            childelement = <HTMLElement>childelement.nextElementSibling;
        }

        await this.hubble.children.set(childrenArray);
    }
}