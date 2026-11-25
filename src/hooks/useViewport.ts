import { useEffect, useState } from "react";

export type ViewportMode =
  "mobile-portrait" | "mobile-landscape" | "tablet" | "desktop";

export interface ViewportInfo {
  mode: ViewportMode;
  isMobilePortrait: boolean;
  isMobileLandscape: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export const MOBILE_LANDSCAPE_QUERY =
  "(max-height: 520px) and (min-width: 480px) and (max-width: 960px)";
export const MOBILE_PORTRAIT_QUERY =
  "(max-width: 760px) and (min-height: 521px), (max-width: 479px)";
export const TABLET_QUERY =
  "(min-width: 761px) and (max-width: 1180px) and (min-height: 521px)";

function detectViewportMode(): ViewportMode {
  if (typeof window === "undefined" || !window.matchMedia) return "desktop";
  if (window.matchMedia(MOBILE_LANDSCAPE_QUERY).matches) {
    return "mobile-landscape";
  }
  if (window.matchMedia(MOBILE_PORTRAIT_QUERY).matches) {
    return "mobile-portrait";
  }
  if (window.matchMedia(TABLET_QUERY).matches) {
    return "tablet";
  }
  return "desktop";
}

function buildInfo(mode: ViewportMode): ViewportInfo {
  return {
    mode,
    isMobilePortrait: mode === "mobile-portrait",
    isMobileLandscape: mode === "mobile-landscape",
    isMobile: mode === "mobile-portrait" || mode === "mobile-landscape",
    isTablet: mode === "tablet",
    isDesktop: mode === "desktop",
  };
}

export function useViewport(): ViewportInfo {
  const [mode, setMode] = useState<ViewportMode>(detectViewportMode);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const queries = [
      window.matchMedia(MOBILE_LANDSCAPE_QUERY),
      window.matchMedia(MOBILE_PORTRAIT_QUERY),
      window.matchMedia(TABLET_QUERY),
    ];
    const update = () => setMode(detectViewportMode());
    queries.forEach((mq) => mq.addEventListener("change", update));
    window.addEventListener("resize", update);
    return () => {
      queries.forEach((mq) => mq.removeEventListener("change", update));
      window.removeEventListener("resize", update);
    };
  }, []);

  return buildInfo(mode);
}
