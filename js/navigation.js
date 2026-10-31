const navigation = document.querySelector(".navigation");
const navigationLinks = [...navigation.querySelectorAll(".navigation__link[href^='#']")];
const navigationTargets = navigationLinks
  .map((link) => ({
    link,
    target: document.querySelector(link.getAttribute("href")),
  }))
  .filter((item) => item.target);
let pendingNavigationTarget = null;

function setActiveLink(activeLink) {
  for (const { link } of navigationTargets) {
    const isActive = link === activeLink;
    link.classList.toggle("navigation__link--active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

function waitForNavigationTarget(target) {
  const activationTop = window.innerHeight * 0.05;
  const activationBottom = window.innerHeight * 0.15;
  const bounds = target.getBoundingClientRect();
  pendingNavigationTarget =
    bounds.bottom < activationTop || bounds.top > activationBottom
      ? target
      : null;
}

function updateFromLocation() {
  const activeItem = navigationTargets.find(({ link }) =>
    link.getAttribute("href") === window.location.hash
  );
  const defaultItem = navigationTargets[0];
  const selectedItem = activeItem ?? defaultItem;
  if (selectedItem) {
    waitForNavigationTarget(selectedItem.target);
  }
  setActiveLink(selectedItem?.link ?? navigationLinks[0]);
}

navigation.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const link = event.target.closest(".navigation__link");
  if (link) {
    const selectedItem = navigationTargets.find((item) => item.link === link);
    if (selectedItem) {
      waitForNavigationTarget(selectedItem.target);
      setActiveLink(link);
    }
  }
});

window.addEventListener("hashchange", updateFromLocation);
updateFromLocation();

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    if (pendingNavigationTarget) {
      const destinationEntry = entries.find((entry) =>
        entry.target === pendingNavigationTarget
      );
      if (!destinationEntry?.isIntersecting) {
        return;
      }

      pendingNavigationTarget = null;
      return;
    }

    const visibleTargets = entries
      .filter((entry) => entry.isIntersecting)
      .sort((first, second) =>
        Math.abs(first.boundingClientRect.top) - Math.abs(second.boundingClientRect.top)
      );

    if (visibleTargets.length > 0) {
      const activeItem = navigationTargets.find(({ target }) =>
        target === visibleTargets[0].target
      );
      if (activeItem) {
        setActiveLink(activeItem.link);
      }
    }
  }, {
    rootMargin: "-5% 0px -85% 0px",
    threshold: 0,
  });

  for (const { target } of navigationTargets) {
    sectionObserver.observe(target);
  }
}
