export const createObserver = (
    classes: string[],
    options: IntersectionObserverInit = {
        threshold: 0.1,
        root: null,
        rootMargin: "0px",
    }
): IntersectionObserver => {
    return new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.remove("hidden");
                entry.target.classList.add("visible", ...classes);
                observer.unobserve(entry.target);
            }
        });
    }, options);
};
