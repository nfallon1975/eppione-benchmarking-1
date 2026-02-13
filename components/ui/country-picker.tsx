"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { COUNTRY_LIST, getCountryName } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X } from "lucide-react";

interface CountryPickerProps {
  value: string;
  onChange: (code: string) => void;
  /** If provided, only these codes are shown (e.g. for benchmarking where only user's countries matter) */
  limitTo?: string[];
  /** Codes to disable in the list (e.g. already selected in multi-country forms) */
  disabled?: string[];
  placeholder?: string;
  className?: string;
}

export function CountryPicker({
  value,
  onChange,
  limitTo,
  disabled: disabledCodes,
  placeholder = "Select country...",
  className,
}: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const countries = useMemo(() => {
    if (limitTo) {
      return COUNTRY_LIST.filter((c) => limitTo.includes(c.code));
    }
    return COUNTRY_LIST;
  }, [limitTo]);

  const filtered = useMemo(() => {
    if (!search) return countries;
    const q = search.toLowerCase();
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countries, search]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function handleSelect(code: string) {
    onChange(code);
    setOpen(false);
    setSearch("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setSearch("");
  }

  const displayName = value ? getCountryName(value) : "";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">{displayName || placeholder}</span>
        <div className="flex items-center gap-1">
          {value && (
            <X
              className="h-3 w-3 opacity-50 hover:opacity-100"
              onClick={handleClear}
            />
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search countries..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  setSearch("");
                }
                if (e.key === "Enter" && filtered.length === 1) {
                  const c = filtered[0];
                  if (!disabledCodes?.includes(c.code)) {
                    handleSelect(c.code);
                  }
                }
              }}
            />
          </div>
          <div ref={listRef} className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No countries found.
              </div>
            )}
            {filtered.map((c) => {
              const isDisabled = disabledCodes?.includes(c.code);
              const isSelected = c.code === value;
              return (
                <button
                  key={c.code}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(c.code)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                    isSelected
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent hover:text-accent-foreground",
                    isDisabled && "cursor-not-allowed opacity-40"
                  )}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {c.code}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Multi-select country picker for broker "countries active" fields.
 * Shows selected countries as badges with remove buttons.
 */
interface MultiCountryPickerProps {
  value: string[];
  onChange: (codes: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiCountryPicker({
  value,
  onChange,
  placeholder = "Search and add countries...",
  className,
}: MultiCountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const base = COUNTRY_LIST.filter((c) => !value.includes(c.code));
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search, value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function handleAdd(code: string) {
    onChange([...value, code]);
    setSearch("");
    inputRef.current?.focus();
  }

  function handleRemove(code: string) {
    onChange(value.filter((c) => c !== code));
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className="flex min-h-[2.5rem] flex-wrap items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background cursor-text"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        {value.map((code) => (
          <span
            key={code}
            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium"
          >
            {getCountryName(code)}
            <X
              className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(code);
              }}
            />
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground text-sm"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setSearch("");
            }
            if (
              e.key === "Backspace" &&
              !search &&
              value.length > 0
            ) {
              handleRemove(value[value.length - 1]);
            }
            if (e.key === "Enter" && filtered.length === 1) {
              e.preventDefault();
              handleAdd(filtered[0].code);
            }
          }}
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => handleAdd(c.code)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <span className="truncate">{c.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {c.code}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
