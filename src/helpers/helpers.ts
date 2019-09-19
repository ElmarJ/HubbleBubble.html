export function findElementAncestor(element: Element, className: string) {
    while (
      !element.classList.contains(className) &&
      (element = element.parentElement)
    ) {}
    return <HTMLElement>element;
  }

  export function respondElementToVisibility(
    element: Element,
    callback: (boolean) => void
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
