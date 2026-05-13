/**
 * GroupMasteryStats — compact pill that surfaces aggregate progress
 * for a topic/level group on the landing list. Reads progress from
 * localStorage on mount, classifies via `computeMasteryTier`, and
 * renders one of:
 *
 *   - nothing                            (no progress in the group)
 *   - "<n> practiced"                    (some practiced, none mastered)
 *   - "<n>/<total> mastered"             (≥ 1 mastered; success color)
 *
 * The pill is purely informational; clicking it does nothing — it
 * sits in the collapsible group header next to the count.
 */

"use client";

import { useEffect, useState } from "react";
import { computeMasteryTier } from "@/lib/progress/mastery";
import { loadProgress } from "@/lib/progress/storage";

interface GroupMasteryStatsProps {
  scriptIds: readonly string[];
}

interface Counts {
  mastered: number;
  practiced: number;
  total: number;
}

function tallyCounts(scriptIds: readonly string[]): Counts {
  let mastered = 0;
  let practiced = 0;
  for (const id of scriptIds) {
    const tier = computeMasteryTier(loadProgress(id));
    if (tier === "mastered") mastered += 1;
    else if (tier === "practiced") practiced += 1;
  }
  return { mastered, practiced, total: scriptIds.length };
}

export function GroupMasteryStats({ scriptIds }: GroupMasteryStatsProps) {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCounts(tallyCounts(scriptIds));
  }, [scriptIds]);

  if (!counts) return null;
  if (counts.total === 0) return null;
  if (counts.mastered === 0 && counts.practiced === 0) return null;

  if (counts.mastered > 0) {
    return (
      <span
        data-testid="group-mastery-stats"
        className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success ring-1 ring-success/30"
      >
        {counts.mastered}/{counts.total} mastered
      </span>
    );
  }

  return (
    <span
      data-testid="group-mastery-stats"
      className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent ring-1 ring-accent/30"
    >
      {counts.practiced} practiced
    </span>
  );
}
