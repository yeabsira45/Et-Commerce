"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectGroup = {
  label: string;
  options: SelectOption[];
};

/** Row from `resolveCategoryInsights` — full paths like "Mobile Devices → Smartphones → OnePlus". */
export type CategorySearchInsight = {
  key: string;
  pathLabel: string;
  categoryValue: string;
  /** Returned to `onCategoryInsightPick` (e.g. full detection object on the sell flow). */
  payload?: unknown;
};

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: SelectOption[];
  groups?: SelectGroup[];
  placeholder?: string;
  disabled?: boolean;
  /**
   * When the user types in the search box, optional ranked path suggestions (brand, model, subcategory, etc.).
   * Shown above filtered options; uses the same keyword logic as listing title detection.
   */
  resolveCategoryInsights?: (query: string) => CategorySearchInsight[];
  /** Called before `onChange` when the user picks a suggested path (sell page applies subcategory / hints). */
  onCategoryInsightPick?: (insight: CategorySearchInsight) => void;
};

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  groups,
  placeholder,
  disabled,
  resolveCategoryInsights,
  onCategoryInsightPick,
}: Props) {
  const [open, setOpen] = useState(false);
  const [renderDropdown, setRenderDropdown] = useState(false);
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const optionsSignature = useMemo(() => {
    if (groups) {
      return groups
        .map((group) => `${group.label}:${group.options.map((option) => option.value).join(",")}`)
        .join("|");
    }
    return (options || []).map((option) => option.value).join("|");
  }, [groups, options]);

  function closeDropdown() {
    if (!open && !renderDropdown) return;
    setOpen(false);
    setClosing(true);
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setRenderDropdown(false);
      setClosing(false);
      closeTimerRef.current = null;
    }, 150);
  }

  useEffect(() => {
    function dismissDropdown() {
      if (!open && !renderDropdown) return;
      setOpen(false);
      setClosing(true);
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      closeTimerRef.current = window.setTimeout(() => {
        setRenderDropdown(false);
        setClosing(false);
        closeTimerRef.current = null;
      }, 150);
    }

    function handleOutside(event: MouseEvent | PointerEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        dismissDropdown();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismissDropdown();
      }
    }

    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEscape);
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, [open, renderDropdown]);

  useEffect(() => {
    setQuery("");
    setOpen(false);
    setRenderDropdown(false);
    setClosing(false);
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [value, optionsSignature, disabled]);

  const insights = useMemo(() => {
    const q = query.trim();
    if (!resolveCategoryInsights || q.length < 2) return [];
    return resolveCategoryInsights(q);
  }, [query, resolveCategoryInsights]);

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const source = groups || [{ label: "", options: options || [] }];
    return source
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => option.label.toLowerCase().includes(normalized)),
      }))
      .filter((group) => group.options.length > 0);
  }, [groups, options, query]);

  const displayGroups = useMemo(() => {
    const normalized = query.trim();
    if (!normalized) return filteredGroups;
    const anyOptions = filteredGroups.some((g) => g.options.length > 0);
    if (!anyOptions && insights.length > 0) {
      return groups || [{ label: "", options: options || [] }];
    }
    return filteredGroups;
  }, [query, filteredGroups, insights.length, groups, options]);

  const showNoMatches =
    displayGroups.every((g) => g.options.length === 0) || displayGroups.length === 0;

  const fallbackPlaceholder = `Select ${label}`;
  const searchPlaceholder = `Search ${label}...`;

  return (
    <div className="sellFieldWrapper" ref={ref}>
      <button
        type="button"
        className={`sellField sellSelect sellSelectModern ${open ? "sellSelectActive" : ""} ${disabled ? "sellSelectDisabled" : ""}`}
        onClick={() => {
          if (disabled) return;
          if (open) {
            closeDropdown();
            return;
          }
          setRenderDropdown(true);
          setClosing(false);
          setOpen(true);
        }}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="sellSelectCopy">
          <span className="sellFieldLabel">{label}</span>
          <span className={value ? "sellValue" : "sellPlaceholder"}>{value || placeholder || fallbackPlaceholder}</span>
        </div>
        <span className={`sellChevron ${open ? "isOpen" : ""}`}>v</span>
      </button>

      {renderDropdown ? (
        <div className={`sellDropdown sellDropdownModern ${closing ? "isClosing" : ""}`} role="listbox" aria-label={label}>
          <div className="sellDropdownSearchWrap">
            <input
              className="sellDropdownSearch"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
            />
          </div>
          {insights.length > 0 ? (
            <div className="sellDropdownInsights" role="group" aria-label="Suggested category paths">
              <div className="sellDropdownInsightHeading">Suggested paths</div>
              <p className="sellDropdownInsightHint">Based on your keyword — pick the best fit. Multiple paths appear when the term matches more than one category.</p>
              {insights.map((insight) => (
                <button
                  key={insight.key}
                  type="button"
                  className="sellDropdownInsightBtn"
                  onClick={() => {
                    onChange(insight.categoryValue);
                    onCategoryInsightPick?.(insight);
                    setQuery("");
                    closeDropdown();
                  }}
                >
                  <span className="sellDropdownInsightPath">{insight.pathLabel}</span>
                  <span className="sellDropdownInsightCategory">{insight.categoryValue}</span>
                </button>
              ))}
            </div>
          ) : null}
          {displayGroups.map((group) => (
            <div key={group.label || "default"}>
              {group.label ? <div className="sellDropdownGroupLabel">{group.label}</div> : null}
              {group.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`sellDropdownItem ${option.value === value ? "isSelected" : ""}`}
                  onClick={() => {
                    onChange(option.value);
                    setQuery("");
                    closeDropdown();
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ))}
          {showNoMatches && insights.length === 0 ? <div className="sellDropdownEmpty">No matches found.</div> : null}
        </div>
      ) : null}
    </div>
  );
}
