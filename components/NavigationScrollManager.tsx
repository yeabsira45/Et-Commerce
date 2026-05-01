"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

/**
 * Prevents the document from jumping to the wrong scroll position (e.g. near the footer)
 * on client-side navigations and browser back/forward, which can happen with default
 * scroll restoration on long layouts.
 */
export function NavigationScrollManager() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    window.history.scrollRestoration = "manual";
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
