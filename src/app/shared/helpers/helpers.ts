export function findElementAncestor(element: Element, className: string) {
    while (!element.classList.contains(className)) {
      element = element.parentElement;
    }
    return element as HTMLElement;
  }

export function respondElementToVisibility(
    element: Element,
    callback: (visible: boolean) => void
  ) {
    const options: IntersectionObserverInit = {
      root: document.documentElement
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        callback(entry.intersectionRatio > 0);
      });
    }, options);

    observer.observe(element);
  }
