/**
 * TDD spec for the Curated scripts section. Defaults to grouping by
 * Topic; switching to Difficulty regroups by CEFR level. Persists the
 * mode to localStorage so reopens land on the same view.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { CuratedScripts } from "@/components/CuratedScripts";
import type { ScriptIndexItem } from "@/lib/data/script-index";

const items: ScriptIndexItem[] = [
  {
    scriptId: "a",
    id: "a",
    title: "Apple chat",
    level: "A1",
    topic: "daily",
  },
  {
    scriptId: "b",
    id: "b",
    title: "Beach trip",
    level: "A2",
    topic: "travel",
  },
  {
    scriptId: "c",
    id: "c",
    title: "Coffee order",
    level: "A1",
    topic: "food",
  },
  {
    scriptId: "d",
    id: "d",
    title: "Distributed systems",
    level: "B2",
    topic: "tech",
  },
];

beforeEach(() => {
  window.localStorage.clear();
});

describe("CuratedScripts default view (group by Topic)", () => {
  test("renders one section per topic that has items", () => {
    render(<CuratedScripts items={items} />);
    expect(screen.getByTestId("topic-group-daily")).toBeInTheDocument();
    expect(screen.getByTestId("topic-group-travel")).toBeInTheDocument();
    expect(screen.getByTestId("topic-group-food")).toBeInTheDocument();
    expect(screen.getByTestId("topic-group-tech")).toBeInTheDocument();
    // Topics with no items don't render a section.
    expect(screen.queryByTestId("topic-group-mind")).toBeNull();
  });

  test("each section header shows item count", () => {
    render(<CuratedScripts items={items} />);
    const dailyHeader = screen.getByTestId("topic-group-daily").querySelector("h3");
    expect(dailyHeader?.textContent ?? "").toMatch(/1/);
  });
});

describe("CuratedScripts difficulty mode", () => {
  test("switching to Difficulty regroups by CEFR level", async () => {
    const user = userEvent.setup();
    render(<CuratedScripts items={items} />);
    await user.click(screen.getByRole("button", { name: /difficulty/i }));
    expect(screen.getByTestId("level-group-A1")).toBeInTheDocument();
    expect(screen.getByTestId("level-group-A2")).toBeInTheDocument();
    expect(screen.getByTestId("level-group-B2")).toBeInTheDocument();
    // No items at C1 → no section.
    expect(screen.queryByTestId("level-group-C1")).toBeNull();
  });
});

describe("CuratedScripts mode persistence", () => {
  test("persists chosen mode in localStorage", async () => {
    const user = userEvent.setup();
    render(<CuratedScripts items={items} />);
    await user.click(screen.getByRole("button", { name: /difficulty/i }));
    expect(window.localStorage.getItem("polyglyph:browse-mode")).toBe("difficulty");
  });

  test("restores mode from localStorage on mount", () => {
    window.localStorage.setItem("polyglyph:browse-mode", "difficulty");
    render(<CuratedScripts items={items} />);
    // Difficulty mode → level groups visible.
    expect(screen.getByTestId("level-group-A1")).toBeInTheDocument();
  });
});

describe("CuratedScripts collapsible groups", () => {
  test("each topic group is collapsible (renders a <details> element)", () => {
    render(<CuratedScripts items={items} />);
    const dailyGroup = screen.getByTestId("topic-group-daily");
    expect(dailyGroup.tagName).toBe("DETAILS");
  });

  test("toggling a group persists its open state in localStorage", async () => {
    const user = userEvent.setup();
    render(<CuratedScripts items={items} />);
    const summary = screen
      .getByTestId("topic-group-daily")
      .querySelector("summary");
    expect(summary).not.toBeNull();
    await user.click(summary!);
    // After click, the open state for this group key should be persisted.
    const stored = window.localStorage.getItem(
      "polyglyph:browse-group-open:topic:daily",
    );
    // open state is either "1" (open) or "0" (closed) — assert the key was written.
    expect(stored).not.toBeNull();
  });

  test("restores open state from localStorage on mount", () => {
    window.localStorage.setItem(
      "polyglyph:browse-group-open:topic:daily",
      "1",
    );
    render(<CuratedScripts items={items} />);
    const dailyGroup = screen.getByTestId("topic-group-daily");
    expect(dailyGroup).toHaveAttribute("open");
  });
});
