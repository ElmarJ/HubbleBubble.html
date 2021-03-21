# HubbleBubble (HTML5)

## Using a UI framework

So far, not blown away by frameworks (often steep learning curve and losing control, overcomplicating debugging, and don't want "vendor lock in"): prefer to keep everything neatly within vanilla JS (and going pretty well so far). Still considering light-weight frameworks for databinding. Am currently most convinced by Aurelia.

- <https://hybrids.js.org/#/getting-started/concepts>
- <https://github.com/Polymer/lit-element>
- <https://slimjs.com/#/getting-started>
- <https://aurelia.io/>
- <https://dojo.io/>
- <http://knockoutjs.com/>
- Polymere
- <https://vuejs.org/>

## Todo

List:

- Database structure
  - Move parent/child relation to seperate data path: {uid}/childrenof/{parentkey}/{childkey}/{order}
- Database trigger functions:
  - {uid}/childrenof/{parentkey}/{childkey} (added)
    - set parent key of child
    - remove all other of same childkey
  - {uid}/childrenof/{parentkey}/{childkey} (change) -> update active child count
  - hubble removed: remove all children, and remove from parent.
- index.js
  - Rendering:
    - ~~HTMLElement: renderOnVisible();~~
    - ~~HTMLElement: hubbleBindAttribute(HubbleProperty, attributeName)~~
    - ~~HTMLElement: hubbleBindContent(HubbleProperty)~~
  - Tree Manipulation
    - ~~Rewrite move as DOM manipulation that is persisted afterwards~~
    - ~~Rewrite insert as DOM manipulation that is persisted afterwards~~
    - ~~Later: move up (ctrl+up) / down (ctrl+down) / deeper(ctrl+right - w/ descendants) / higher (ctrl+left - w/ descendants) / in (tab - w/o descendants) / out (shift+tab - w/o descendants)~~
    - ~~On enter: move everything after the cursor to the new hubble.~~
  - Persistence
    - ~~Store children on DOM manipulation~~
- data.js
  - ~~defaults for properties~~
- Breadcrumb (index.html + index.js)
  - Create breadcrumb with rendered hubbles

- Bugs
  - When creating a new hubble:
    - ~~One position too high.~~
    - activechildrencount incorrect in DOM
    - ~~Set cursor on new hubble~~

### For Polymer

- Hubble Element
  - Decouple li and div class="hubble" as a child, to allow for a single template for both top-level as well as child hubbles.
  - Hubble-key as attribute / property of element
  - All renderer-logic moved to element-code.
  - Incrementally implement support for data-binding
- Time Slider
  - Only needs currently logged on user (gapi) -> how to get that?
  - Or make it entirely independent, login-logic (back) to the element