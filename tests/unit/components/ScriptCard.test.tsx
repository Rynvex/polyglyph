/**
 * TDD spec for ScriptCard — clickable list card with mastery decoration.
 *
 * Behaviour (visible to a learner):
 *   - "new"        — plain card, no strip, no checkmark
 *   - "practiced"  — left strip (accent), `✓` prefix on title,
 *                    aria-label "Practiced"
 *   - "mastered"   — left strip (success), `✓✓` prefix on title,
 *                    "Mastered" pill near the level badge,
 *                    aria-label "Mastered"
 *
 * Implementation detail not asserted: exact Tailwind classes — those
 * are visual polish, covered by the visual review pass.
 */
import { describe, expect, test, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScriptCard } from "@/components/ScriptCard";
import {
  MASTERY_ACCURACY_THRESHOLD,
  MASTERY_PLAYCOUNT_THRESHOLD,
} from "@/lib/progress/mastery";
import type { ScriptIndexItem } from "@/lib/data/script-grouping";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={typeof href === "string" ? href : ""} {...rest}>
      {children}
    </a>
  ),
}));

const SAMPLE_ITEM: ScriptIndexItem = {
  scriptId: "cnn_for_pm_b1",
  id: "cnn_for_pm_b1",
  title: "CNNs for Image Tasks",
  level: "B1",
  topic: "tech",
  language: "en",
  description: "Explain in plain language.",
  estimatedMinutes: 4,
};

const PROGRESS_KEY = `polyglyph:progress:${SAMPLE_ITEM.scriptId}`;

function writeProgress(progress: {
  bestWpm: number;
  bestAccuracy: number;
  playCount: number;
  lastPlayedAtMs?: number;
}) {
  window.localStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify({
      bestWpm: progress.bestWpm,
      bestAccuracy: progress.bestAccuracy,
      playCount: progress.playCount,
      lastPlayedAtMs: progress.lastPlayedAtMs ?? Date.now(),
      history: [],
    }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("ScriptCard — new tier (no progress)", () => {
  test("renders title, description, level badge, topic chip", async () => {
    render(<ScriptCard item={SAMPLE_ITEM} />);
    expect(await screen.findByText("CNNs for Image Tasks")).toBeInTheDocument();
    expect(screen.getByText(/Explain in plain language/)).toBeInTheDocument();
    expect(screen.getByText("B1")).toBeInTheDocument();
    expect(screen.getByText(/Tech/)).toBeInTheDocument();
  });

  test("no mastery decoration when never played", async () => {
    render(<ScriptCard item={SAMPLE_ITEM} />);
    await screen.findByText("CNNs for Image Tasks");
    expect(screen.queryByLabelText(/Practiced/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Mastered/)).not.toBeInTheDocument();
    expect(screen.queryByText("Mastered")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mastery-strip")).not.toBeInTheDocument();
  });

  test("link points to /play/<scriptId>?lang=<lang>", async () => {
    render(<ScriptCard item={SAMPLE_ITEM} />);
    const link = (await screen.findByText("CNNs for Image Tasks")).closest("a");
    expect(link?.getAttribute("href")).toBe("/play/cnn_for_pm_b1?lang=en");
  });
});

describe("ScriptCard — practiced tier (≥1 play, below mastered threshold)", () => {
  test("shows single check prefix and Practiced label after hydrate", async () => {
    writeProgress({ bestWpm: 24, bestAccuracy: 80, playCount: 1 });
    render(<ScriptCard item={SAMPLE_ITEM} />);
    expect(
      await screen.findByLabelText(/Practiced/i),
    ).toBeInTheDocument();
    // ✓ prefix is rendered as part of the title row
    expect(screen.getByTestId("mastery-strip")).toBeInTheDocument();
    expect(screen.getByTestId("mastery-check")).toHaveTextContent("✓");
    // No double check
    expect(screen.getByTestId("mastery-check").textContent).not.toContain("✓✓");
  });

  test("playCount = 2 with sub-threshold accuracy stays practiced", async () => {
    writeProgress({ bestWpm: 24, bestAccuracy: 99, playCount: 2 });
    render(<ScriptCard item={SAMPLE_ITEM} />);
    expect(await screen.findByLabelText(/Practiced/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Mastered/i)).not.toBeInTheDocument();
  });
});

describe("ScriptCard — mastered tier (≥3 plays AND ≥95% accuracy)", () => {
  test("shows double check, Mastered label, and Mastered pill", async () => {
    writeProgress({
      bestWpm: 67,
      bestAccuracy: MASTERY_ACCURACY_THRESHOLD,
      playCount: MASTERY_PLAYCOUNT_THRESHOLD,
    });
    render(<ScriptCard item={SAMPLE_ITEM} />);
    expect(await screen.findByLabelText(/Mastered/i)).toBeInTheDocument();
    expect(screen.getByTestId("mastery-strip")).toBeInTheDocument();
    expect(screen.getByTestId("mastery-check")).toHaveTextContent("✓✓");
    expect(screen.getByText("Mastered")).toBeInTheDocument();
  });

  test("does not also surface the Practiced label", async () => {
    writeProgress({ bestWpm: 67, bestAccuracy: 100, playCount: 10 });
    render(<ScriptCard item={SAMPLE_ITEM} />);
    await screen.findByLabelText(/Mastered/i);
    expect(screen.queryByLabelText(/^Practiced$/i)).not.toBeInTheDocument();
  });
});

describe("ScriptCard — link href falls back when no language", () => {
  test("/play/<scriptId> with no query when item.language is undefined", async () => {
    const noLang = { ...SAMPLE_ITEM, language: undefined };
    render(<ScriptCard item={noLang} />);
    const link = (
      await screen.findByText("CNNs for Image Tasks")
    ).closest("a");
    expect(link?.getAttribute("href")).toBe("/play/cnn_for_pm_b1");
  });
});
