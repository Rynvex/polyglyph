import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { LiveHud } from "@/components/LiveHud";
import { createController, submitInput } from "@/lib/dialogue/controller";
import type { Dialogue } from "@/lib/data/schema";
import { DirectIME } from "@/lib/typing/ime/direct";

const DIALOGUE: Dialogue = {
  schema_version: 1,
  id: "test",
  language: "en",
  level: "A1",
  topic: "daily",
  title: "Test",
  tags: [],
  turns: [
    {
      id: "p1",
      speaker: "player",
      templates: [{ id: "p1.0", text: "hello", weight: 1 }],
    },
  ],
} as Dialogue;

describe("LiveHud", () => {
  test("renders WPM, accuracy, no combo when below threshold", () => {
    const c = createController(DIALOGUE, new DirectIME());
    render(<LiveHud controller={c} />);
    expect(screen.getByTestId("hud-wpm")).toHaveTextContent("0");
    expect(screen.getByTestId("hud-acc")).toHaveTextContent("100%");
    expect(screen.queryByTestId("hud-combo")).toBeNull();
  });

  test("shows combo badge once combo reaches 3", () => {
    let c = createController(DIALOGUE, new DirectIME());
    c = submitInput(c, "hel"); // 3 correct in a row
    render(<LiveHud controller={c} />);
    const combo = screen.getByTestId("hud-combo");
    expect(combo).toHaveTextContent("×3");
  });

  test("accuracy reflects mistakes in the live session", () => {
    let c = createController(DIALOGUE, new DirectIME());
    c = submitInput(c, "hxl"); // 2 correct, 1 wrong
    render(<LiveHud controller={c} />);
    // 2 correct of 3 total = 67%
    expect(screen.getByTestId("hud-acc")).toHaveTextContent(/6[6-7]%/);
  });

  test("WPM is computed from elapsed wall-clock time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T12:00:00Z"));
    let c = createController(DIALOGUE, new DirectIME());
    vi.advanceTimersByTime(60_000);
    c = submitInput(c, "hello"); // 5 correct chars
    render(<LiveHud controller={c} />);
    // 5 chars / 5 = 1 word, 60s = 1 minute → 1 wpm
    expect(screen.getByTestId("hud-wpm")).toHaveTextContent("1");
    vi.useRealTimers();
  });
});
