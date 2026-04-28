import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * On every route change, snap window + document scroll to top.
 * Without this, navigating from a deep-scrolled page (e.g. logging out
 * from /account) leaves the new page (/) starting in the middle.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use 'auto' (instant) — smooth scroll on a fresh page is jarring.
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      window.scrollTo(0, 0);
    }
    if (typeof document !== "undefined") {
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
