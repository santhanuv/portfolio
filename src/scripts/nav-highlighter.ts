/**
 *
 * Activate navbar links on scroll
 *
 * **/

import navigations from "../data/navigations.json";

type NavHighlighterState = {
  isMobile: boolean;
  rootMargin: string;
  observer: IntersectionObserver | null;
  lastActiveLinkId: string | null;
};

const DESKTOP_MARGIN = "-100px 0px -80% 0px";
const MOBILE_MARGIN = "-50px 0px -80% 0px";
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
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length === 0) {
          return;
        }

        const topMostSection =
          visibleEntries.reduce<IntersectionObserverEntry | null>(
            (best, current) => {
              if (
                !best ||
                current.boundingClientRect.top < best.boundingClientRect.top
              ) {
                return current;
              }
              return best;
            },
            null,
          );

        if (topMostSection) {
          highlightNavLink(topMostSection.target.id, state);
        }
      },
      { threshold: 0, rootMargin: state.rootMargin },
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
        rootMargin: isMobile ? MOBILE_MARGIN : DESKTOP_MARGIN,
        observer: null,
        lastActiveLinkId: null,
      };
      setupObserver(state);

      mql.addEventListener("change", (e) => {
        // Update the observer only if required
        if (state.isMobile !== !e.matches) {
          state.isMobile = !e.matches;
          state.rootMargin = state.isMobile ? MOBILE_MARGIN : DESKTOP_MARGIN;

          setupObserver(state);
        }
      });
    });
  };

  return { init };
}

const highlighter = createNavHighlighter();
highlighter.init();
