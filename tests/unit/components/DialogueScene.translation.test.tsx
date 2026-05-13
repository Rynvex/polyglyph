/**
 * Integration: DialogueScene picks up translation prefs + native fetch.
 *
 *   - Reads `polyglyph:show-*-translation` keys on mount.
 *   - Fetches the user's native translation file when nativeLang differs.
 *   - Overlays nativeText via `attachNativeText` and routes it into the
 *     ChatBubble's `translationText` prop.
 *   - Live-updates when the footer dispatches the prefs-changed event.
 */

import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DialogueScene } from "@/components/DialogueScene";
import type { Dialogue } from "@/lib/data/schema";
import { TRANSLATION_PREFS_EVENT } from "@/lib/data/translation-prefs";

const DIALOGUE_ES: Dialogue = {
  schema_version: 1,
  id: "test_es",
  language: "es",
  level: "A1",
  topic: "daily",
  title: "Test",
  tags: [],
  turns: [
    { id: "t1", speaker: "bot", text: "Hola, ¿qué tal?" },
    {
      id: "t2",
      speaker: "player",
      templates: [
        {
          id: "t2.a",
          text: "Estoy bien.",
          display: "Estoy bien.",
          weight: 1,
        },
      ],
    },
  ],
} as Dialogue;

const NATIVE_ZH = {
  schema_version: 1,
  blueprint_id: "test_es",
  language: "zh-tw",
  title: "Test zh",
  turns: {
    t1: { text: "你好,你好嗎?" },
    t2: { templates: [{ id: "t2.a", text: "我很好。" }] },
  },
};

function mockFetchNative(payload: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () => payload,
      } as Response),
    ),
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("polyglyph:native-lang", "zh-tw");
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("DialogueScene — translation strip integration", () => {
  test("no strip when both toggles off (defaults)", async () => {
    mockFetchNative(NATIVE_ZH);
    render(<DialogueScene dialogue={DIALOGUE_ES} scriptId="test_es" />);
    await screen.findByText("Hola, ¿qué tal?", undefined, { timeout: 3000 });
    // Even with a successful fetch, no strip when toggles are false.
    expect(screen.queryByTestId("translation-strip")).toBeNull();
  });

  test("npc toggle on → bot bubble carries translation strip", async () => {
    localStorage.setItem("polyglyph:show-npc-translation", "true");
    mockFetchNative(NATIVE_ZH);
    render(<DialogueScene dialogue={DIALOGUE_ES} scriptId="test_es" />);
    await screen.findByText("Hola, ¿qué tal?", undefined, { timeout: 3000 });
    await waitFor(() => {
      const strip = screen.getByTestId("translation-strip");
      expect(strip).toHaveTextContent("你好,你好嗎?");
      expect(strip).toHaveAttribute("data-side", "left");
    });
  });

  test("same nativeLang as targetLang → never fetches, no strip", async () => {
    localStorage.setItem("polyglyph:native-lang", "es");
    localStorage.setItem("polyglyph:show-npc-translation", "true");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<DialogueScene dialogue={DIALOGUE_ES} scriptId="test_es" />);
    await screen.findByText("Hola, ¿qué tal?", undefined, { timeout: 3000 });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId("translation-strip")).toBeNull();
  });

  test("translation-prefs-changed event flips strip on without remount", async () => {
    mockFetchNative(NATIVE_ZH);
    render(<DialogueScene dialogue={DIALOGUE_ES} scriptId="test_es" />);
    await screen.findByText("Hola, ¿qué tal?", undefined, { timeout: 3000 });
    expect(screen.queryByTestId("translation-strip")).toBeNull();

    // Footer toggle would do this combo: save + dispatch.
    localStorage.setItem("polyglyph:show-npc-translation", "true");
    await act(async () => {
      window.dispatchEvent(new CustomEvent(TRANSLATION_PREFS_EVENT));
    });

    await waitFor(() => {
      expect(screen.getByTestId("translation-strip")).toHaveTextContent(
        "你好,你好嗎?",
      );
    });
  });

  test("fetch failure degrades gracefully — no strip, no crash", async () => {
    localStorage.setItem("polyglyph:show-npc-translation", "true");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Promise.resolve({ ok: false, status: 404 } as Response),
      ),
    );
    render(<DialogueScene dialogue={DIALOGUE_ES} scriptId="test_es" />);
    await screen.findByText("Hola, ¿qué tal?", undefined, { timeout: 3000 });
    expect(screen.queryByTestId("translation-strip")).toBeNull();
  });
});
