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
    * V HTMLElement: renderOnVisible();
    * HTMLElement: hubbleBindAttribute(HubbleProperty, attributeName)
    * HTMLElement: hubbleBindContent(HubbleProperty)
  * Tree Manipulation
    * V Rewrite move as DOM manipulation that is persisted afterwards
    * V Rewrite insert as DOM manipulation that is persisted afterwards
    * Later: move up (ctrl+up) / down (ctrl+down) / deeper(ctrl+right - w/ descendants) / higher (ctrl+left - w/ descendants) / in (tab - w/o descendants) / out (shift+tab - w/o descendants)
  * Persistence
    * Store children on DOM manipulation
* data.js
  * V defaults for properties