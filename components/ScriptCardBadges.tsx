/**
 * ScriptCardBadges — client island that reads localStorage on mount and
 * renders progress / resume hints next to each script in the landing list.
 *
 * Server-rendered fallback is empty so the list still ships fast; the
 * badges hydrate in once the browser has access to localStorage.
 */

"use client";

import { useEffect, useState } from "react";
import {
  loadCheckpoint,
  loadProgress,
  type CheckpointSnapshot,
  type ProgressEntry,
} from "@/lib/progress/storage";

interface ScriptCardBadgesProps {
  scriptId: string;
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function ScriptCardBadges({ scriptId }: ScriptCardBadgesProps) {
  const [progress, setProgress] = useState<ProgressEntry | null>(null);
  const [checkpoint, setCheckpoint] = useState<CheckpointSnapshot | null>(null);

  useEffect(() => {
    // One-shot read from localStorage on mount — the canonical SSR-safe
    // pattern; rule false-positive here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress(scriptId));
     
    setCheckpoint(loadCheckpoint(scriptId));
  }, [scriptId]);

  if (!progress && !checkpoint) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {checkpoint ? (
        <span className="rounded-full bg-warning/15 px-2 py-0.5 font-medium text-warning ring-1 ring-warning/30">
          ▶ Resume
        </span>
      ) : null}
      {progress ? (
        <>
          <span className="text-fg-muted">
            Best <span className="font-semibold text-success">{progress.bestWpm} WPM</span>
          </span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-faint">
            Played {progress.playCount}{" "}
            {progress.playCount === 1 ? "time" : "times"}
          </span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-faint">{formatRelative(progress.lastPlayedAtMs)}</span>
        </>
      ) : null}
    </div>
  );
}
