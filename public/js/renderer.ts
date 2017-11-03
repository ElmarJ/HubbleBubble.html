import { findElementAncestor, respondElementToVisibility } from "./helpers.js";
import { Hubble, HubbleProperty } from "./data.js";
import { schedule } from "./calendar.js";
export class HubbleRenderer {
    hubble: Hubble;
    element: HTMLElement;
    template: HTMLTemplateElement;
    navigator: Navigator;
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
        this.element.querySelector(".scheduleButton").addEventListener("click", startScheduleUI);
        this.element.querySelector(".linkButton").addEventListener("click", startAddLinkUI);
        this.contentElement.addEventListener("keypress", event => this.onEditorKeyPress(event));
        this.contentElement.addEventListener("keydown", event => this.onKeyDown(event));
        this.contentElement.addEventListener("click", event => this.onContentClick(event));
        this.element.addEventListener("dragstart", onDragStart);
        this.element.addEventListener("dragend", onDragEnd);
        this.element.addEventListener("dragover", onDragOver);
        this.element.addEventListener("drop", onDrop);
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
        this.navigator = new Navigator(this.element)        

        this.childrenElement = <HTMLElement>this.element.querySelector(".children");
        this.contentElement = <HTMLElement>this.element.querySelector(".content");
        this.element.dataset.key = this.hubble.hubbleKey;
    }

    private async storeContent(element: HTMLElement, property: HubbleProperty<any>) {
        property.setString(element.innerText);
    }

    private async addChildren() {
        const children = await this.hubble.getChildren();

        for (var child of children) {
            const childRenderer = new HubbleRenderer(child, this.childTemplate);
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

        let position = 1;
        while (childelement) {
            if(childelement.classList.contains("hubble")) {
              const childHubble = new Hubble(childelement.dataset.key);
              childHubble.position.set(position);
              this.hubble.makeParentOf(childHubble);
            }
            childelement = <HTMLElement>childelement.nextElementSibling;
        }
        
        // also update the childcount data attribute:
        this.element.dataset.childCount = position.toString();
        this.updateActiveChildCount();
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
            const newChildRenderer = await this.addNewChild(<HTMLElement>this.element.nextElementSibling);
    
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
              this.navigator.moveDown();
              break;
            case "ArrowUp":
              ev.preventDefault();
              this.navigator.moveUp();
              break;
            case "ArrowLeft":
              ev.preventDefault();
              this.navigator.moveAfterParent();
              break;
            case "ArrowRight":
              ev.preventDefault();
              this.navigator.moveInPrevious();
              break;
            default:
              break;
          }
      
          this.setFocus();
        }
      }
      
    private async addNewChild(before?: HTMLElement) {
        const childHubbleTemplate = <HTMLTemplateElement>document.getElementById("hubbleListItemTemplate");
        const childRenderer = new HubbleRenderer(await Hubble.create(), childHubbleTemplate);
      
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
  
      async onContentClick(ev: MouseEvent) {
        const element = ev.srcElement
        const isLinkStyle = (window.getComputedStyle(element).getPropertyValue("--hubble-content-is-link").trim() == "true");
      
        if (isLinkStyle) {
          ev.preventDefault();
          window.location.hash = this.hubble.hubbleKey;
        }
      }
    }

    class Navigator {
      element: HTMLElement;

      constructor(element: HTMLElement) {
        this.element = element;
      }

      moveDown() {
        if (this.element.nextElementSibling) {
          this.element.parentElement.insertBefore(this.element, this.element.nextElementSibling.nextElementSibling);
        }
      }
  
   moveUp() {
    if (this.element.previousElementSibling) {
        this.element.parentElement.insertBefore(this.element, this.element.previousElementSibling);
    }
  }
  
   moveInPrevious() {
    const newParent = <HTMLElement>this.element.previousElementSibling;
    const newChildrenElement = <HTMLElement>newParent.querySelector(".children");
    newChildrenElement.appendChild(this.element);
  }
  
   moveAfterParent() {
    const currentParentElement = this.getParentHubbleElement();
    currentParentElement.parentElement.insertBefore(this.element, currentParentElement.nextElementSibling);
  }

  getParentHubbleElement() {
    return findElementAncestor(this.element.parentElement, "hubble");
  }
}



function onDragEnd(event: MouseEvent) {
    removeDropTargets();
  }
  
function removeDropTargets() {
    if(dropTargetAfterElt) {
      dropTargetAfterElt.remove();
    }
  
    if(dropTargetBeforeElt) {
      dropTargetBeforeElt.remove();
    }
  }
  
  var dropTargetBeforeElt: HTMLElement;
  var dropTargetAfterElt: HTMLElement;
  
  
  function onDrop(ev: DragEvent) {
    ev.preventDefault();
  
    removeDropTargets();
    // move me into the children-element of the element I was dropped on:
    const sourceKey = ev.dataTransfer.getData("text/plain");
    const sourceHubbleElement = <HTMLElement>document.querySelector(`[data-key=${sourceKey}].hubble`);
    const destinationHubbleElement = findElementAncestor(<HTMLElement>ev.target, "hubble");
    const destinationChildrenElement = destinationHubbleElement.querySelector(".children");
    destinationChildrenElement.appendChild(sourceHubbleElement);
  }
  
  function onDragStart(ev: DragEvent) {
    const sourceHubbleKey = (<HTMLElement>ev.target).dataset.key;
    ev.dataTransfer.setData("text/plain", sourceHubbleKey);
  }
  
  
function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    var elt = <HTMLElement>ev.srcElement;
    if (!elt.classList.contains("hubble")) {
      elt = findElementAncestor(elt, "hubble");
    }
    addDropTargets(elt);
    for(const e of document.querySelectorAll(".dragover")) {
      if (e !== elt) {
        e.classList.remove("dragover");
      }
    }
    elt.classList.add("dragover");
  }


  function addDropTargets(elt: HTMLElement) {
    if(!dropTargetBeforeElt) {
      dropTargetBeforeElt = generateNewDropTarget();
    }
    if(!dropTargetAfterElt) {
      dropTargetAfterElt = generateNewDropTarget();
    }
  
    elt.parentElement.insertBefore(dropTargetBeforeElt, elt);
    elt.parentElement.insertBefore(dropTargetAfterElt, elt.nextElementSibling);
  }
  
  function generateNewDropTarget() {
    const elt = document.createElement("li");
    elt.classList.add("dropTarget");
  
    elt.addEventListener("drop", (event) => {
      const sourceKey = event.dataTransfer.getData("text/plain");
      const sourceHubbleElement = <HTMLElement>document.querySelector(`[data-key=${sourceKey}].hubble`);
      elt.parentElement.insertBefore(sourceHubbleElement, elt);
      removeDropTargets();
    });
  
    elt.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
  
    useDragoverClass(elt);
  
    return elt;
  }
  
  function useDragoverClass(elt: HTMLElement) {
    elt.addEventListener("dragenter", event => {
      elt.classList.add("dragOver");
    });
    elt.addEventListener("dragleave", event => {
      elt.classList.remove("dragOver");
    });
  }
  
  
  async function startAddLinkUI(event: MouseEvent) {
    const dialog = <any>document.getElementById("addExternalLinkDialog");
    const childrenElt = findElementAncestor(<HTMLElement>event.srcElement,"hubble").querySelector(".children");
  
    dialog.showModal();
    dialog.addEventListener('close', async function (event) {
      if (dialog.returnValue === 'confirm') {
        const urlElt = <HTMLInputElement>document.getElementById("urlBox");
        const urlNameElt = <HTMLInputElement>document.getElementById("urlNameBox");
  
        const hubble = await Hubble.create();
        await hubble.url.setString(urlElt.value);
        await hubble.content.setString(urlNameElt.value);
  
        const renderer = new HubbleRenderer(hubble, <HTMLTemplateElement>document.getElementById("hubbleListItemTemplate"));
        childrenElt.appendChild(renderer.element);
        renderer.renderOnParentVisible();
     }
   });
  }
  
  function startScheduleUI(event: MouseEvent) {
    const dialog = <any>document.getElementById("scheduleDialog");
    const hubbleElt = findElementAncestor(<HTMLElement>event.currentTarget,"hubble");
    const hubble = new Hubble(hubbleElt.dataset.key);
  
    const startTimeElt = <HTMLInputElement>document.getElementById("startTimeSelector");
    const endTimeElt = <HTMLInputElement>document.getElementById("endTimeSelector");
    
    dialog.showModal();
    dialog.addEventListener("close", async (event) => {
      schedule(new Date(startTimeElt.value), new Date(endTimeElt.value), hubble);
    });
  }
  