        function hubbleToDiv(hubble) {
            var hubbleDiv = document.createElement("div");
            hubbleDiv.classList.add("hubble")
            hubbleDiv.setAttribute("data-collapsed", hubble.collapsed);

            var contentDiv = document.createElement("div");
            contentDiv.classList.add("content");
            contentDiv.innerText = hubble.content;
            hubbleDiv.appendChild(contentDiv);

            var childrenDiv = document.createElement("div");
            childrenDiv.classList.add("children");
            hubbleDiv.appendChild(childrenDiv);

            hubble.children.forEach(function(element) {
                childrenDiv.appendChild(hubbleToDiv(element));
            }, this);

            return hubbleDiv;
        }

        function hubbleToListItem(hubble) {
            var li = document.createElement("li")
            li.innerText = hubble.content;

            var ul = document.createElement("ul");
            hubble.children.forEach(function(element) {
                ul.appendChild(hubbleToListItem(element));
            }, this);

            li.appendChild(ul);

            return li;
        }

        function hubbleToDetailsElement(hubble) {
            var detailsEl = document.createElement("details");
            var summaryEl = document.createElement("summary");
            summaryEl.innerText = hubble.content;
            detailsEl.appendChild(summaryEl);

            hubble.children.forEach(function(element) {
                detailsEl.appendChild(hubbleToDetailsElement(element));
            }, this);

            return detailsEl;
        }