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
  var options: IntersectionObserverInit = {
    root: document.documentElement
  };

  var observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      callback(entry.intersectionRatio > 0);
    });
  }, options);

  observer.observe(element);
}
