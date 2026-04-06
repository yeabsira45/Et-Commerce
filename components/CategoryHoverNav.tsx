"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import type { HomeCategory } from "@/lib/categories";
import {
  buildCategoryBrowseHref,
  getSubcategoriesForNav,
  getThirdLevelForNav,
  hasThirdLevelNav,
} from "@/lib/categoryNavHelpers";
import { getNavItemEmoji } from "@/lib/navItemEmoji";

const HIDE_DELAY_MS = 180;
const CLOSE_FADE_MS = 220;

type Props = {
  categories: HomeCategory[];
};

function FlyoutLabel({ label }: { label: string }) {
  return (
    <span className="categoryFlyoutItemLinkInner">
      <span className="categoryFlyoutItemEmoji" aria-hidden>
        {getNavItemEmoji(label)}
      </span>
      <span className="categoryFlyoutItemLabel">{label}</span>
    </span>
  );
}

export function CategoryHoverNav({ categories: cats }: Props) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openSubcategory, setOpenSubcategory] = useState<string | null>(null);
  const [flyoutClosing, setFlyoutClosing] = useState(false);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const clearCloseAnimTimer = useCallback(() => {
    if (closeAnimTimerRef.current) {
      clearTimeout(closeAnimTimerRef.current);
      closeAnimTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (closeAnimTimerRef.current) clearTimeout(closeAnimTimerRef.current);
    };
  }, []);

  const cancelHide = useCallback(() => {
    clearHideTimer();
    clearCloseAnimTimer();
    setFlyoutClosing(false);
  }, [clearHideTimer, clearCloseAnimTimer]);

  useLayoutEffect(() => {
    if (!openCategory || flyoutClosing) return;
    const root = rootRef.current;
    const row = rowRefs.current[openCategory];
    if (!root || !row) return;
    setFlyoutTop(row.offsetTop);
  }, [openCategory, flyoutClosing]);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    clearCloseAnimTimer();
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setFlyoutClosing(true);
      closeAnimTimerRef.current = setTimeout(() => {
        setOpenCategory(null);
        setOpenSubcategory(null);
        setFlyoutClosing(false);
        closeAnimTimerRef.current = null;
      }, CLOSE_FADE_MS);
    }, HIDE_DELAY_MS);
  }, [clearHideTimer, clearCloseAnimTimer]);

  const onCategoryEnter = (name: string) => {
    cancelHide();
    const subs = getSubcategoriesForNav(name);
    if (subs.length === 0) {
      setOpenCategory(null);
      setOpenSubcategory(null);
      return;
    }
    setOpenCategory(name);
    setOpenSubcategory(null);
  };

  const onSubEnter = (categoryName: string, sub: string) => {
    cancelHide();
    setOpenCategory(categoryName);
    setOpenSubcategory(hasThirdLevelNav(categoryName, sub) ? sub : null);
  };

  const activeCat = cats.find((c) => c.name === openCategory);
  const subs = activeCat ? getSubcategoriesForNav(activeCat.name) : [];
  const thirdItems =
    activeCat && openSubcategory ? getThirdLevelForNav(activeCat.name, openSubcategory) : [];

  return (
    <div ref={rootRef} className="categoryNavRoot" onMouseLeave={scheduleHide}>
      <div className="categoryNavList" role="navigation" aria-label="Browse categories">
        {cats.map((cat) => {
          const hasChildren = getSubcategoriesForNav(cat.name).length > 0;
          const isActive = openCategory === cat.name;
          return (
            <div
              key={cat.name}
              ref={(el) => {
                rowRefs.current[cat.name] = el;
              }}
              className={`categoryNavRow ${isActive ? "isActive" : ""}`}
              onMouseEnter={() => onCategoryEnter(cat.name)}
              onFocus={() => onCategoryEnter(cat.name)}
            >
              <Link href={cat.path} className="categoryNavRowLink" onClick={cancelHide}>
                <div className="categoryLeft">
                  <div className="categoryIcon" aria-hidden>
                    {cat.icon}
                  </div>
                  <div>
                    <div className="categoryName">{cat.name}</div>
                    <div className="categoryCount">{cat.count}</div>
                  </div>
                </div>
              </Link>
              {hasChildren ? (
                <span className="categoryNavChev" aria-hidden>
                  →
                </span>
              ) : (
                <span className="categoryNavChev categoryNavChevMuted" aria-hidden>
                  {" "}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {activeCat && subs.length > 0 ? (
        <div
          key={activeCat.name}
          className={`categoryFlyoutStack ${flyoutClosing ? "isClosing" : ""}`}
          style={{ top: flyoutTop }}
          onMouseEnter={cancelHide}
          role="presentation"
        >
          <div className="categoryFlyoutBridge" aria-hidden />
          <div className="categoryFlyoutPanel categoryFlyoutL2" role="menu" aria-label={`${activeCat.name} subcategories`}>
            {subs.map((sub) => {
              const has3 = hasThirdLevelNav(activeCat.name, sub);
              const subHref = buildCategoryBrowseHref(activeCat, sub);
              const subOpen = openSubcategory === sub;
              return (
                <div
                  key={sub}
                  className={`categoryFlyoutItem ${subOpen ? "isActive" : ""}`}
                  onMouseEnter={() => onSubEnter(activeCat.name, sub)}
                  onFocus={() => onSubEnter(activeCat.name, sub)}
                >
                  <Link href={subHref} className="categoryFlyoutItemLink" role="menuitem" onClick={cancelHide}>
                    <FlyoutLabel label={sub} />
                  </Link>
                  {has3 ? <span className="categoryFlyoutArrow">→</span> : null}
                </div>
              );
            })}
          </div>

          {openSubcategory && thirdItems.length > 0 ? (
            <>
              <div className="categoryFlyoutGap" aria-hidden />
              <div
                key={openSubcategory}
                className="categoryFlyoutPanel categoryFlyoutL3 categoryFlyoutL3Animate"
                role="menu"
                aria-label={`${openSubcategory} types`}
              >
                {thirdItems.map((item) => {
                  const href = buildCategoryBrowseHref(activeCat, openSubcategory, item);
                  return (
                    <div key={item} className="categoryFlyoutItem categoryFlyoutItemLeaf">
                      <Link href={href} className="categoryFlyoutItemLink" role="menuitem" onClick={cancelHide}>
                        <FlyoutLabel label={item} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
