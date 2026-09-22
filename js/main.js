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

// Before/after content-nav animation-iteration demo (article-agentic-ai.html,
// "Being an Orchestrator. Not a Coder.") — the interactive asset in
// .iteration-demo. Opening is a plain click-to-toggle, on every device —
// the one mechanism guaranteed to work everywhere. A first pass tried
// branching on matchMedia("(hover: hover)") to open on mouseenter
// instead, but touch browsers replay a synthetic mouseenter/mouseover
// after a tap regardless of what that query reports, which left "Before"
// stuck open with no way to tap it closed again. Real hover (+
// focus-within, for keyboard) is layered back in as a pure-CSS
// enhancement in style.css, gated to devices that actually support it —
// click and hover both just toggle the same .is-open state, so neither
// path can fight the other.
//
// The toggle is bound to the whole `.iteration-demo__nav` box, not just
// the label: "Before" shifts its own position upward when it opens (see
// --before-shift below), so a second tap at the exact spot the label
// used to occupy would land on the list instead and never close it.
// Binding to the nav means any tap on the now-visible content — label or
// list — closes it again, regardless of where the open animation moved
// things.
function initInteractionDemo() {
  const demo = document.getElementById("content-nav-iteration-demo");
  if (!demo) return;

  const switcher = demo.querySelector(".iteration-demo__switcher");
  const tabs = demo.querySelectorAll(".iteration-demo__tab");
  const panels = demo.querySelectorAll(".iteration-demo__panel");
  const navs = demo.querySelectorAll(".iteration-demo__nav");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      switcher.dataset.active = tab.dataset.target;
      panels.forEach((panel) =>
        panel.classList.toggle("is-active", panel.dataset.panel === tab.dataset.target)
      );
    });
  });

  navs.forEach((nav) => {
    nav.addEventListener("click", () => {
      nav.classList.toggle("is-open");
    });

    // Hovering open (style.css, >=1280px) never touches .is-open — it's
    // pure CSS. That's fine on its own, but if the same nav also gets
    // clicked while still hovered, .is-open turns on too, and the two
    // mechanisms fall out of sync the moment the pointer leaves: :hover
    // stops applying, yet .is-open keeps the list forced open with no
    // more clicks to close it. Clearing the class whenever the pointer
    // (or keyboard focus) genuinely leaves the nav keeps both paths
    // agreeing on "closed" once the user's attention has moved on.
    //
    // Blurring matters too: clicking a link or the label — the exact
    // "hover, then click one of the sections" case that was reported —
    // leaves that element focused, and CSS keeps the list open on
    // :focus-within regardless of .is-open. Without releasing that
    // focus, the list stays visibly open even after this handler clears
    // the class, so the mouse leaving would silently do nothing.
    nav.addEventListener("mouseleave", () => {
      nav.classList.remove("is-open");
      if (document.activeElement && nav.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    });

    nav.addEventListener("focusout", (e) => {
      if (!nav.contains(e.relatedTarget)) nav.classList.remove("is-open");
    });
  });

  // "Before" (v1) grows straight down from the label instead of
  // re-centering the way "After" (v2) does — that mismatch is the whole
  // point of the demo. Left as pure CSS, the expanded block would sit low
  // and could spill past the frame on a short mobile stage. Rather than a
  // pixel offset that only holds at one exact container size, measure the
  // list once here — up front, not at the moment it opens, since opening
  // is now driven by CSS (:hover/:focus-within or .is-open) rather than
  // JS — and write it to --before-shift (read by style.css) so the
  // expanded block lands centered at any frame size (mobile stack or
  // desktop ratio), no matter which mechanism opened it. Recomputed on
  // resize since the link text rewraps, and the list's height with it,
  // at different container widths.
  const beforeNav = demo.querySelector(".iteration-demo__nav--v1");
  const beforeList = beforeNav?.querySelector(".iteration-demo__nav-list");

  const updateBeforeShift = () => {
    if (!beforeNav || !beforeList) return;
    const shift = beforeList.scrollHeight / 2 + 6;
    beforeNav.style.setProperty("--before-shift", `-${shift}px`);
  };

  updateBeforeShift();
  window.addEventListener("resize", updateBeforeShift);
}

initInteractionDemo();
