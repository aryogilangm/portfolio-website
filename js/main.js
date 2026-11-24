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

  // .navbar--hidden only moves the bar off-screen with transform — its
  // links stay in the tab order and keyboard-focusable the whole time,
  // so a keyboard user can land focus on something they can't see.
  // inert closes that off; toggled alongside the class everywhere it's
  // set, not just here, so it can't drift out of sync with it.
  // The class doesn't always mean visually hidden — .navbar--home
  // cancels the transform at desktop (see css/style.css) to stay
  // persistent there. Mirrors that CSS condition directly instead of
  // reading the live computed transform: the transition takes 900ms, so
  // checking right after toggling the class would catch it mid-animation
  // and read the wrong value almost every time.
  const staysVisibleWhenHidden = () =>
    navbar.classList.contains("navbar--home") &&
    window.matchMedia("(min-width: 1280px)").matches;

  const setHidden = (hidden) => {
    navbar.classList.toggle("navbar--hidden", hidden);
    // inert closes off tabbing into a navbar that's off-screen — toggled
    // alongside the class everywhere it's set, not just here, so it
    // can't drift out of sync with it.
    navbar.inert = hidden && !staysVisibleWhenHidden();
  };

  window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY;
    const scrollingDown = currentScrollY > lastScrollY;

    if (scrollingDown && currentScrollY > navbar.offsetHeight) {
      setHidden(true);
    } else if (!scrollingDown) {
      setHidden(false);
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
        setHidden(false);
      }
    });
  }
}

initNavbarScroll();

// Scroll progress — writes --scroll-progress (0-1) on .scroll-progress
// so its CSS fill can read it via transform: scaleX(), see style.css.
// No-ops on pages that don't have the element (most of the site).
function initScrollProgress() {
  const bar = document.querySelector(".scroll-progress");
  if (!bar) return;

  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    bar.style.setProperty("--scroll-progress", Math.min(1, Math.max(0, progress)));
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

initScrollProgress();

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

    // Slid off-screen with transform, same as .navbar--hidden — without
    // inert its trigger button (and, if open, its links) stay tabbable
    // while invisible. Only goes inert below 1280px, the one breakpoint
    // where the hide CSS rule actually applies; harmless no-op above it.
    const setHidden = (hidden) => {
      nav.classList.toggle("content-nav--hidden", hidden);
      nav.inert = hidden && window.matchMedia("(max-width: 1279.98px)").matches;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (nav.classList.contains("is-expanded")) collapse();

        const currentScrollY = window.scrollY;
        const scrollingDown = currentScrollY > lastScrollY;

        if (scrollingDown && currentScrollY > nav.offsetHeight) {
          setHidden(true);
        } else if (!scrollingDown) {
          setHidden(false);
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

  // Clamp to the row container's width (.native-select-wrap's parent —
  // always .native-select-row / .detail-pages-demo__control /
  // .native-select-slot, see components.md §12) so a long option on a
  // narrow card shrinks to fit instead of overflowing it.
  const wrap = select.parentElement;
  const container = wrap && wrap.parentElement;
  const maxAvailable = container ? container.clientWidth : Infinity;
  const finalWidth = Math.min(Math.ceil(textWidth + boxExtra), maxAvailable);

  select.style.width = `${finalWidth}px`;
  // .native-select-wrap is `width: fit-content` so it shrink-wraps the
  // select (needed for the absolutely-positioned chevron icon). But
  // its intrinsic size doesn't reliably re-measure off a GRANDCHILD's
  // width changing two levels down through a flex ancestor — it can
  // stay stuck at a stale (often much smaller) size. Setting it
  // explicitly here, alongside the select, sidesteps that entirely.
  if (wrap) wrap.style.width = `${finalWidth}px`;
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

// Suroboyo Bus article ("Designing for The People who Ride"): one native
// <select> swaps between three grids of generated background options.
function initThemeVibes() {
  const demo = document.querySelector(".vibes");
  if (!demo) return;

  const select = demo.querySelector(".native-select");
  const grids = Array.from(demo.querySelectorAll(".vibes__grid"));

  sizeNativeSelectToSelection(select);
  select.addEventListener("change", () => {
    grids.forEach((grid) => {
      grid.hidden = grid.dataset.themeVibe !== select.value;
    });
    sizeNativeSelectToSelection(select);
  });
}

initThemeVibes();

// Suroboyo Bus article: the live map iframe has a fixed 1440x960 layout; scale it to whatever width its frame has.
function initLiveMapFrames() {
  const root = document.documentElement;
  const isDark = () => root.dataset.theme === "dark";
  const maps = Array.from(document.querySelectorAll(".fig-frame__live"));

  // The map has its own four "times of day"; the article's light/dark maps to Early morning / Night. Set before the
  // iframe loads (?waktu=) so a dark page never flashes the light map, and switched live via the map's own API.
  const themed = (src) => src.replace(/[?&]waktu=\w+/, "") + (isDark() ? "&waktu=malam" : "");
  maps.forEach((map) => {
    if (isDark()) map.src = themed(map.src);
  });
  new MutationObserver(() => {
    maps.forEach((map) => {
      const api = map.contentWindow?.__peta;
      if (api) api.setMode(isDark() ? "malam" : "pagi");
      else map.src = themed(map.src); // not loaded yet (lazy): just change what it will load
    });
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  document.querySelectorAll(".fig-frame--live").forEach((frame) => {
    const fit = () => frame.style.setProperty("--live-scale", String(frame.clientWidth / 1440));
    fit();
    new ResizeObserver(fit).observe(frame);
  });
}

initLiveMapFrames();

// Suroboyo Bus article ("Tools Instead of Prompts"): the button shows and hides a floating panel with the map tools.
// The panel's iframe loads on first open, so visitors who never open it don't download the tools.
function initToolsPanel() {
  const button = document.querySelector("[data-tools-toggle]");
  const panel = document.querySelector(".tools-panel");
  if (!button || !panel) return;
  const frame = panel.querySelector(".tools-panel__frame");
  const navbar = document.querySelector(".navbar");
  const syncNavbar = () => {
    if (navbar) panel.style.setProperty("--navbar-h", `${navbar.offsetHeight}px`);
  };
  syncNavbar();
  window.addEventListener("resize", syncNavbar);

  const setOpen = (open) => {
    if (open && !frame.src) frame.src = frame.dataset.src;
    panel.classList.toggle("is-open", open);
    panel.inert = !open;
    button.setAttribute("aria-expanded", String(open));
    button.textContent = open ? "Hide the tools" : "Play with the tools";
  };
  button.addEventListener("click", () => setOpen(button.getAttribute("aria-expanded") !== "true"));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) {
      setOpen(false);
      button.focus();
    }
  });
}

initToolsPanel();

// Suroboyo Bus article ("Getting the Routes Right"): a native <select> switches the embedded prototype between
// Geographic and Eight directions (the embedded page reads documentElement.dataset.view).
function initPrototypeSwitch() {
  const frame = document.querySelector(".fig-frame--proto");
  if (!frame) return;
  const select = frame.querySelector(".native-select");
  const iframe = frame.querySelector(".fig-frame__proto");
  const apply = () => {
    const doc = iframe.contentDocument;
    if (doc?.documentElement.hasAttribute("data-embed")) doc.documentElement.dataset.view = select.value;
  };

  sizeNativeSelectToSelection(select);
  select.addEventListener("change", () => {
    apply();
    sizeNativeSelectToSelection(select);
  });
  iframe.addEventListener("load", apply);
}

initPrototypeSwitch();

// Canvas text measurement above falls back to the browser's default font
// metrics if Geist hasn't finished loading yet when each init function
// above runs — re-measuring once it's ready corrects any select sized
// off the fallback font in the meantime.
document.fonts?.ready.then(() => {
  document.querySelectorAll(".native-select").forEach(sizeNativeSelectToSelection);
});

// Lightbox for static detail-page screenshots (.detail-image): wraps
// each image with a zoom button and reuses one shared <dialog> per
// page. Pure progressive enhancement over existing markup, so it
// applies to every detail page's .detail-image elements with no HTML
// changes. Not applied to the article template's .fig-frame__img
// diagrams: .fig-frame centers its image via place-items: center,
// which only works when the <img> itself is the direct grid item —
// the lightbox's button wrapper (width: 100%, no centering of its own
// content) fills the whole track instead, leaving the narrower image
// flush left inside it.

// Image lightbox: the whole image is the click target (cursor: zoom-in
// in style.css is the only hover affordance, no icon overlay) —
// modeled on thinkingroominc.com's case-study pages. The enlarged
// image morphs directly out of the exact on-page position/size of the
// thumbnail that was clicked, via the native View Transitions API
// (document.startViewTransition(), moving view-transition-name between
// the thumbnail and the dialog's own <img> — see setContinuityName()
// below), and reverses the same morph back into the thumbnail on
// close. Falls back to a plain, unanimated open/close where the API
// doesn't exist or the user prefers reduced motion. Closes via Escape,
// a backdrop click, or (touch only) a drag-down-to-dismiss on the
// image itself, which is its own gesture-driven exit. No visible close
// button — these are already every way in and out.
function initImageLightbox() {
  const images = Array.from(document.querySelectorAll(".detail-image"));
  if (!images.length) return;

  const dialog = document.createElement("dialog");
  dialog.className = "image-lightbox";
  dialog.innerHTML = `<img class="image-lightbox__img" alt="" />`;
  document.body.appendChild(dialog);

  // Falls back to a plain, unanimated open/close where the View
  // Transitions API doesn't exist (Firefox, older Safari) or the user
  // prefers reduced motion — checked per open/close, not just once,
  // since prefers-reduced-motion can change mid-session.
  const supportsViewTransitions = !!document.startViewTransition;
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // .theme-toggle carries a permanent view-transition-name (style.css)
  // for the site's own light/dark wipe transition, so its own layer
  // survives that wipe. But view-transition-name isn't scoped to the
  // transition that's supposed to use it — ANY startViewTransition()
  // call anywhere on the page, ours included, captures it as its own
  // extra animated group too, at the UA default duration/easing,
  // unrelated to and unsynchronized with the lightbox's own, which
  // showed up as an extra ghost layer during the open/close morph.
  // "none" (not "") overrides the CSS-set name while in flight; clearing
  // the inline value afterwards lets the CSS rule re-apply for the
  // actual theme-switch feature. Cleared at `finished`, once the whole
  // transition (snapshots AND the animation itself) is completely over
  // — not at `ready`, which only means the snapshots are taken and the
  // animation is *about* to start; mutating any element's style while
  // the transition's pseudo-element overlay is still actively animating
  // leaves a stale copy of the old snapshot visibly stuck on screen for
  // a few frames.
  //
  // activeCount (not a bare boolean) is what makes this safe when a
  // close follows an open quickly enough to overlap it — e.g. Escape
  // within ~100ms, well inside the open transition's own ~300ms.
  // Calling startViewTransition() again while one is still running
  // makes the browser skip the first one immediately, resolving ITS
  // `finished` right as the second transition is still being set up or
  // is already capturing its own snapshots. With a plain "clear on my
  // own finished", the first (open) transition's cleanup fires in that
  // window and restores the real theme-toggle name while the second
  // (close) transition is mid-flight — reproducing the same stale-
  // snapshot ghost via two overlapping calls instead of one mistimed
  // one. The counter only restores the real name once every overlapping
  // call (including skipped ones) has resolved.
  let activeViewTransitionCount = 0;
  function startLightboxViewTransition(updateCallback) {
    const themeToggle = document.querySelector(".theme-toggle");
    if (activeViewTransitionCount === 0 && themeToggle) themeToggle.style.viewTransitionName = "none";
    activeViewTransitionCount++;
    const transition = document.startViewTransition(updateCallback);
    // `ready` and `updateCallbackDone` ALSO reject independently when a
    // transition is skipped (not just `finished`) — we never read
    // either here, so a rejection on them would otherwise be its own,
    // separate unhandled promise rejection. Silencing both alongside
    // `finished` below.
    transition.ready.catch(() => {});
    transition.updateCallbackDone.catch(() => {});
    // `finished` REJECTS (AbortError), not resolves, for a transition
    // that got skipped by a newer one starting — exactly the overlap
    // case this whole function exists for. .catch() first so that
    // rejection doesn't surface as an unhandled promise rejection; the
    // counter still needs to run either way.
    transition.finished.catch(() => {}).finally(() => {
      activeViewTransitionCount--;
      if (activeViewTransitionCount === 0 && themeToggle) themeToggle.style.viewTransitionName = "";
    });
    return transition;
  }

  // Only one element may carry view-transition-name: lightbox-shared at
  // a time — the API requires it unique across the old/new snapshot
  // trees. Tracking which one currently has it (instead of just setting
  // it on whichever element is at hand) means the PREVIOUS holder is
  // always cleared first: without this, closing back onto thumbnail A
  // then opening thumbnail B left A still tagged, so both A and B
  // carried the name at once — a duplicate that breaks the pairing
  // silently, falling back to the browser's default root cross-fade.
  let continuityNamedEl = null;
  function setContinuityName(el) {
    if (continuityNamedEl && continuityNamedEl !== el) continuityNamedEl.style.viewTransitionName = "";
    if (el) el.style.viewTransitionName = "lightbox-shared";
    continuityNamedEl = el;
  }

  const lightboxImg = dialog.querySelector(".image-lightbox__img");
  let activeTrigger = null;
  let activeSourceImg = null;

  function closeLightbox() {
    if (!dialog.open) return;
    if (!supportsViewTransitions || reducedMotion()) {
      dialog.close();
      return;
    }
    // Move the name from lightboxImg back onto the thumbnail it opened
    // from, inside the mutation callback, so the API morphs the
    // lightbox image back down into its grid slot instead of just
    // disappearing in place.
    setContinuityName(lightboxImg);
    startLightboxViewTransition(() => {
      dialog.close();
      setContinuityName(activeSourceImg);
    });
  }

  // Clicking the backdrop lands a click event on <dialog> itself (the
  // image inside has its own box, so a click on it never reaches here).
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeLightbox();
  });

  // Escape fires "cancel" (cancelable) before the dialog closes itself
  // — prevent the default instant close and run the view-transition
  // close first instead, same as every other close path.
  dialog.addEventListener("cancel", (event) => {
    if (reducedMotion()) return;
    event.preventDefault();
    closeLightbox();
  });

  dialog.addEventListener("close", () => {
    activeTrigger?.focus({ preventScroll: true });
    lightboxImg.classList.remove("is-dragging");
    activeSourceImg = null;
  });

  // Drag-down-to-dismiss — touch only (desktop has Escape and the
  // backdrop click instead; touchstart/move/end simply never fire for
  // a mouse, so nothing extra is needed to keep this off desktop).
  // Follows the finger 1:1 while dragging — a transition here would
  // fight every touchmove frame (see .is-dragging in style.css) — and
  // past DISMISS_THRESHOLD it closes immediately (the drag itself was
  // the exit motion); short of it, it springs back via the CSS
  // transition restored once the drag ends.
  const DISMISS_THRESHOLD = 110;
  let dragStartY = null;
  let dragDeltaY = 0;

  lightboxImg.addEventListener(
    "touchstart",
    (event) => {
      dragStartY = event.touches[0].clientY;
      lightboxImg.classList.add("is-dragging");
    },
    { passive: true },
  );

  lightboxImg.addEventListener(
    "touchmove",
    (event) => {
      if (dragStartY === null) return;
      dragDeltaY = Math.max(0, event.touches[0].clientY - dragStartY);
      lightboxImg.style.transform = `translateY(${dragDeltaY}px)`;
      lightboxImg.style.opacity = String(1 - Math.min(dragDeltaY / 300, 0.6));
    },
    { passive: true },
  );

  const endDrag = () => {
    if (dragStartY === null) return;
    lightboxImg.classList.remove("is-dragging");
    if (dragDeltaY > DISMISS_THRESHOLD) {
      dialog.close();
    } else {
      lightboxImg.style.transform = "";
      lightboxImg.style.opacity = "";
    }
    dragStartY = null;
    dragDeltaY = 0;
  };

  lightboxImg.addEventListener("touchend", endDrag);
  lightboxImg.addEventListener("touchcancel", endDrag);

  images.forEach((image) => {
    const button = document.createElement("button");
    button.type = "button";
    // .detail-image-wrap: layout hook other rules key off (see
    // style.css). .detail-image-trigger: the button reset + cursor.
    button.className = "detail-image-wrap detail-image-trigger";
    button.setAttribute("aria-label", "Open image full size");
    image.replaceWith(button);
    button.appendChild(image);

    button.addEventListener("click", () => {
      activeTrigger = button;
      activeSourceImg = image;
      // Crop to 3:2 for a standalone .detail-image (its own thumbnail
      // is already cropped that way); leave a .detail-image-grid image
      // at its natural ratio, same as its own thumbnail.
      lightboxImg.classList.toggle("is-cropped", !image.closest(".detail-image-grid"));

      if (!supportsViewTransitions || reducedMotion()) {
        lightboxImg.src = image.currentSrc || image.src;
        lightboxImg.alt = image.alt;
        dialog.showModal();
        return;
      }

      // The mutation callback is what the View Transitions API actually
      // diffs — the name has to move from the thumbnail to lightboxImg
      // *inside* it (not before/after), so the "old" snapshot is the
      // thumbnail as it was and the "new" snapshot is lightboxImg as it
      // ends up.
      //
      // Decode happens *before* startViewTransition() is called, not
      // inside its update callback. An async update callback means the
      // API's internal "capture new snapshot" step has to wait on our
      // promise too — under rapid or back-to-back opens this produced a
      // case where an open was delayed by a full extra cycle. Pre-
      // decoding keeps the update callback synchronous, which the API
      // can run and capture immediately.
      lightboxImg.src = image.currentSrc || image.src;
      lightboxImg.alt = image.alt;
      lightboxImg
        .decode()
        .catch(() => {})
        .then(() => {
          if (activeSourceImg !== image) return; // superseded by a later click
          setContinuityName(image);
          startLightboxViewTransition(() => {
            dialog.showModal();
            setContinuityName(lightboxImg);
          });
        });
    });
  });
}

initImageLightbox();
