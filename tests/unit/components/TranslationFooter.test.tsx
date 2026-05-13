/**
 * TDD spec for TranslationFooter — the always-visible footer banner that
 * holds the two translation toggles.
 *
 * Contract:
 *   - Reads prefs from localStorage on mount, defaults to both off.
 *   - Each toggle is a checkbox-ish control with accessible label.
 *   - Clicking persists via `setShowNpcTranslation` / `setShowPlayerTranslation`,
 *     which dispatches the `polyglyph:translation-prefs-changed` event.
 *   - Re-mounts pick up persisted state.
 *   - Listens for external prefs-changed events so two open tabs / a
 *     programmatic change stay in sync visually.
 */

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { TranslationFooter } from "@/components/TranslationFooter";
import {
  SHOW_NPC_TRANSLATION_KEY,
  SHOW_PLAYER_TRANSLATION_KEY,
  TRANSLATION_PREFS_EVENT,
} from "@/lib/data/translation-prefs";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("TranslationFooter", () => {
  test("both toggles render off by default", () => {
    render(<TranslationFooter />);
    const npc = screen.getByRole("switch", { name: /npc/i });
    const player = screen.getByRole("switch", { name: /your/i });
    expect(npc).not.toBeChecked();
    expect(player).not.toBeChecked();
  });

  test("reflects persisted state on mount", () => {
    localStorage.setItem(SHOW_NPC_TRANSLATION_KEY, "true");
    localStorage.setItem(SHOW_PLAYER_TRANSLATION_KEY, "true");
    render(<TranslationFooter />);
    expect(screen.getByRole("switch", { name: /npc/i })).toBeChecked();
    expect(screen.getByRole("switch", { name: /your/i })).toBeChecked();
  });

  test("toggling NPC persists to storage and leaves player alone", async () => {
    const user = userEvent.setup();
    render(<TranslationFooter />);
    await user.click(screen.getByRole("switch", { name: /npc/i }));
    expect(localStorage.getItem(SHOW_NPC_TRANSLATION_KEY)).toBe("true");
    expect(localStorage.getItem(SHOW_PLAYER_TRANSLATION_KEY)).not.toBe("true");
  });

  test("toggling player persists to storage and leaves NPC alone", async () => {
    const user = userEvent.setup();
    render(<TranslationFooter />);
    await user.click(screen.getByRole("switch", { name: /your/i }));
    expect(localStorage.getItem(SHOW_PLAYER_TRANSLATION_KEY)).toBe("true");
    expect(localStorage.getItem(SHOW_NPC_TRANSLATION_KEY)).not.toBe("true");
  });

  test("external prefs-changed event re-syncs the UI", () => {
    render(<TranslationFooter />);
    expect(screen.getByRole("switch", { name: /npc/i })).not.toBeChecked();
    localStorage.setItem(SHOW_NPC_TRANSLATION_KEY, "true");
    act(() => {
      window.dispatchEvent(new CustomEvent(TRANSLATION_PREFS_EVENT));
    });
    expect(screen.getByRole("switch", { name: /npc/i })).toBeChecked();
  });
});
