"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Layers, Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  REPORT_PROGRAMS,
  useProgramTags,
  useSaveProgramTags,
  type ReportProgram,
} from "@/hooks/useReports";
import { cn } from "@/lib/utils";

/*
 * Programmes (Super Admin, 2026-10-15): which lead sources and courses count under Forex, Digital Academy and JURA
 * on the Reports page. A lead counts under its source's programme; when its source has none, under its course's.
 * A row not yet saved starts from a suggestion — a source's from its name, a course's from the LMS courses it opens —
 * marked "suggested"; nothing counts until it is saved.
 */

type Draft = Record<string, ReportProgram | "">;

/** Where a row starts: its saved programme, else the suggestion. */
const startOf = (program: ReportProgram | null, suggested: ReportProgram | null): ReportProgram | "" =>
  program ?? suggested ?? "";

const LMS_NAMES: Record<string, string> = {
  "4x-trading": "Forex",
  "digital-marketing": "Digital Marketing",
  ai: "AI",
  jura: "JURA",
};

function ProgramSelect({ value, onChange, label }: { value: ReportProgram | ""; onChange: (v: ReportProgram | "") => void; label: string }) {
  return (
    <select
      aria-label={`Programme for ${label}`}
      value={value}
      onChange={(e) => onChange(e.target.value as ReportProgram | "")}
      className={cn(
        "h-8 w-[150px] shrink-0 rounded-lg border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring",
        value ? "border-primary/40 text-foreground" : "border-border text-muted-foreground",
      )}
    >
      <option value="">— None</option>
      {REPORT_PROGRAMS.map((p) => (
        <option key={p.key} value={p.key}>{p.label}</option>
      ))}
    </select>
  );
}

interface RowProps {
  name: string;
  detail: string;
  value: ReportProgram | "";
  saved: ReportProgram | null;
  suggested: ReportProgram | null;
  muted?: boolean;
  onChange: (v: ReportProgram | "") => void;
}

function TagRow({ name, detail, value, saved, suggested, muted, onChange }: RowProps) {
  const unsaved = (value || null) !== saved;
  const fromSuggestion = unsaved && !!value && value === suggested && saved === null;
  return (
    <div className={cn("flex items-center gap-3 rounded-lg px-2 py-1.5", unsaved && "bg-primary/5")}>
      <div className="min-w-0 flex-1">
        <p className={cn("line-clamp-2 break-words text-sm font-medium", muted ? "text-muted-foreground" : "text-foreground")} title={name}>{name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{detail}</p>
      </div>
      {fromSuggestion && (
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 sm:flex">
          <Sparkles className="h-3 w-3" /> suggested
        </span>
      )}
      {unsaved && !fromSuggestion && (
        <span className="hidden shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary sm:inline">changed</span>
      )}
      <ProgramSelect value={value} onChange={onChange} label={name} />
    </div>
  );
}

export function ProgramTagsDialog() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useProgramTags(open);
  const save = useSaveProgramTags();
  const [sources, setSources] = useState<Draft>({});
  const [courses, setCourses] = useState<Draft>({});
  const [search, setSearch] = useState("");
  const [onlyUnsaved, setOnlyUnsaved] = useState(false);
  const [view, setView] = useState<"sources" | "courses">("sources");

  // Each time the tags arrive (opening, after a save): saved tags, else suggestions.
  useEffect(() => {
    if (!data) return;
    setSources(Object.fromEntries(data.sources.map((r) => [r.source, startOf(r.program, r.suggested)])));
    setCourses(Object.fromEntries(data.courses.map((r) => [r.id, startOf(r.program, r.suggested)])));
  }, [data]);

  const changes = useMemo(() => ({
    sources: (data?.sources ?? [])
      .filter((r) => (sources[r.source] || null) !== r.program)
      .map((r) => ({ source: r.source, program: (sources[r.source] || null) as ReportProgram | null })),
    courses: (data?.courses ?? [])
      .filter((r) => (courses[r.id] || null) !== r.program)
      .map((r) => ({ id: r.id, program: (courses[r.id] || null) as ReportProgram | null })),
  }), [data, sources, courses]);
  const changeCount = changes.sources.length + changes.courses.length;

  const needle = search.trim().toUpperCase();
  const sourceRows = (data?.sources ?? []).filter((r) =>
    (!needle || r.source.includes(needle)) && (!onlyUnsaved || (sources[r.source] || null) !== r.program || !r.program));
  const courseRows = (data?.courses ?? []).filter((r) =>
    (!needle || r.name.toUpperCase().includes(needle)) && (!onlyUnsaved || (courses[r.id] || null) !== r.program || !r.program));

  const submit = () => {
    if (!changeCount) return;
    save.mutate(
      { ...(changes.sources.length ? { sources: changes.sources } : {}), ...(changes.courses.length ? { courses: changes.courses } : {}) },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <>
      <motion.div whileTap={{ scale: 0.97 }}>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setOpen(true)} title="Programmes" aria-label="Programmes">
          <Layers className="h-3.5 w-3.5" />
          {/* The label from tablet width up: on a phone it would push the page's title aside */}
          <span className="hidden sm:inline">Programmes</span>
        </Button>
      </motion.div>

      <ResponsiveDialog open={open} onOpenChange={(o) => { if (!save.isPending) setOpen(o); }}>
        <ResponsiveDialogContent desktopClassName="max-w-3xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Layers className="h-4 w-4 text-primary" />
              </div>
              Programmes
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Which lead sources and courses count under Forex, Digital Academy and JURA on the Reports page. A lead
              counts under its lead source&apos;s programme; when its source has none, under its course&apos;s.
              Rows marked <span className="font-medium text-amber-600 dark:text-amber-400">suggested</span> are
              guesses — from the source&apos;s name, or the course&apos;s LMS courses — and count only once saved.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 px-4 pt-1 sm:px-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sources and courses…" className="h-8 pl-8 text-sm" />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={onlyUnsaved} onChange={(e) => setOnlyUnsaved(e.target.checked)} className="h-3.5 w-3.5 accent-[hsl(var(--primary))]" />
                Not saved yet
              </label>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : error ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-500">
                {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not load the programmes"}
              </p>
            ) : data ? (
              <div className="space-y-2">
                {/* One list at a time, so a long source or course name reads in full */}
                <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
                  {([
                    { id: "sources", label: "Lead sources", count: data.sources.length, unsaved: changes.sources.length },
                    { id: "courses", label: "Courses", count: data.courses.length, unsaved: changes.courses.length },
                  ] as const).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setView(t.id)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        view === t.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t.label} <span className="text-xs font-normal text-muted-foreground">{t.count}</span>
                      {t.unsaved > 0 && <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">{t.unsaved} to save</span>}
                    </button>
                  ))}
                </div>

                {view === "sources" ? (
                  <div className="max-h-[48vh] space-y-0.5 overflow-y-auto pr-1">
                    {sourceRows.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-muted-foreground">No lead sources match.</p>
                    ) : sourceRows.map((r) => (
                      <TagRow
                        key={r.source}
                        name={r.source}
                        detail={`${r.leads.toLocaleString()} lead${r.leads === 1 ? "" : "s"}`}
                        value={sources[r.source] ?? ""}
                        saved={r.program}
                        suggested={r.suggested}
                        onChange={(v) => setSources((d) => ({ ...d, [r.source]: v }))}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="px-2 text-[11px] text-muted-foreground">A course counts for leads whose lead source has no programme.</p>
                    {data.lmsError && (
                      <p className="mx-2 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600 dark:text-amber-400">
                        No suggestions from the LMS: {data.lmsError}
                      </p>
                    )}
                    <div className="max-h-[44vh] space-y-0.5 overflow-y-auto pr-1">
                      {courseRows.length === 0 ? (
                        <p className="px-2 py-6 text-center text-xs text-muted-foreground">No courses match.</p>
                      ) : courseRows.map((r) => (
                        <TagRow
                          key={r.id}
                          name={r.name}
                          muted={r.status !== "active"}
                          detail={[
                            `${r.leads.toLocaleString()} lead${r.leads === 1 ? "" : "s"}`,
                            r.status !== "active" ? "inactive" : "",
                            r.lmsPrograms.length ? `LMS: ${r.lmsPrograms.map((p) => LMS_NAMES[p] ?? p).join(", ")}` : "",
                          ].filter(Boolean).join(" · ")}
                          value={courses[r.id] ?? ""}
                          saved={r.program}
                          suggested={r.suggested}
                          onChange={(v) => setCourses((d) => ({ ...d, [r.id]: v }))}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={save.isPending}>Cancel</Button>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button onClick={submit} disabled={!changeCount || save.isPending}>
                {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {changeCount ? `Save ${changeCount} change${changeCount === 1 ? "" : "s"}` : "Nothing to save"}
              </Button>
            </motion.div>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
