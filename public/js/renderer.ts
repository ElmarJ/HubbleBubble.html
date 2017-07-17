class HubbleRenderer {
    hubble: Hubble;
    element: HTMLElement;
    template: HTMLTemplateElement;
    childTemplate: HTMLTemplateElement;
    contentLoaded: boolean;

    constructor(hubble: Hubble, template: HTMLTemplateElement, childTemplate?: HTMLTemplateElement) {
        this.hubble = hubble;
        this.template = template;
        this.childTemplate = childTemplate || template;
        this.createEmptyTemplate();
    }

    private async render() {
        this.contentLoaded = true;

        this.element.dataset.active = String(await this.hubble.active.get());
        this.element.dataset.activeChildren = String(await this.hubble.activechildren.get());

        const contentElements = <NodeListOf<HTMLElement>>this.element.querySelectorAll(".content");

        for (var contentElement of contentElements) {
            contentElement.innerText = await this.hubble.content.get();
            if (contentElement.contentEditable) {
                contentElement.onblur = () => persistHubbleContentElement(contentElement);
            }
        }

        const linkElements = <NodeListOf<HTMLLinkElement>>this.element.querySelectorAll(".hubblelink");
        for (var linkElement of linkElements) { linkElement.href = "#" + this.hubble.hubbleKey };

        const parentLinkElements = <NodeListOf<HTMLLinkElement>>this.element.querySelectorAll(".parentlink");
        for (var parentLinkElement of parentLinkElements) { parentLinkElement.href = "#" + await this.hubble.parent.get(); }

        const childCountElement = <HTMLElement>this.element.querySelector(".child-count");
        if (childCountElement !== null) {
            childCountElement.innerText = String(await this.hubble.activechildren.get());
        }

        const parentNode = <HTMLElement>this.element.querySelector(".parentcontent");
        if (parentNode !== null) {
            parentNode.dataset.key = await this.hubble.parent.get();
        }

        // set done toggle:
        const doneElement = <HTMLInputElement>this.element.querySelector(".doneToggle");
        if (doneElement !== null) {
            registerToggle(doneElement, await this.hubble.done.get(), ev => getScopedHubble(<HTMLInputElement>ev.srcElement).done.set((<HTMLInputElement>ev.srcElement).checked));
        }

        // set snooze toggle:
        const snoozeElement = <HTMLInputElement>this.element.querySelector(".snoozeToggle");
        if (snoozeElement !== null) {
            registerToggle(snoozeElement, await this.hubble.snoozed.get(), ev => getScopedHubble(<HTMLInputElement>ev.srcElement).snoozed.set((<HTMLInputElement>ev.srcElement).checked));
        }

        const childrenElement = <HTMLElement>this.element.querySelector(".children");
        await this.renderChildren();
    }
    private createEmptyTemplate() {
        this.element = <HTMLElement>document.importNode(this.template.content, true).querySelector(".hubble");
        this.element.dataset.key = this.hubble.hubbleKey;
        return this.element;
    }

    private async renderChildren() {
        const childrenElement = this.getChildrenElement();

        const childHubbles = await this.hubble.children.getHubbleArray();

        for (var child of childHubbles) {
            const childRenderer = new HubbleRenderer(child, this.childTemplate);
            childrenElement.appendChild(childRenderer.element);
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


    private getChildrenElement = () => <HTMLElement>this.element.querySelector(".children");

    async addNewChild(before?: HTMLElement) {
        const parentElement = this.element;
        const childrenElement = this.getChildrenElement();
        const hubble = new Hubble();

        const childRenderer = new HubbleRenderer(hubble, this.childTemplate);

        if (before) {
            childrenElement.insertBefore(childRenderer.element, before);
        } else {
            childrenElement.appendChild(childRenderer.element);
        }

        setFocus(childRenderer.element);

        await childRenderer.render();
        parentElement.persistHubbleChildlist();
    }
}