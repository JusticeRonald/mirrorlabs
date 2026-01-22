import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  // Use useLayoutEffect to scroll before paint
  useLayoutEffect(() => {
    // Scroll to top immediately with no smooth behavior
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  // Fallback for any edge cases
  useEffect(() => {
    // Double-check scroll position after render
    const timeout = setTimeout(() => {
      if (window.scrollY !== 0) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
