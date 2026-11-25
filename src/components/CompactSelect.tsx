import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface CompactSelectOption {
  value: string;
  label: string;
  searchText?: string;
}

export interface CompactSelectProps {
  ariaLabel: string;
  value: string;
  options: CompactSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  layout?: "list" | "grid";
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  minPopoverWidth?: number;
  disabled?: boolean;
}

interface PopoverGeometry {
  style: CSSProperties;
  placement: "below" | "above";
  listMaxHeight: number;
}

export function CompactSelect({
  ariaLabel,
  value,
  options,
  onChange,
  placeholder = "请选择",
  layout = "list",
  searchable = false,
  searchPlaceholder = "搜索选项…",
  className = "",
  minPopoverWidth,
  disabled = false,
}: CompactSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [geometry, setGeometry] = useState<PopoverGeometry | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const listboxId = useId();
  const optionIdPrefix = useId();

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) =>
      `${opt.label} ${opt.value} ${opt.searchText ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [options, query]);

  const closeAndRestoreFocus = (restoreFocus: boolean) => {
    setOpen(false);
    setQuery("");
    if (restoreFocus) {
      requestAnimationFrame(() => {
        if (triggerRef.current?.isConnected) {
          triggerRef.current.focus({ preventScroll: true });
        }
      });
    }
  };

  const selectOption = (nextValue: string) => {
    if (nextValue !== value) {
      onChange(nextValue);
    }
    closeAndRestoreFocus(true);
  };

  const openMenu = (focusTarget: "list" | "first" | "last" = "list") => {
    if (disabled) return;
    setQuery("");
    const selectedIdx = options.findIndex((opt) => opt.value === value);
    if (focusTarget === "first") {
      setActiveIndex(0);
    } else if (focusTarget === "last") {
      setActiveIndex(Math.max(0, options.length - 1));
    } else {
      setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
    }
    setOpen(true);
  };

  // Clamp activeIndex whenever filteredOptions changes
  useEffect(() => {
    if (!open) return;
    if (filteredOptions.length === 0) {
      setActiveIndex(-1);
      return;
    }
    const selIdx = filteredOptions.findIndex((o) => o.value === value);
    if (query.trim()) {
      setActiveIndex(0);
    } else {
      setActiveIndex(selIdx >= 0 ? selIdx : 0);
    }
  }, [open, query, filteredOptions, value]);

  // Compute anchored fixed coordinates that keep surrounding context visible & stay inside viewport
  useLayoutEffect(() => {
    if (!open) {
      setGeometry(null);
      return;
    }

    const computePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 8;
      const gap = 6;
      const isShortLandscape = vh <= 520;
      const preferredTotal = searchable
        ? isShortLandscape
          ? 230
          : 310
        : layout === "grid"
          ? isShortLandscape
            ? 210
            : 260
          : isShortLandscape
            ? 200
            : 270;

      const spaceBelow = vh - rect.bottom - margin - gap;
      const spaceAbove = rect.top - margin - gap;
      const placement: "below" | "above" =
        spaceBelow >= Math.min(preferredTotal, 168) || spaceBelow >= spaceAbove
          ? "below"
          : "above";
      const availHeight = Math.max(
        112,
        Math.min(
          preferredTotal,
          placement === "below" ? spaceBelow : spaceAbove,
        ),
      );
      const chromeHeight = searchable ? 48 : 12;
      const listMaxHeight = Math.max(76, availHeight - chromeHeight);

      const defaultMinWidth =
        minPopoverWidth ?? (searchable ? 268 : layout === "grid" ? 248 : 188);
      const maxWidth = Math.max(160, vw - margin * 2);
      const width = Math.min(maxWidth, Math.max(rect.width, defaultMinWidth));

      // Keep clear of the 58px left navigation rail in landscape if possible
      const leftBound = isShortLandscape && vw >= 480 ? 64 : margin;
      const idealLeft = rect.left;
      const clampedLeft = Math.min(
        Math.max(idealLeft, leftBound),
        Math.max(leftBound, vw - width - margin),
      );

      const style: CSSProperties = {
        position: "fixed",
        left: `${Math.round(clampedLeft)}px`,
        width: `${Math.round(width)}px`,
        ...(placement === "below"
          ? { top: `${Math.round(rect.bottom + gap)}px` }
          : { bottom: `${Math.round(vh - rect.top + gap)}px` }),
      };

      setGeometry({ style, placement, listMaxHeight });
    };

    computePosition();
    window.addEventListener("resize", computePosition);
    window.addEventListener("scroll", computePosition, true);
    return () => {
      window.removeEventListener("resize", computePosition);
      window.removeEventListener("scroll", computePosition, true);
    };
  }, [open, layout, searchable, minPopoverWidth]);

  // Focus listbox on open (avoid auto-popping mobile soft keyboard on touch open) and scroll selected item into view
  useEffect(() => {
    if (!open || !geometry) return;
    listRef.current?.focus({ preventScroll: true });
    const selectedEl = listRef.current?.querySelector<HTMLElement>(
      '[aria-selected="true"]',
    );
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [open, Boolean(geometry)]);

  // Scroll highlighted option into view during keyboard navigation
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const activeEl = listRef.current?.querySelector<HTMLElement>(
      `[data-opt-idx="${activeIndex}"]`,
    );
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  // Outside pointer dismissal (without a dimming backdrop) + capture-phase Escape so parent dialogs do NOT close
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      closeAndRestoreFocus(false);
    };

    const handleKeyDownCapture = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        closeAndRestoreFocus(true);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDownCapture, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDownCapture, true);
    };
  }, [open]);

  const handleTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (disabled) return;
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      if (open) {
        closeAndRestoreFocus(true);
      } else {
        openMenu(event.key === "ArrowDown" ? "list" : "list");
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openMenu("last");
    }
  };

  const handleNavigationKey = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Tab") {
      closeAndRestoreFocus(false);
      return;
    }
    if (filteredOptions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((idx) => (idx + 1) % filteredOptions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (idx) => (idx - 1 + filteredOptions.length) % filteredOptions.length,
      );
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(filteredOptions.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const safeIdx =
        activeIndex >= 0 && activeIndex < filteredOptions.length
          ? activeIndex
          : 0;
      const target = filteredOptions[safeIdx];
      if (target) selectOption(target.value);
    } else if (
      event.key === " " &&
      document.activeElement !== searchRef.current
    ) {
      event.preventDefault();
      const safeIdx =
        activeIndex >= 0 && activeIndex < filteredOptions.length
          ? activeIndex
          : 0;
      const target = filteredOptions[safeIdx];
      if (target) selectOption(target.value);
    }
  };

  const activeDescendantId =
    open && activeIndex >= 0 && filteredOptions[activeIndex]
      ? `${optionIdPrefix}-${activeIndex}`
      : undefined;

  return (
    <div className={`compact-select ${open ? "is-open" : ""} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={activeDescendantId}
        disabled={disabled}
        className="compact-select-trigger"
        onClick={() => (open ? closeAndRestoreFocus(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="compact-select-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className="compact-select-chevron"
          aria-hidden="true"
        />
      </button>

      {open &&
        geometry &&
        createPortal(
          <div
            ref={popoverRef}
            className={`compact-select-popover layout-${layout} placement-${geometry.placement}`}
            style={geometry.style}
            data-compact-select-popover="true"
          >
            {searchable && (
              <div className="compact-select-search">
                <Search size={14} aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="search"
                  aria-label={`搜索${ariaLabel}`}
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleNavigationKey}
                />
                {query && (
                  <button
                    type="button"
                    className="compact-select-clear"
                    aria-label="清空选项搜索"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel}
              tabIndex={-1}
              className={`compact-select-list layout-${layout}`}
              style={{ maxHeight: `${geometry.listMaxHeight}px` }}
              onKeyDown={handleNavigationKey}
            >
              {filteredOptions.length === 0 ? (
                <div className="compact-select-empty">无匹配选项</div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={opt.value}
                      id={`${optionIdPrefix}-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-opt-idx={idx}
                      data-value={opt.value}
                      className={`compact-select-option ${isSelected ? "selected" : ""} ${isActive ? "active" : ""}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => selectOption(opt.value)}
                    >
                      <span className="compact-select-option-label">
                        {opt.label}
                      </span>
                      {isSelected && (
                        <Check
                          size={13}
                          className="compact-select-check"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
