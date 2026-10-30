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

  // Second way to bring a hidden navbar back, besides scrolling up —
  // decided from /proto/navbar-reveal after the plain scroll-up-only
  // behavior tested as too easy to miss. Desktop pointer only: touch has
  // no hover, and scrolling up is already the only (and sufficient) way
  // to get the navbar back there.
  //
  // A mousemove threshold, not a positioned hotzone element: an actual
  // full-width div here (tried first, then caught in a ship-check sweep)
  // sits in front of whatever's scrolled underneath it and swallows
  // clicks on real content the instant the navbar is hidden — this way
  // there's nothing in the DOM to block anything.
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const HOTZONE_HEIGHT = 24;
    window.addEventListener("mousemove", (event) => {
      if (event.clientY <= HOTZONE_HEIGHT) {
        navbar.classList.remove("navbar--hidden");
      }
    });
  }
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

  const select = (target) => {
    const tab = Array.from(tabs).find((t) => t.dataset.target === target);
    if (!tab) return;
    tabs.forEach((t) => t.classList.remove("is-active"));
    tab.classList.add("is-active");
    switcher.dataset.active = target;
    movePill(tab);
    panels.forEach((panel) =>
      panel.classList.toggle("is-active", panel.dataset.panel === target)
    );
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => select(tab.dataset.target));
  });

  const mobileSelect = demo.querySelector(".native-select");
  if (mobileSelect) {
    mobileSelect.addEventListener("change", () => {
      select(mobileSelect.value);
      sizeNativeSelectToSelection(mobileSelect);
    });
    const syncMobileSelect = () => {
      mobileSelect.value = switcher.dataset.active;
      sizeNativeSelectToSelection(mobileSelect);
    };
    syncMobileSelect();
    window.addEventListener("resize", syncMobileSelect);
  }

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

// Shared by every .native-select (stepper-demo, deep-dive-demo,
// detail-pages-demo): a native <select> with no explicit width sizes
// itself to its WIDEST <option>, not the one currently chosen — so
// picking a short label still renders in a box wide enough for the
// longest option in the list. Canvas text measurement reads the
// selected option's rendered width without forcing a layout reflow,
// then that width (plus padding/border — box-sizing:border-box, see
// style.css reset) becomes the select's own inline width. Called on
// init and after every value change; see .native-select's `width`
// transition in style.css for the resize itself.
let nativeSelectMeasureCtx = null;
function sizeNativeSelectToSelection(select) {
  if (!select) return;
  if (!nativeSelectMeasureCtx) {
    nativeSelectMeasureCtx = document.createElement("canvas").getContext("2d");
  }
  const option = select.options[select.selectedIndex];
  if (!option) return;

  const cs = getComputedStyle(select);
  nativeSelectMeasureCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const letterSpacing = parseFloat(cs.letterSpacing) || 0;
  const textWidth =
    nativeSelectMeasureCtx.measureText(option.text).width +
    letterSpacing * Math.max(option.text.length - 1, 0);
  const boxExtra =
    parseFloat(cs.paddingLeft) +
    parseFloat(cs.paddingRight) +
    parseFloat(cs.borderLeftWidth) +
    parseFloat(cs.borderRightWidth);

  select.style.width = `${Math.ceil(textWidth + boxExtra)}px`;
}

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

    // Mobile-only control (<768px, see style.css): one native <select>
    // replacing the pill, which a tap target this small has no room for
    // on a phone. Calls the exact same select() the pill calls — one
    // state machine, two input methods. Steps are selected by index
    // here (not a data-panel/data-tab string, unlike deep-dive-demo),
    // matching select()'s own signature.
    const mobileSelect = demo.querySelector(".native-select");
    if (mobileSelect) {
      mobileSelect.addEventListener("change", () => {
        select(Number(mobileSelect.value));
        sizeNativeSelectToSelection(mobileSelect);
      });
      const syncMobileSelect = () => {
        mobileSelect.value = String(current);
        sizeNativeSelectToSelection(mobileSelect);
      };
      syncMobileSelect();
      window.addEventListener("resize", syncMobileSelect);
    }

    snap();
    document.fonts?.ready.then(snap);
  });
}

initStepperDemos();
initInteractionDemo();

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
  // The exit-fade-then-remove-from-layout sequencing (so a shorter tab
  // doesn't inherit a taller one's scroll height) is handled natively by
  // CSS now (display + allow-discrete/@starting-style on
  // .deep-dive-demo__shot) — no JS timing needed here.
  const selectTab = (name) => {
    shots.forEach((shot) => {
      shot.classList.toggle("is-active", shot.dataset.tab === name);
    });
    resetScroll(panelAfter);
  };

  hotspots.forEach((hotspot) => {
    hotspot.addEventListener("click", () => selectTab(hotspot.dataset.tab));
  });

  // Mobile-only controls (<768px, see style.css): two real <select>s
  // replacing the toggle pill and in-image hotspots, which measure out
  // to an 18×28px tap target at that width. Both call the exact same
  // selectPanel()/selectTab() the desktop toggle and hotspots call —
  // one state machine, two input methods.
  const mobileViewSelect = demo.querySelector('.native-select[data-role="view"]');
  const mobileTabSelectWrap = demo.querySelector(".native-select-slot");
  const mobileTabSelect = demo.querySelector('.native-select[data-role="tab"]');

  // Keeps the mobile selects' values honest if the viewport crosses the
  // 768px breakpoint after a desktop interaction (resize, tablet
  // rotation) — without this, switching to mobile width could show
  // "Before / Product" selected while the image on screen is still
  // whatever the desktop toggle/hotspot last picked.
  const syncMobileControls = () => {
    if (!mobileViewSelect) return;
    const activeToggle = toggleTabs.find((tab) => tab.getAttribute("aria-selected") === "true");
    const panelName = activeToggle ? activeToggle.dataset.panel : "before";
    mobileViewSelect.value = panelName;
    sizeNativeSelectToSelection(mobileViewSelect);
    mobileTabSelectWrap.hidden = panelName !== "after";
    const activeShot = shots.find((shot) => shot.classList.contains("is-active"));
    if (activeShot) mobileTabSelect.value = activeShot.dataset.tab;
    sizeNativeSelectToSelection(mobileTabSelect);
  };

  if (mobileViewSelect && mobileTabSelect) {
    mobileViewSelect.addEventListener("change", () => {
      mobileTabSelectWrap.hidden = mobileViewSelect.value !== "after";
      selectPanel(mobileViewSelect.value);
      sizeNativeSelectToSelection(mobileViewSelect);
    });
    mobileTabSelect.addEventListener("change", () => {
      selectTab(mobileTabSelect.value);
      sizeNativeSelectToSelection(mobileTabSelect);
    });
    syncMobileControls();
  }

  document.fonts?.ready.then(() => {
    const activeToggle = toggleTabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    snapPill(toggleOverlay, toggleTabs, activeToggle);
  });
  window.addEventListener("resize", () => {
    const activeToggle = toggleTabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    snapPill(toggleOverlay, toggleTabs, activeToggle);
    syncMobileControls();
  });
}

initDeepDiveDemo();

// Deep-dive detail pages demo (bookdrop.html, "Deep-Dive Detail Pages"):
// one native <select> switching between 5 flat dashboard screenshots —
// no toggle, no pairing, so the state machine is just "set .is-active
// on the shot whose data-page matches the select's value".
function initDetailPagesDemo() {
  const demo = document.querySelector(".detail-pages-demo");
  if (!demo) return;

  const select = demo.querySelector(".native-select");
  const shots = Array.from(demo.querySelectorAll(".detail-pages-demo__shot"));

  const selectPage = (page) => {
    shots.forEach((shot) => {
      shot.classList.toggle("is-active", shot.dataset.page === page);
    });
  };

  sizeNativeSelectToSelection(select);
  select.addEventListener("change", () => {
    selectPage(select.value);
    sizeNativeSelectToSelection(select);
  });
}

initDetailPagesDemo();

// Canvas text measurement above falls back to the browser's default font
// metrics if Geist hasn't finished loading yet when each init function
// above runs — re-measuring once it's ready corrects any select sized
// off the fallback font in the meantime.
document.fonts?.ready.then(() => {
  document.querySelectorAll(".native-select").forEach(sizeNativeSelectToSelection);
});

// Lightbox for static detail-page screenshots (.detail-image): wraps each
// image with a zoom button and reuses one shared <dialog> per page. Pure
// progressive enhancement over existing markup, so it applies to every
// detail page's .detail-image elements with no HTML changes.

// Bootstrap Icons "arrows-angle-expand" / "arrows-angle-contract" — same
// icons used for this control in Figma (node 256:21461 / 256:21210).
const ICON_ARROWS_ANGLE_EXPAND = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707m4.344-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707"/></svg>`;
const ICON_ARROWS_ANGLE_CONTRACT = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M.172 15.828a.5.5 0 0 0 .707 0l4.096-4.096V14.5a.5.5 0 1 0 1 0v-3.975a.5.5 0 0 0-.5-.5H1.5a.5.5 0 0 0 0 1h2.768L.172 15.121a.5.5 0 0 0 0 .707M15.828.172a.5.5 0 0 0-.707 0l-4.096 4.096V1.5a.5.5 0 1 0-1 0v3.975a.5.5 0 0 0 .5.5H14.5a.5.5 0 0 0 0-1h-2.768L15.828.879a.5.5 0 0 0 0-.707"/></svg>`;

function initImageLightbox() {
  const images = Array.from(document.querySelectorAll(".detail-image"));
  if (!images.length) return;

  const dialog = document.createElement("dialog");
  dialog.className = "image-lightbox";
  dialog.innerHTML = `
    <button type="button" class="image-lightbox__close" aria-label="Close image">
      ${ICON_ARROWS_ANGLE_CONTRACT}
    </button>
    <img class="image-lightbox__img" alt="" />
  `;
  document.body.appendChild(dialog);

  const lightboxImg = dialog.querySelector(".image-lightbox__img");
  const closeBtn = dialog.querySelector(".image-lightbox__close");
  let trigger = null;

  closeBtn.addEventListener("click", () => dialog.close());

  // Clicking the backdrop lands a click event on <dialog> itself (the
  // image inside has its own box, so a click on it never reaches here).
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => {
    trigger?.focus();
  });

  images.forEach((image) => {
    const wrap = document.createElement("div");
    wrap.className = "detail-image-wrap";
    image.replaceWith(wrap);
    wrap.appendChild(image);

    const zoomBtn = document.createElement("button");
    zoomBtn.type = "button";
    zoomBtn.className = "detail-image-zoom";
    zoomBtn.setAttribute("aria-label", "Zoom image");
    zoomBtn.innerHTML = ICON_ARROWS_ANGLE_EXPAND;
    wrap.appendChild(zoomBtn);

    zoomBtn.addEventListener("click", () => {
      trigger = zoomBtn;
      lightboxImg.src = image.currentSrc || image.src;
      lightboxImg.alt = image.alt;
      dialog.showModal();
    });
  });
}

initImageLightbox();
