/**
 * LandingKeyboardNav — invisible client island that wires keyboard navigation
 * for the script index page.
 *
 *   ↑ / k        previous card
 *   ↓ / j        next card
 *   Enter        open selected card
 *   1-9          jump to N-th card
 *   c            navigate to /create
 *
 * Cards opt in by setting `data-keynav-card` on the link. The selected card
 * gets `data-keynav-selected="true"`; CSS in globals.css renders the ring.
 */

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const CARD_SELECTOR = "[data-keynav-card]";

export function LandingKeyboardNav() {
  const router = useRouter();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const collectCards = useCallback((): HTMLElement[] => {
    return Array.from(document.querySelectorAll<HTMLElement>(CARD_SELECTOR));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't hijack typing inside form fields or contenteditable surfaces.
      const target = document.activeElement as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        router.push("/create");
        return;
      }

      const cards = collectCards();
      if (cards.length === 0) return;

      if (e.key === "ArrowDown" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        setSelectedIdx((idx) =>
          idx === null ? 0 : Math.min(cards.length - 1, idx + 1),
        );
        return;
      }
      if (e.key === "ArrowUp" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        setSelectedIdx((idx) => (idx === null ? 0 : Math.max(0, idx - 1)));
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10) - 1;
        if (n < cards.length) {
          e.preventDefault();
          cards[n].click();
        }
        return;
      }
      if (e.key === "Enter") {
        if (selectedIdx === null) return;
        e.preventDefault();
        cards[selectedIdx]?.click();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, selectedIdx, collectCards]);

  // Mirror selectedIdx onto the actual DOM cards as a data attribute so
  // CSS can paint the selection ring.
  useEffect(() => {
    const cards = collectCards();
    cards.forEach((card, i) => {
      if (i === selectedIdx) {
        card.setAttribute("data-keynav-selected", "true");
      } else {
        card.removeAttribute("data-keynav-selected");
      }
    });
    if (selectedIdx !== null && cards[selectedIdx]) {
      cards[selectedIdx].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIdx, collectCards]);

  return null;
}
