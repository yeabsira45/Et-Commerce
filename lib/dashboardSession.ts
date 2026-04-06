const TAB_KEY = "etcom.dashboard.tab";

export type DashboardTabId = "profile" | "listings" | "settings" | "admin";

export function readDashboardTab(): DashboardTabId | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(TAB_KEY);
    if (v === "profile" || v === "listings" || v === "settings" || v === "admin") return v;
  } catch {
    /* private mode */
  }
  return null;
}

export function writeDashboardTab(id: DashboardTabId) {
  try {
    sessionStorage.setItem(TAB_KEY, id);
  } catch {
    /* ignore */
  }
}

export function clearDashboardTab() {
  try {
    sessionStorage.removeItem(TAB_KEY);
  } catch {
    /* ignore */
  }
}
