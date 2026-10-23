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
  // Navbars with the theme toggle (home, works) stay visible while scrolling.
  if (!navbar || navbar.classList.contains("navbar--persistent")) return;

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

/* theme-transition — site-wide light/dark switch animation (see design.md §6).
   themeTransition("dark" | "light") applies the theme, persists it and plays
   the wipe: the new theme is revealed by a clip-path wipe over the old one
   (View Transitions API), from the left going to dark and from the right
   going back to light. Instant switch without the API or with reduced motion. */
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll("[data-theme-option]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.themeOption === theme));
  });
  try {
    localStorage.setItem("theme", theme);
  } catch (e) {}
}

function themeTransition(theme) {
  if (theme === document.documentElement.dataset.theme) return;

  const canAnimate =
    document.startViewTransition &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!canAnimate) {
    setTheme(theme);
    return;
  }

  const hidden = theme === "light" ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)";

  document.startViewTransition(() => setTheme(theme)).ready.then(() => {
    document.documentElement.animate(
      { clipPath: [hidden, "inset(0 0 0 0)"] },
      {
        duration: 600,
        easing: "cubic-bezier(0.32, 0.72, 0, 1)",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  });
}

window.themeTransition = themeTransition;

function initThemeToggle() {
  const buttons = document.querySelectorAll("[data-theme-option]");
  if (!buttons.length) return;

  buttons.forEach((button) => {
    button.addEventListener("click", () => themeTransition(button.dataset.themeOption));
  });

  // The inline <head> script already set data-theme; sync the pressed state to it.
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  buttons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.themeOption === current));
  });
}

initThemeToggle();

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
  const overlay = demo.querySelector(".iteration-demo__overlay");
  const tabs = demo.querySelectorAll(".iteration-demo__tab");
  const panels = demo.querySelectorAll(".iteration-demo__panel");
  const navs = demo.querySelectorAll(".iteration-demo__nav");

  // Clip the overlay (white label copies on the pill) to the active tab.
  const movePill = (tab) => {
    const left = tab.offsetLeft - 4;
    const right = overlay.offsetWidth - left - tab.offsetWidth;
    overlay.style.clipPath = `inset(0 ${right}px 0 ${left}px round 60px)`;
  };

  // Set without animating: on load, and again once web fonts settle
  // (Geist changes tab widths).
  const snap = () => {
    overlay.style.transition = "none";
    movePill(demo.querySelector(".iteration-demo__tab.is-active"));
    requestAnimationFrame(() => {
      overlay.style.transition = "";
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      switcher.dataset.active = tab.dataset.target;
      movePill(tab);
      panels.forEach((panel) =>
        panel.classList.toggle("is-active", panel.dataset.panel === tab.dataset.target)
      );
    });
  });

  snap();
  document.fonts?.ready.then(snap);

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

// Stepper demo (booksmart.html): pill tab-switcher that cross-fades checkout
// screenshots. The pill is a clipped overlay (see .stepper-demo in style.css);
// this only measures the active tab and writes the clip-path.
function initStepperDemos() {
  document.querySelectorAll(".stepper-demo").forEach((demo) => {
    const tabs = Array.from(demo.querySelectorAll(".stepper-demo__tab"));
    const shots = Array.from(demo.querySelectorAll(".stepper-demo__shot"));
    const overlay = demo.querySelector(".stepper-demo__overlay");
    let current = 0;

    const movePill = (i) => {
      const tab = tabs[i];
      const left = tab.offsetLeft - 4;
      const right = overlay.offsetWidth - left - tab.offsetWidth;
      overlay.style.clipPath = `inset(0 ${right}px 0 ${left}px round 60px)`;
    };

    // Set without animating: on load, and again once web fonts settle
    // (Geist changes tab widths).
    const snap = () => {
      overlay.style.transition = "none";
      movePill(current);
      requestAnimationFrame(() => {
        overlay.style.transition = "";
      });
    };

    const select = (next, focus) => {
      if (next === current) return;
      shots[current].classList.remove("is-active");
      shots[next].classList.add("is-active");
      tabs.forEach((tab, i) => {
        tab.setAttribute("aria-selected", i === next);
        tab.tabIndex = i === next ? 0 : -1;
      });
      movePill(next);
      if (focus) tabs[next].focus();
      current = next;
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(i));
      tab.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") select(Math.min(i + 1, tabs.length - 1), true);
        if (e.key === "ArrowLeft") select(Math.max(i - 1, 0), true);
      });
    });

    snap();
    document.fonts?.ready.then(snap);
  });
}

initStepperDemos();

// Deep-dive before/after demo (bookdrop.html, "Restructuring the Product
// Architecture"): a Before/After toggle (legacy page vs. the redesigned
// tab system) plus, inside After, Product/Manufacturer/Supplier tabs —
// switched by clicking the real tab row drawn INSIDE the asset itself
// (see .deep-dive-demo__hotspot in style.css for the Figma-sourced
// coordinates), not by a separate tab nav. Reuses the .stepper-demo__tabs
// pill markup/classes for the Before/After toggle itself.
function initDeepDiveDemo() {
  const demo = document.querySelector(".deep-dive-demo");
  if (!demo) return;

  const toggleBar = demo.querySelector(".deep-dive-demo__toggle .stepper-demo__tabs");
  const toggleTabs = Array.from(toggleBar.querySelectorAll(".stepper-demo__tab"));
  const toggleOverlay = toggleBar.querySelector(".stepper-demo__overlay");
  const panelBefore = demo.querySelector('.deep-dive-demo__panel[data-panel="before"]');
  const panelAfter = demo.querySelector('.deep-dive-demo__panel[data-panel="after"]');
  const shots = Array.from(panelAfter.querySelectorAll(".deep-dive-demo__shot"));
  const hotspots = Array.from(demo.querySelectorAll(".deep-dive-demo__hotspot"));

  const movePill = (overlay, tabs, i) => {
    const tab = tabs[i];
    const pad = parseFloat(getComputedStyle(overlay).left) || 4;
    const left = tab.offsetLeft - pad;
    const right = overlay.offsetWidth - left - tab.offsetWidth;
    overlay.style.clipPath = `inset(0 ${right}px 0 ${left}px round 60px)`;
  };
  const snapPill = (overlay, tabs, i) => {
    overlay.style.transition = "none";
    movePill(overlay, tabs, i);
    requestAnimationFrame(() => {
      overlay.style.transition = "";
    });
  };

  const resetScroll = (panel) => {
    const vp = panel.querySelector(".deep-dive-demo__viewport");
    if (vp) vp.scrollTop = 0;
  };

  const selectPanel = (name, focus) => {
    const toBefore = name === "before";
    toggleTabs.forEach((tab, i) => {
      const active = tab.dataset.panel === name;
      tab.setAttribute("aria-selected", active);
      tab.tabIndex = active ? 0 : -1;
      if (active) movePill(toggleOverlay, toggleTabs, i);
    });
    panelBefore.classList.toggle("is-active", toBefore);
    panelAfter.classList.toggle("is-active", !toBefore);
    resetScroll(toBefore ? panelBefore : panelAfter);
    if (focus) toggleTabs.find((tab) => tab.dataset.panel === name)?.focus();
  };

  toggleTabs.forEach((tab) => {
    tab.addEventListener("click", () => selectPanel(tab.dataset.panel));
    tab.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        selectPanel(tab.dataset.panel === "before" ? "after" : "before", true);
      }
    });
  });
  snapPill(toggleOverlay, toggleTabs, 0);

  // Redesign tabs (Product/Manufacturer/Supplier) — selected only via the
  // in-image hotspots; see style.css for why there's no external tablist.
  const selectTab = (name) => {
    shots.forEach((shot) => {
      const active = shot.dataset.tab === name;
      if (active) {
        // Clear any display:none a PREVIOUS deactivation left as an
        // inline style (inline style beats the .is-active CSS rule
        // otherwise), then let CSS show it — in flow immediately so it
        // can define the viewport's scroll height right away and the
        // enter fade can start this frame.
        shot.style.display = "";
        shot.classList.add("is-active");
      } else if (shot.classList.contains("is-active")) {
        // Let the exit opacity transition play first, THEN pull it out
        // of layout (display:none). Pulling it out immediately would
        // cut the fade short; leaving it in flow (even at opacity:0)
        // is the scroll-bleed bug this fixes (see style.css) — an
        // out-of-flow shot still counts toward the viewport's
        // scrollable overflow at opacity:0, so switching to a shorter
        // tab let you scroll past its real content into blank space.
        shot.classList.remove("is-active");
        const exitMs = parseFloat(getComputedStyle(shot).transitionDuration) * 1000 || 160;
        setTimeout(() => {
          if (!shot.classList.contains("is-active")) shot.style.display = "none";
        }, exitMs);
      }
    });
    resetScroll(panelAfter);
  };

  hotspots.forEach((hotspot) => {
    hotspot.addEventListener("click", () => selectTab(hotspot.dataset.tab));
  });

  document.fonts?.ready.then(() => {
    const activeToggle = toggleTabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    snapPill(toggleOverlay, toggleTabs, activeToggle);
  });
  window.addEventListener("resize", () => {
    const activeToggle = toggleTabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    snapPill(toggleOverlay, toggleTabs, activeToggle);
  });
}

initDeepDiveDemo();
