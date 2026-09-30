"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

/**
 * A select with a search box — for long option lists like lead sources.
 * Looks like the shadcn Select trigger; matches on label or value, any case.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No match found",
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    // modal so the list scrolls when the picker sits inside a Dialog
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            className,
          )}
        >
          <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-64">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  // cmdk filters on this string; include both so either matches
                  value={`${o.label} ${o.value}`}
                  disabled={o.disabled}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface SearchableMultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Noun for the count label, e.g. "sources" → "3 sources" */
  noun?: string;
  className?: string;
}

/**
 * Multi-select version: tick any number of options; stays open while
 * picking. An empty selection means "all" to the caller.
 */
export function SearchableMultiSelect({
  values,
  onChange,
  options,
  placeholder = "All",
  searchPlaceholder = "Search…",
  emptyText = "No match found",
  noun = "selected",
  className,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((o) => values.includes(o.value));

  const label =
    selected.length === 0 ? placeholder
    : selected.length <= 2 ? selected.map((o) => o.label).join(", ")
    : `${selected.length} ${noun}`;

  function toggle(v: string) {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          title={selected.map((o) => o.label).join(", ") || undefined}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            className,
          )}
        >
          <span className={cn("truncate text-left", selected.length === 0 && "text-muted-foreground")}>
            {label}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-64">
            <CommandEmpty>{emptyText}</CommandEmpty>
            {values.length > 0 && (
              <CommandGroup>
                <CommandItem value="__clear__ clear all" onSelect={() => onChange([])} className="text-muted-foreground">
                  Clear selection ({values.length})
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {options.map((o) => {
                const on = values.includes(o.value);
                return (
                  <CommandItem
                    key={o.value}
                    value={`${o.label} ${o.value}`}
                    disabled={o.disabled}
                    onSelect={() => toggle(o.value)}
                  >
                    <span
                      className={cn(
                        "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                        on ? "bg-primary text-primary-foreground" : "opacity-50",
                      )}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
