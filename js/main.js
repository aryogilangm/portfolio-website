function updateClock() {
  const clockEl = document.getElementById("live-clock");
  if (!clockEl) return;

  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;

  clockEl.textContent = `${hours} : ${minutes} : ${seconds} ${ampm}`;
}

updateClock();
setInterval(updateClock, 1000);

function initNavbarScroll() {
  const navbar = document.querySelector(".navbar");
  if (!navbar) return;

  let lastScrollY = window.scrollY;

  window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY;
    const scrollingDown = currentScrollY > lastScrollY;

    if (scrollingDown && currentScrollY > navbar.offsetHeight) {
      navbar.classList.add("navbar--hidden");
    } else if (!scrollingDown) {
      navbar.classList.remove("navbar--hidden");
    }

    lastScrollY = currentScrollY;
  });
}

initNavbarScroll();

function initPageTransition() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const link = e.target.closest("a");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

    let url;
    try {
      url = new URL(link.href, location.href);
    } catch {
      return;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return;

    e.preventDefault();
    document.body.style.animation = "none";
    document.body.style.opacity = "1";
    document.body.classList.add("is-leaving");
    setTimeout(() => {
      location.href = link.href;
    }, 160);
  });
}

initPageTransition();

function initContentNav() {
  const nav = document.querySelector(".content-nav");
  const toggle = document.querySelector(".content-nav__label");
  const links = document.querySelectorAll(".content-nav__link");
  if (!links.length) return;

  if (nav && toggle) {
    const collapse = () => {
      nav.classList.remove("is-expanded");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", () => {
      const expanded = nav.classList.toggle("is-expanded");
      toggle.setAttribute("aria-expanded", String(expanded));
    });

    links.forEach((link) => link.addEventListener("click", collapse));

    document.addEventListener("click", (e) => {
      if (nav.classList.contains("is-expanded") && !nav.contains(e.target)) {
        collapse();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-expanded")) {
        collapse();
        toggle.focus();
      }
    });

    // Same hide-on-scroll-down / show-on-scroll-up pattern as the navbar
    // (see initNavbarScroll) — only has a visible effect at the tab/mobile
    // breakpoint, where .content-nav--hidden has a CSS rule; harmless
    // no-op on desktop.
    let lastScrollY = window.scrollY;

    window.addEventListener(
      "scroll",
      () => {
        if (nav.classList.contains("is-expanded")) collapse();

        const currentScrollY = window.scrollY;
        const scrollingDown = currentScrollY > lastScrollY;

        if (scrollingDown && currentScrollY > nav.offsetHeight) {
          nav.classList.add("content-nav--hidden");
        } else if (!scrollingDown) {
          nav.classList.remove("content-nav--hidden");
        }

        lastScrollY = currentScrollY;
      },
      { passive: true }
    );
  }

  const sections = Array.from(links)
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const linkForSection = new Map(
    sections.map((section, i) => [section, links[i]])
  );

  const setActive = (section) => {
    links.forEach((link) => link.classList.remove("is-active"));
    linkForSection.get(section)?.classList.add("is-active");
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      if (visible.length === 0) return;

      const topMost = visible.reduce((a, b) =>
        a.boundingClientRect.top <= b.boundingClientRect.top ? a : b
      );
      setActive(topMost.target);
    },
    { rootMargin: "-20% 0px -70% 0px" }
  );

  sections.forEach((section) => observer.observe(section));
}

initContentNav();
