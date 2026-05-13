/**
 * TypewriterText — animates a string one character at a time on mount.
 *
 * The intent is the bot side of a chat thread feeling alive instead of
 * dumping a paragraph at once. Each tick advances `shown` by one; the
 * animation completes after `text.length × charDelayMs` ms, then stays
 * settled. Re-renders with the same `text` prop don't restart the
 * animation (state survives), and `skipSignal` lets the parent
 * fast-forward to the full string when the user starts typing.
 */

"use client";

import { useEffect, useRef, useState } from "react";

interface TypewriterTextProps {
  text: string;
  /** Milliseconds between revealed characters. Default 35ms. */
  charDelayMs?: number;
  /**
   * When true, the full text is rendered immediately without animation.
   * Useful for restored / historical messages where animation is noise.
   */
  instant?: boolean;
  /**
   * Increment to fast-forward any in-flight animation. The parent bumps
   * this when the user starts typing, so impatient users aren't held
   * hostage by the animation.
   */
  skipSignal?: number;
  /**
   * Fired once when the full text is on screen (whether animated, skipped,
   * or instant). Used by the parent to gate UI that should wait for the
   * speaker to finish — e.g. hiding the typing panel until the bot's
   * message has fully landed.
   */
  onComplete?: () => void;
}

export function TypewriterText({
  text,
  charDelayMs = 35,
  instant = false,
  skipSignal = 0,
  onComplete,
}: TypewriterTextProps) {
  const [shown, setShown] = useState(instant ? text.length : 0);
  const lastSkipRef = useRef(skipSignal);
  const completedRef = useRef(false);

  // Drive the animation forward, one char per tick.
  useEffect(() => {
    if (instant) return;
    if (shown >= text.length) return;
    const id = setTimeout(() => setShown((s) => s + 1), charDelayMs);
    return () => clearTimeout(id);
  }, [shown, text.length, charDelayMs, instant]);

  // Fast-forward whenever the parent bumps skipSignal.
  useEffect(() => {
    if (skipSignal !== lastSkipRef.current) {
      lastSkipRef.current = skipSignal;
      setShown(text.length);
    }
  }, [skipSignal, text.length]);

  // Fire onComplete exactly once when the full text is on screen.
  useEffect(() => {
    if (shown >= text.length && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [shown, text.length, onComplete]);

  return (
    <span data-testid="typewriter">
      {text.slice(0, shown)}
      {shown < text.length ? (
        <span aria-hidden className="opacity-50">
          ▍
        </span>
      ) : null}
    </span>
  );
}
