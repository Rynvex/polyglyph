/**
 * TDD spec for GroupMasteryStats — compact "N mastered" pill rendered
 * next to a group header (Daily / Tech / B1 / …) so the learner sees
 * group-level progress at a glance.
 *
 * Behaviour:
 *   - empty / no progress     → renders nothing (collapsed state)
 *   - some practiced, 0 mastered → "<n> practiced" pill
 *   - mastered ≥ 1            → "<n>/<total> mastered" pill (success color)
 */
import { describe, expect, test, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { GroupMasteryStats } from "@/components/GroupMasteryStats";
import {
  MASTERY_ACCURACY_THRESHOLD,
  MASTERY_PLAYCOUNT_THRESHOLD,
} from "@/lib/progress/mastery";

function writeProgress(
  scriptId: string,
  progress: { bestWpm?: number; bestAccuracy: number; playCount: number },
) {
  window.localStorage.setItem(
    `polyglyph:progress:${scriptId}`,
    JSON.stringify({
      bestWpm: progress.bestWpm ?? 30,
      bestAccuracy: progress.bestAccuracy,
      playCount: progress.playCount,
      lastPlayedAtMs: Date.now(),
      history: [],
    }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("GroupMasteryStats", () => {
  test("renders nothing when no item has progress", async () => {
    const { container } = render(
      <GroupMasteryStats scriptIds={["a", "b", "c"]} />,
    );
    // Wait a tick for useEffect
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector("[data-testid='group-mastery-stats']")).toBeNull();
  });

  test("renders practiced count when items are practiced but none mastered", async () => {
    writeProgress("a", { bestAccuracy: 70, playCount: 1 });
    writeProgress("b", { bestAccuracy: 80, playCount: 2 });
    render(<GroupMasteryStats scriptIds={["a", "b", "c"]} />);
    const stats = await screen.findByTestId("group-mastery-stats");
    expect(stats).toHaveTextContent("2 practiced");
    expect(stats.textContent).not.toMatch(/mastered/i);
  });

  test("renders mastered count when at least one item is mastered", async () => {
    writeProgress("a", {
      bestAccuracy: MASTERY_ACCURACY_THRESHOLD,
      playCount: MASTERY_PLAYCOUNT_THRESHOLD,
    });
    writeProgress("b", { bestAccuracy: 70, playCount: 1 });
    render(<GroupMasteryStats scriptIds={["a", "b", "c"]} />);
    const stats = await screen.findByTestId("group-mastery-stats");
    // The mastered pill wins; format is "1/3 mastered"
    expect(stats).toHaveTextContent("1/3 mastered");
  });

  test("handles fully-mastered group", async () => {
    for (const id of ["a", "b"]) {
      writeProgress(id, {
        bestAccuracy: 100,
        playCount: MASTERY_PLAYCOUNT_THRESHOLD,
      });
    }
    render(<GroupMasteryStats scriptIds={["a", "b"]} />);
    const stats = await screen.findByTestId("group-mastery-stats");
    expect(stats).toHaveTextContent("2/2 mastered");
  });

  test("renders nothing for empty scriptIds", async () => {
    const { container } = render(<GroupMasteryStats scriptIds={[]} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector("[data-testid='group-mastery-stats']")).toBeNull();
  });
});
