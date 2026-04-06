"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import "../../sell/sell.css";
import "./dashboard.css";
import { useAppContext } from "@/components/AppContext";
import { VendorProfileForm } from "@/components/VendorProfileForm";
import { DashboardMyListings } from "@/components/dashboard/DashboardMyListings";
import { DashboardSettings } from "@/components/dashboard/DashboardSettings";
import { DashboardAdmin } from "@/components/dashboard/DashboardAdmin";
import { canAccessAdminTab } from "@/lib/dashboardPermissions";
import { readDashboardTab, writeDashboardTab, type DashboardTabId } from "@/lib/dashboardSession";

type TabId = DashboardTabId;

export default function VendorDashboardPage() {
  const { user, refreshUser } = useAppContext();
  const [tab, setTabState] = useState<TabId>("profile");

  useLayoutEffect(() => {
    const saved = readDashboardTab();
    if (saved) setTabState(saved);
  }, []);

  const setTab = useCallback((id: TabId) => {
    setTabState(id);
    writeDashboardTab(id);
  }, []);

  const tabs = useMemo(() => {
    const base: { id: TabId; label: string }[] = [
      { id: "profile", label: "Profile" },
      { id: "listings", label: "My Listings" },
      { id: "settings", label: "Settings" },
    ];
    if (user && canAccessAdminTab(user.role)) {
      base.push({ id: "admin", label: "Admin" });
    }
    return base;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (tab === "admin" && !canAccessAdminTab(user.role)) {
      setTab("profile");
    }
  }, [user, tab, setTab]);

  if (!user) {
    return (
      <div className="container dashboardShell">
        <div className="dashboardPanel">
          <p>Please sign in to open your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container dashboardShell">
      <div className="dashboardTabs" role="tablist" aria-label="Dashboard sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`dashboardTab ${tab === t.id ? "dashboardTabActive" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="dashboardPanel" role="tabpanel">
        {tab === "profile" ? <VendorProfileForm variant="embed" onSaved={() => void refreshUser()} /> : null}
        {tab === "listings" ? <DashboardMyListings /> : null}
        {tab === "settings" ? <DashboardSettings /> : null}
        {tab === "admin" && canAccessAdminTab(user.role) ? <DashboardAdmin user={user} /> : null}
      </div>
    </div>
  );
}
