/**
 * CuratedScripts — landing-page island for the curated dialogue list.
 *
 * Two browse modes:
 *   - "topic"      groups by canonical Topic (daily / travel / ... / mind)
 *   - "difficulty" groups by CEFR level (A1..C1)
 *
 * Mode persists in localStorage so reopens land on the same view.
 * Within each group, scripts are sorted by level (so easier rises in
 * topic mode), then by title.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { GroupMasteryStats } from "@/components/GroupMasteryStats";
import { ScriptCard } from "@/components/ScriptCard";
import {
  groupByLevel,
  groupByTopic,
  type ScriptIndexItem,
} from "@/lib/data/script-grouping";
import type { Level, Topic } from "@/lib/data/schema";

type BrowseMode = "topic" | "difficulty";

const STORAGE_KEY = "polyglyph:browse-mode";

const TOPIC_LABEL: Record<Topic, string> = {
  daily: "Daily",
  travel: "Travel",
  food: "Food",
  services: "Services",
  work: "Work",
  tech: "Tech",
  mind: "Mind",
};

const TOPIC_ORDER: Topic[] = [
  "daily",
  "travel",
  "food",
  "services",
  "work",
  "tech",
  "mind",
];

const LEVEL_ORDER_DESC: Level[] = ["A1", "A2", "B1", "B2", "C1"];

const LEVEL_BADGE: Record<Level, string> = {
  A1: "bg-success/15 text-success",
  A2: "bg-accent/15 text-accent",
  B1: "bg-violet-500/15 text-violet-300",
  B2: "bg-warning/15 text-warning",
  C1: "bg-error/15 text-error",
};

const LEVEL_RANK: Record<Level, number> = {
  A1: 0,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 4,
};

interface CuratedScriptsProps {
  items: ScriptIndexItem[];
}

export function CuratedScripts({ items }: CuratedScriptsProps) {
  const [mode, setMode] = useState<BrowseMode>(() => {
    if (typeof window === "undefined") return "topic";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "difficulty" ? "difficulty" : "topic";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const lvl = LEVEL_RANK[a.level] - LEVEL_RANK[b.level];
        if (lvl !== 0) return lvl;
        return a.title.localeCompare(b.title);
      }),
    [items],
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm uppercase tracking-[0.2em] text-fg-faint">
          Curated scripts ({items.length})
        </h2>
        <span className="text-xs text-fg-faint">English</span>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="browse-mode-switcher">
        <ModeChip
          label="Topic"
          active={mode === "topic"}
          onClick={() => setMode("topic")}
        />
        <ModeChip
          label="Difficulty"
          active={mode === "difficulty"}
          onClick={() => setMode("difficulty")}
        />
      </div>

      {mode === "topic" ? (
        <TopicGroups items={sorted} />
      ) : (
        <LevelGroups items={sorted} />
      )}
    </section>
  );
}

function ModeChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-sm transition ${
        active
          ? "bg-accent text-white"
          : "bg-surface-2 text-fg-muted ring-1 ring-border hover:text-fg"
      }`}
    >
      {label}
    </button>
  );
}

const GROUP_OPEN_KEY_PREFIX = "polyglyph:browse-group-open:";

interface CollapsibleGroupProps {
  /** Stable key for persistence: e.g. "topic:daily" or "level:A1". */
  storageKey: string;
  /** Test id for the <details> element. */
  testId: string;
  /** Inline summary content (header). */
  header: React.ReactNode;
  /** Collapsed by default. Pass true to default-open. */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleGroup({
  storageKey,
  testId,
  header,
  defaultOpen = false,
  children,
}: CollapsibleGroupProps) {
  const fullKey = `${GROUP_OPEN_KEY_PREFIX}${storageKey}`;
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaultOpen;
    const stored = window.localStorage.getItem(fullKey);
    if (stored === "1") return true;
    if (stored === "0") return false;
    return defaultOpen;
  });

  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const isOpen = e.currentTarget.open;
    setOpen(isOpen);
    try {
      window.localStorage.setItem(fullKey, isOpen ? "1" : "0");
    } catch {
      // ignore
    }
  };

  return (
    <details
      data-testid={testId}
      open={open}
      onToggle={handleToggle}
      className="flex flex-col gap-2 rounded-xl bg-surface/30 px-3 py-2 ring-1 ring-border/40 [&[open]]:bg-surface/50"
    >
      <summary className="cursor-pointer list-none select-none">
        {header}
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}

function TopicGroups({ items }: { items: ScriptIndexItem[] }) {
  const groups = groupByTopic(items);
  const visible = TOPIC_ORDER.filter((t) => groups.has(t));
  return (
    <div className="flex flex-col gap-3">
      {visible.map((topic) => {
        const list = groups.get(topic) ?? [];
        return (
          <CollapsibleGroup
            key={topic}
            testId={`topic-group-${topic}`}
            storageKey={`topic:${topic}`}
            header={
              <h3 className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-fg-faint">
                <span className="flex items-center gap-2">
                  <span>
                    {TOPIC_LABEL[topic]}{" "}
                    <span className="text-fg-muted">({list.length})</span>
                  </span>
                  <GroupMasteryStats
                    scriptIds={list.map((s) => s.scriptId)}
                  />
                </span>
                <span aria-hidden className="text-fg-muted">▾</span>
              </h3>
            }
          >
            <ScriptList items={list} />
          </CollapsibleGroup>
        );
      })}
    </div>
  );
}

function LevelGroups({ items }: { items: ScriptIndexItem[] }) {
  const groups = groupByLevel(items);
  const visible = LEVEL_ORDER_DESC.filter((l) => groups.has(l));
  return (
    <div className="flex flex-col gap-3">
      {visible.map((level) => {
        const list = groups.get(level) ?? [];
        return (
          <CollapsibleGroup
            key={level}
            testId={`level-group-${level}`}
            storageKey={`level:${level}`}
            header={
              <h3 className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-fg-faint">
                <span className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${LEVEL_BADGE[level]}`}
                  >
                    {level}
                  </span>
                  <span className="text-fg-muted">({list.length})</span>
                  <GroupMasteryStats
                    scriptIds={list.map((s) => s.scriptId)}
                  />
                </span>
                <span aria-hidden className="text-fg-muted">▾</span>
              </h3>
            }
          >
            <ScriptList items={list} />
          </CollapsibleGroup>
        );
      })}
    </div>
  );
}

function ScriptList({ items }: { items: ScriptIndexItem[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((s) => (
        <li key={`${s.language ?? "x"}.${s.scriptId}`}>
          <ScriptCard item={s} />
        </li>
      ))}
    </ul>
  );
}
