# Todo

List:

* Database structure
  * Move parent/child relation to seperate data path: {uid}/childrenof/{parentkey}/{childkey}/{order}
* Database trigger functions:
  * {uid}/childrenof/{parentkey}/{childkey} (added)
    * set parent key of child
    * remove all other of same childkey
  * {uid}/childrenof/{parentkey}/{childkey} (change) -> update active child count
  * hubble removed: remove all children, and remove from parent.
* index.js
  * Rendering:
    * ~~HTMLElement: renderOnVisible();~~
    * ~~HTMLElement: hubbleBindAttribute(HubbleProperty, attributeName)~~
    * ~~HTMLElement: hubbleBindContent(HubbleProperty)~~
  * Tree Manipulation
    * ~~Rewrite move as DOM manipulation that is persisted afterwards~~
    * ~~Rewrite insert as DOM manipulation that is persisted afterwards~~
    * ~~Later: move up (ctrl+up) / down (ctrl+down) / deeper(ctrl+right - w/ descendants) / higher (ctrl+left - w/ descendants) / in (tab - w/o descendants) / out (shift+tab - w/o descendants)~~
    * ~~On enter: move everything after the cursor to the new hubble.~~
  * Persistence
    * ~~Store children on DOM manipulation~~
* data.js
  * ~~defaults for properties~~
* Breadcrumb (index.html + index.js)
  * Create breadcrumb with rendered hubbles

* Bugs
  * When creating a new hubble:
    * ~~One position too high.~~
    * activechildrencount incorrect in DOM
    * ~~Set cursor on new hubble~~

## For Polymer

* Hubble Element
  * Decouple li and div class="hubble" as a child, to allow for a single template for both top-level as well as child hubbles.
  * Hubble-key as attribute / property of element
  * All renderer-logic moved to element-code.
  * Incrementally implement support for data-binding
* Time Slider
  * Only needs currently logged on user (gapi) -> how to get that?
  * Or make it entirely independent, login-logic (back) to the element
