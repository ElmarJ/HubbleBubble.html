class HubbleRenderer {
    hubble: Hubble;
    element: HTMLElement;
    template: HTMLTemplateElement;
    childTemplate: HTMLTemplateElement;
    contentLoaded: boolean;
    childrenElement: HTMLElement;

    contentElement: HTMLElement;

    constructor(hubble: Hubble, template: HTMLTemplateElement, childTemplate: HTMLTemplateElement = template) {
        this.hubble = hubble;
        this.template = template;
        this.childTemplate = childTemplate;
        this.setupTemplate();
    }

    private render() {
        this.contentLoaded = true;

        this.hubble.active.bindToAttributePresence(this.element, "data-active");
        this.hubble.activechildren.bindToAttribute(this.element, "data-active-children");

        this.hubble.content.bindToContent(this.contentElement, true);
        this.element.querySelectorAll(".hubblelink").forEach((link) => this.hubble.url.bindToAttribute(<HTMLElement>link, "href"));
        this.hubble.activechildren.bindToContent(<HTMLElement>this.element.querySelector(".child-count"), false);
        this.hubble.done.bindToCheckbox(<HTMLInputElement>this.element.querySelector(".doneToggle"), true);
        this.hubble.snoozed.bindToCheckbox(<HTMLInputElement>this.element.querySelector(".snoozeToggle"), true);

        this.hubble.scheduled.bindToAttribute(this.element, "data-scheduled-for");

        this.element.querySelector(".addChildButton").addEventListener("click", event => this.onAddChildButtonClick(<MouseEvent>event));
        this.contentElement.addEventListener("keypress", event => this.onEditorKeyPress(<KeyboardEvent>event));
        this.contentElement.addEventListener("keydown", event => this.onKeyDown(<KeyboardEvent>event));

        this.useDragoverClass();

        this.addChildren();
    }

    private useDragoverClass() {
        this.element.addEventListener("dragenter", event => {
            this.element.classList.add("dragOver");
        });
        this.element.addEventListener("dragleave", event => {
            this.element.classList.remove("dragOver");
        });
      }
    private setupTemplate() {
        this.element = <HTMLElement>document.importNode(this.template.content, true).querySelector(".hubble");
        this.childrenElement = <HTMLElement>this.element.querySelector(".children");
        this.contentElement = <HTMLElement>this.element.querySelector(".content");
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
        this.element.dataset.childCount = this.childrenElement.childElementCount.toString();
        this.updateActiveChildCount();
    }

    renderOnVisible() {
        respondElementToVisibility(this.element, visible => {
            if (visible && !this.contentLoaded) {
                this.render();
            }
        });
        return this.element;
    }

    renderOnParentVisible() {
        const element = findElementAncestor(this.element.parentElement, "hubble")
        respondElementToVisibility(element, visible => {
            if (visible && !this.contentLoaded) {
                this.render();
            }
        });
        return this.element;
    }

    private beginPersistingChildlistOnChange() {
        const observer = new MutationObserver(() => this.persistChildList());
        observer.observe(this.childrenElement, {
            attributes: false,
            childList: true,
            characterData: false,
            subtree: false
        });
    }

    private async persistChildList() {
        var childobject = {};
        var childelement = <HTMLElement>this.childrenElement.firstElementChild;

        let order = 1;
        while (childelement) {
            if(childelement.classList.contains("hubble")) {
                childobject[childelement.dataset.key] = order++;
            }
            childelement = <HTMLElement>childelement.nextElementSibling;
        }
        
        await this.hubble.childrenref.set(childobject);

        // also update the childcount data attribute:
        this.element.dataset.childCount = order.toString();
        this.updateActiveChildCount();
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

    private updateActiveChildCount() {
        var i = 0;
        for (const child of this.childrenElement.childNodes) {
            if ((<HTMLElement>child).dataset.active) {
                i++;
            }
        }
        this.element.dataset.activeChildCount = i.toString();
    }
    
    private onAddChildButtonClick(ev: MouseEvent) {
        const newChildRenderer = this.addNewChild();
        this.setFocus(); 
    }

    
    private async onEditorKeyPress(ev: KeyboardEvent) {
    
        if (ev.key === "Enter") {
            ev.preventDefault();
            const newChildRenderer = this.addNewChild(<HTMLElement>this.element.nextElementSibling);
    
            // SPlit the text of the current Hubble in the part before and the part after the cursor:
            const cursorPos = window.getSelection().anchorOffset;
            const beforeCursor = this.contentElement.textContent.substr(0, cursorPos);
            const afterCursor = this.contentElement.textContent.substr(cursorPos, this.contentElement.textContent.length);
        
            // Before the cursor remains in the current hubble:
            this.contentElement.innerHTML = beforeCursor;
        
            // After the cursor goes into the new hubble:
            newChildRenderer.contentElement.innerHTML = afterCursor;
        
            this.setFocus();
        }
    }

    onKeyDown(ev: KeyboardEvent) {      
        if (ev.key === "Tab") {
          ev.preventDefault();
        }
      
        // Ctrl + key:
        if (ev.ctrlKey && !ev.altKey && !ev.shiftKey) {
          switch (ev.key) {
            case "ArrowDown":
              ev.preventDefault();
              HubbleRenderer.setElementFocus(<HTMLElement>this.element.nextElementSibling);
              break;
            case "ArrowUp":
              ev.preventDefault();
              HubbleRenderer.setElementFocus(<HTMLElement>this.element.previousElementSibling);
              break;
            case "ArrowLeft":
              ev.preventDefault();
              HubbleRenderer.setElementFocus(findElementAncestor(this.element.parentElement, "hubble"));
              break;
            case "ArrowRight":
              ev.preventDefault();
              HubbleRenderer.setElementFocus(<HTMLElement>this.element.querySelector(".children").firstElementChild);
              break;
            case " ":
              ev.preventDefault();
              (<HTMLInputElement>this.element.querySelector(".collapseToggle")).checked = !(<HTMLInputElement>this.element.querySelector(".collapseToggle")).checked;
            default:
              break;
          }
        }
      
        // ctrl + alt + key:
        if (ev.ctrlKey && ev.altKey && !ev.shiftKey) {
          switch (ev.key) {
            case "ArrowDown":
              ev.preventDefault();
              this.moveHubbleElementDown();
              break;
            case "ArrowUp":
              ev.preventDefault();
              this.moveHubbleElementUp();
              break;
            case "ArrowLeft":
              ev.preventDefault();
              this.moveHubbleElementAfterParent();
              break;
            case "ArrowRight":
              ev.preventDefault();
              this.moveHubbleElementInPrevious();
              break;
            default:
              break;
          }
      
          this.setFocus();
        }
      }
      
    private addNewChild(before?: HTMLElement) {
        const childHubbleTemplate = <HTMLTemplateElement>document.getElementById("hubbleListItemTemplate");
        const childRenderer = new HubbleRenderer(new Hubble(), childHubbleTemplate);
      
        if (before) {
          this.childrenElement.insertBefore(childRenderer.element, before);
        } else {
          this.childrenElement.appendChild(childRenderer.element);
        }
        childRenderer.renderOnParentVisible();
      
        return childRenderer;
      }

      setFocus() {
        this.makeVisible()
        this.contentElement.focus();
      }

      private static setElementFocus(element: HTMLElement) {
        HubbleRenderer.makeElementVisible(element);
        element.focus();          
      }
    makeVisible() {
        HubbleRenderer.makeElementVisible(this.element)
      }

      private static makeElementVisible(hubbleEl: HTMLElement) {
        if (hubbleEl.offsetParent === null) {
          const parentHubbleEl = findElementAncestor(hubbleEl.parentElement, "hubble")
          const checkBox = <HTMLInputElement>parentHubbleEl.querySelector(".collapseToggle");
          this.makeElementVisible(parentHubbleEl);
          checkBox.checked = false;
        }
      }

      
 moveHubbleElementDown() {
    if (this.element.nextElementSibling) {
        this.element.parentElement.insertBefore(this.element, this.element.nextElementSibling.nextElementSibling);
    }
  }
  
   moveHubbleElementUp() {
    if (this.element.previousElementSibling) {
        this.element.parentElement.insertBefore(this.element, this.element.previousElementSibling);
    }
  }
  
   moveHubbleElementInPrevious() {
    const newParent = <HTMLElement>this.element.previousElementSibling;
    const newChildrenElement = <HTMLElement>newParent.querySelector(".children");
    newChildrenElement.appendChild(this.element);
  }
  
   moveHubbleElementAfterParent() {
    const currentParentElement = findElementAncestor(this.element.parentElement, "hubble");
    currentParentElement.parentElement.insertBefore(this.element, currentParentElement.nextElementSibling);
  }
  
}