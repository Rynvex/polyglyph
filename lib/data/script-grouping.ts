/**
 * Pure grouping/sorting helpers for the script index.
 *
 * Lives in its own file (no node:fs imports) so client components can
 * import it without dragging server-only modules into the browser
 * bundle. Server-only loaders like readScriptIndex live in
 * lib/data/script-index.ts.
 */

import type { Level, Topic } from "@/lib/data/schema";

export interface ScriptIndexItem {
  scriptId: string;
  id: string;
  title: string;
  level: Level;
  topic: Topic;
  language?: string;
  description?: string;
  estimatedMinutes?: number;
  tags?: string[];
}

const LEVEL_ORDER: Record<Level, number> = {
  A1: 0,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 4,
};

export function sortByLevel<T extends { level: Level }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

/**
 * Group items by their canonical Topic. Empty topics aren't in the map;
 * order within a group is preserved (callers can sortByLevel afterward).
 */
export function groupByTopic<T extends { topic: Topic }>(
  items: readonly T[],
): Map<Topic, T[]> {
  const out = new Map<Topic, T[]>();
  for (const item of items) {
    const bucket = out.get(item.topic);
    if (bucket) bucket.push(item);
    else out.set(item.topic, [item]);
  }
  return out;
}

/**
 * Group items by CEFR level.
 */
export function groupByLevel<T extends { level: Level }>(
  items: readonly T[],
): Map<Level, T[]> {
  const out = new Map<Level, T[]>();
  for (const item of items) {
    const bucket = out.get(item.level);
    if (bucket) bucket.push(item);
    else out.set(item.level, [item]);
  }
  return out;
}
