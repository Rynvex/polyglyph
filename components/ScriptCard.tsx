/**
 * ScriptCard — single row in the dialogue/script list.
 *
 * Wraps the entire card markup (link + level/topic/time line, title,
 * description, progress badges) and adds mastery decoration based on
 * the local progress record:
 *
 *   new        – no decoration
 *   practiced  – accent-coloured left strip + ✓ prefix on title
 *   mastered   – success-coloured left strip + ✓✓ prefix + "Mastered" pill
 *
 * Progress loads from localStorage on mount; SSR renders the plain
 * card and the mastery layer hydrates in. ScriptCardBadges is kept
 * mounted (it owns the bottom progress stats and the Resume hint).
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ScriptCardBadges } from "@/components/ScriptCardBadges";
import type { ScriptIndexItem } from "@/lib/data/script-grouping";
import type { Level, Topic } from "@/lib/data/schema";
import { computeMasteryTier, type MasteryTier } from "@/lib/progress/mastery";
import { loadProgress } from "@/lib/progress/storage";

const TOPIC_LABEL: Record<Topic, string> = {
  daily: "Daily",
  travel: "Travel",
  food: "Food",
  services: "Services",
  work: "Work",
  tech: "Tech",
  mind: "Mind",
};

const LEVEL_BADGE: Record<Level, string> = {
  A1: "bg-success/15 text-success",
  A2: "bg-accent/15 text-accent",
  B1: "bg-violet-500/15 text-violet-300",
  B2: "bg-warning/15 text-warning",
  C1: "bg-error/15 text-error",
};

const TIER_STRIP_COLOR: Record<MasteryTier, string> = {
  new: "",
  practiced: "bg-accent",
  mastered: "bg-success",
};

const TIER_LABEL: Record<MasteryTier, string> = {
  new: "",
  practiced: "Practiced",
  mastered: "Mastered",
};

interface ScriptCardProps {
  item: ScriptIndexItem;
}

function buildHref(item: ScriptIndexItem): string {
  if (item.language) {
    return `/play/${item.scriptId}?lang=${encodeURIComponent(item.language)}`;
  }
  return `/play/${item.scriptId}`;
}

export function ScriptCard({ item }: ScriptCardProps) {
  const [tier, setTier] = useState<MasteryTier>("new");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTier(computeMasteryTier(loadProgress(item.scriptId)));
  }, [item.scriptId]);

  const stripColor = TIER_STRIP_COLOR[tier];
  const tierLabel = TIER_LABEL[tier];
  const checkmark = tier === "mastered" ? "✓✓" : tier === "practiced" ? "✓" : "";

  return (
    <Link
      href={buildHref(item)}
      data-keynav-card
      aria-label={tierLabel ? `${item.title} — ${tierLabel}` : item.title}
      className="relative flex flex-col gap-2 overflow-hidden rounded-xl bg-surface/60 p-5 ring-1 ring-border transition hover:bg-canvas hover:ring-accent"
    >
      {tier !== "new" ? (
        <span
          data-testid="mastery-strip"
          aria-hidden
          className={`absolute inset-y-0 left-0 w-1 ${stripColor}`}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-3 text-xs text-fg-faint">
        <span
          className={`rounded-full px-2 py-0.5 font-medium ${LEVEL_BADGE[item.level]}`}
        >
          {item.level}
        </span>
        {item.estimatedMinutes ? (
          <span>~{item.estimatedMinutes} min</span>
        ) : null}
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-fg-muted">
          {TOPIC_LABEL[item.topic]}
        </span>
        {tier === "mastered" ? (
          <span className="rounded-full bg-success/15 px-2 py-0.5 font-medium text-success ring-1 ring-success/30">
            Mastered
          </span>
        ) : null}
      </div>
      <div className="flex items-baseline gap-2">
        {checkmark ? (
          <span
            data-testid="mastery-check"
            aria-hidden
            className={
              tier === "mastered"
                ? "text-base font-semibold leading-tight text-success"
                : "text-base font-semibold leading-tight text-accent"
            }
          >
            {checkmark}
          </span>
        ) : null}
        <span className="text-lg font-medium text-fg">{item.title}</span>
      </div>
      {item.description ? (
        <span className="text-sm text-fg-muted">{item.description}</span>
      ) : null}
      <ScriptCardBadges scriptId={item.scriptId} />
    </Link>
  );
}
