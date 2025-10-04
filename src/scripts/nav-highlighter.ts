/**
 *
 * Activate navbar links on scroll
 *
 * **/

import navigations from "../data/navigations.json";

type NavHighlighterState = {
  isMobile: boolean;
  activeThreshold: number;
  observer: IntersectionObserver | null;
  lastActiveLinkId: string | null;
};

const MOBILE_THRESHOLD = 0.2;
const DESKTOP_THRESHOLD = 0.5;
const BREAKPOINT_QUERY = "(min-width: 768px)";
const ACTIVE_CLASS = "active";

function createNavHighlighter() {
  const highlightNavLink = (sectionId: string, state: NavHighlighterState) => {
    const navigation = navigations.find((n) => n.section == sectionId);
    if (!navigation) return;

    const nextActiveLinkId = state.isMobile
      ? navigation.navLinkMob
      : navigation.navLink;

    if (state.lastActiveLinkId === nextActiveLinkId) return;

    if (state.lastActiveLinkId) {
      const currentlyActiveLink = document.getElementById(
        state.lastActiveLinkId,
      );
      currentlyActiveLink?.classList.remove(ACTIVE_CLASS);
    }

    const nextActiveLink = document.getElementById(nextActiveLinkId);
    nextActiveLink?.classList.add(ACTIVE_CLASS);

    state.lastActiveLinkId = nextActiveLinkId;
  };

  const setupObserver = (state: NavHighlighterState) => {
    state.observer?.disconnect();

    const sections = navigations
      .map((n) => document.getElementById(n.section))
      .filter((s) => s !== null);

    state.observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry) => {
            highlightNavLink(entry.target.id, state);
          });
      },
      { threshold: state.activeThreshold },
    );

    sections.forEach((section) => {
      state.observer?.observe(section);
    });
  };

  const init = () => {
    document.addEventListener("DOMContentLoaded", () => {
      const mql = window.matchMedia(BREAKPOINT_QUERY);

      const isMobile = !mql.matches;
      const state: NavHighlighterState = {
        isMobile: isMobile,
        activeThreshold: isMobile ? MOBILE_THRESHOLD : DESKTOP_THRESHOLD,
        observer: null,
        lastActiveLinkId: null,
      };
      setupObserver(state);

      mql.addEventListener("change", (e) => {
        // Update the observer only if required
        if (state.isMobile !== !e.matches) {
          state.isMobile = !e.matches;
          state.activeThreshold = state.isMobile
            ? MOBILE_THRESHOLD
            : DESKTOP_THRESHOLD;

          setupObserver(state);
        }
      });
    });
  };

  return { init };
}

const highlighter = createNavHighlighter();
highlighter.init();
