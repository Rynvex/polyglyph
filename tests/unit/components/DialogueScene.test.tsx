/**
 * Integration: DialogueScene drives the controller via real keyboard events.
 *
 * Bot bubbles drip-feed with a typing indicator → most assertions use
 * findBy* (which waits) instead of getBy* so the 600ms reveal doesn't
 * race the test.
 */

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DialogueScene } from "@/components/DialogueScene";
import type { Dialogue } from "@/lib/data/schema";

const TWO_TURN: Dialogue = {
  schema_version: 1,
  id: "test",
  language: "en",
  level: "A1",
  topic: "daily",
  title: "Test",
  tags: [],
  turns: [
    { id: "t1", speaker: "bot", text: "Hello!" },
    {
      id: "t2",
      speaker: "player",
      templates: [{ id: "t2.a", text: "hi", weight: 1 }],
    },
  ],
} as Dialogue;

describe("DialogueScene", () => {
  test("renders the leading bot turn after the typing delay", async () => {
    render(<DialogueScene dialogue={TWO_TURN} scriptId="test" />);
    expect(await screen.findByText("Hello!")).toBeInTheDocument();
  });

  test("typing alone does NOT finish the dialogue", async () => {
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="test" />);
    await user.keyboard("hi");
    expect(screen.queryByText(/Dialogue complete/i)).toBeNull();
  });

  test("typing then Enter eventually finishes the dialogue (via end card)", async () => {
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="test" />);
    await user.keyboard("hi{Enter}");
    // End card lands first.
    await screen.findByTestId("dialogue-end-card", undefined, { timeout: 2000 });
    // Any non-Esc key advances to the settlement.
    await user.keyboard(" ");
    expect(
      await screen.findByText(/Dialogue complete/i, undefined, { timeout: 2000 }),
    ).toBeInTheDocument();
  });

  test("Enter on a partial line is a no-op", async () => {
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="test" />);
    await user.keyboard("h{Enter}");
    expect(screen.queryByText(/Dialogue complete/i)).toBeNull();
    const cells = screen.getAllByTestId("cell");
    expect(cells[0]).toHaveAttribute("data-state", "correct");
  });

  test("backspace rewinds typed cells", async () => {
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="test" />);
    await user.keyboard("h");
    expect(screen.getAllByTestId("cell")[0]).toHaveAttribute("data-state", "correct");
    await user.keyboard("{Backspace}");
    expect(screen.getAllByTestId("cell")[0]).toHaveAttribute("data-state", "pending");
  });

  test("a wrong char is reflected in the cell state", async () => {
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="test" />);
    await user.keyboard("x");
    expect(screen.getAllByTestId("cell")[0]).toHaveAttribute("data-state", "wrong");
  });

  test("typing indicator appears before the bot bubble", () => {
    render(<DialogueScene dialogue={TWO_TURN} scriptId="test" />);
    expect(screen.getByTestId("typing-row")).toBeInTheDocument();
  });

  test("first keystroke skips the bot reveal animation", async () => {
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="test" />);
    expect(screen.getByTestId("typing-row")).toBeInTheDocument();
    await user.keyboard("h");
    // Indicator gone after a single keystroke; the bubble's text appears
    // via the typewriter — it's fast-forwarded by skipSignal but rendered
    // across one extra effect tick, so use findByText (with timeout) to
    // give React a chance to flush.
    expect(screen.queryByTestId("typing-row")).toBeNull();
    expect(await screen.findByText("Hello!")).toBeInTheDocument();
  });

  test("Esc fires the onExit callback", async () => {
    const onExit = vi.fn();
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="test" onExit={onExit} />);
    await user.keyboard("{Escape}");
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  test("Alt+R resets the current line without committing", async () => {
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="test" />);
    await user.keyboard("hi"); // line filled correctly
    await user.keyboard("{Alt>}r{/Alt}");
    const cells = screen.getAllByTestId("cell");
    expect(cells[0]).toHaveAttribute("data-state", "pending");
    expect(cells[1]).toHaveAttribute("data-state", "pending");
  });
});

describe("DialogueScene — natural drip-feed and typewriter animation", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("a NEW bot turn revealed after resume must still animate", async () => {
    // Regression: 'resumedTurn !== null' used to gate skipTyping forever,
    // so every bot turn produced after a checkpoint resume rendered
    // instantly — the user lost the typewriter for the rest of the play.
    const FOUR_TURN: Dialogue = {
      schema_version: 1,
      id: "test4",
      language: "en",
      level: "A1",
      topic: "daily",
      title: "Test",
      tags: [],
      turns: [
        { id: "t1", speaker: "bot", text: "Hi" },
        { id: "t2", speaker: "player", templates: [{ id: "t2.a", text: "ok", weight: 1 }] },
        { id: "t3", speaker: "bot", text: "World" },
        { id: "t4", speaker: "player", templates: [{ id: "t4.a", text: "go", weight: 1 }] },
      ],
    } as Dialogue;
    const { saveCheckpoint } = await import("@/lib/progress/storage");
    saveCheckpoint("resume-anim", {
      scriptId: "resume-anim",
      turnIdx: 1,
      spokenBotTurnIds: ["t1"],
      completedPlayerTurnIds: [],
      savedAtMs: 1,
    });

    const user = userEvent.setup();
    render(<DialogueScene dialogue={FOUR_TURN} scriptId="resume-anim" />);

    // bot1 came back instant via resume — correct.
    expect(screen.getByText("Hi")).toBeInTheDocument();

    await user.keyboard("ok{Enter}");

    // Wait for bot3's typewriter span to MOUNT (this happens when the
    // drip-feed reveals it after ~600ms — there will be 2 typewriters
    // in the DOM: bot1 and bot3).
    await waitFor(
      () => {
        expect(screen.queryAllByTestId("typewriter")).toHaveLength(2);
      },
      { timeout: 2000 },
    );

    // Right after bot3 mounts, if skipTyping=true (the regression) it
    // would already contain the full "World". If skipTyping=false (the
    // desired behavior), its content starts shorter than the target and
    // grows. We sample once or twice and check the bot3 typewriter (the
    // second one) is NOT immediately at the full target.
    const bot3tw = screen.getAllByTestId("typewriter")[1];
    const initialContent = bot3tw.textContent?.replace(/▍/g, "") ?? "";
    expect(initialContent).not.toBe("World");
  });

  test("the latest bot bubble animates char-by-char on the natural drip path", async () => {
    vi.useFakeTimers();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="anim-fake" />);

    // Before drip-feed delay (600ms), the bubble is not in DOM.
    expect(screen.queryByTestId("typewriter")).toBeNull();

    // Advance past drip-feed delay → bubble mounts at shown=0.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(601);
    });
    const tw = screen.getByTestId("typewriter");
    expect(tw.textContent?.replace(/▍/g, "")).toBe("");

    // One charDelayMs (35ms) later, one char visible. NOT the full text.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(35);
    });
    expect(screen.getByTestId("typewriter").textContent?.replace(/▍/g, "")).toBe("H");

    // Two ticks → two chars. Confirms it's animating, not instant.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(35);
    });
    expect(screen.getByTestId("typewriter").textContent?.replace(/▍/g, "")).toBe("He");
  });
});

describe("DialogueScene — typing panel waits for the bot to finish", () => {
  test("typing panel is visually hidden while the bot indicator is showing", () => {
    render(<DialogueScene dialogue={TWO_TURN} scriptId="ux-test" />);
    // Indicator visible → wrapper present in DOM but flagged invisible
    // (kept mounted so cell DOM stays queryable for downstream tests).
    expect(screen.getByTestId("typing-row")).toBeInTheDocument();
    const wrapper = screen.getByTestId("typing-panel-wrapper");
    expect(wrapper).toHaveClass("invisible");
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
  });

  test("typing panel becomes visible after the latest bot bubble finishes", async () => {
    render(<DialogueScene dialogue={TWO_TURN} scriptId="ux-test" />);
    // Bubble text appears once the typewriter has revealed the line.
    await screen.findByText("Hello!");
    // Polling: once the typewriter fires onComplete, the wrapper drops
    // its invisible class.
    await screen.findByTestId("typing-panel-wrapper");
    await new Promise((resolve) => setTimeout(resolve, 0));
    // Wait for the gate to lift.
    const start = Date.now();
    while (Date.now() - start < 3000) {
      const w = screen.getByTestId("typing-panel-wrapper");
      if (!w.classList.contains("invisible")) break;
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    expect(screen.getByTestId("typing-panel-wrapper")).not.toHaveClass("invisible");
  });

  test("after a player keystroke the panel is visible (typewriter fast-forwarded)", async () => {
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="ux-test" />);
    await user.keyboard("h");
    // Keystroke skips the bot reveal: indicator gone, latest typewriter
    // reaches text.length, onComplete fires, wrapper becomes visible.
    expect(screen.getByTestId("typing-panel-wrapper")).not.toHaveClass("invisible");
  });
});

describe("DialogueScene — player bubble display fallback", () => {
  test("after commit, player bubble shows template.display when present (NOT the typed romaji)", async () => {
    const DISPLAY_TURN: Dialogue = {
      schema_version: 1,
      id: "display-test",
      language: "en",
      level: "A1",
      topic: "daily",
      title: "Test",
      tags: [],
      turns: [
        { id: "t1", speaker: "bot", text: "Greeting" },
        {
          id: "t2",
          speaker: "player",
          templates: [
            {
              id: "t2.a",
              text: "ohayou",
              display: "Sun greeting",
              weight: 1,
            },
          ],
        },
      ],
    } as Dialogue;
    const user = userEvent.setup();
    render(<DialogueScene dialogue={DISPLAY_TURN} scriptId="display-fb" />);
    await user.keyboard("ohayou{Enter}");
    // Wait for the player chat row to land in the DOM, then assert its
    // content is the display string, not the typed romaji.
    await waitFor(
      () => {
        const playerRows = screen
          .getAllByTestId("chat-row")
          .filter((el) => el.getAttribute("data-speaker") === "player");
        expect(playerRows).toHaveLength(1);
      },
      { timeout: 2000 },
    );
    const playerRows = screen
      .getAllByTestId("chat-row")
      .filter((el) => el.getAttribute("data-speaker") === "player");
    expect(playerRows[0].textContent).toContain("Sun greeting");
    expect(playerRows[0].textContent).not.toContain("ohayou");
  });

  test("after commit, falls back to template.text when display absent", async () => {
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="display-none" />);
    await user.keyboard("hi{Enter}");
    const playerRows = (await screen.findAllByTestId("chat-row"))
      .filter((el) => el.getAttribute("data-speaker") === "player");
    expect(playerRows).toHaveLength(1);
    expect(playerRows[0].textContent).toContain("hi");
  });
});

describe("DialogueScene — end card before summary", () => {
  test("after the last player commit the end card appears, NOT the summary yet", async () => {
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="end-card-1" />);
    await user.keyboard("hi{Enter}");
    // End card visible.
    expect(
      await screen.findByTestId("dialogue-end-card", undefined, { timeout: 2000 }),
    ).toBeInTheDocument();
    // Summary NOT shown yet — that's the bug we're guarding against.
    expect(screen.queryByText(/Dialogue complete/i)).toBeNull();
  });

  test("end card content explains that any key advances", async () => {
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="end-card-2" />);
    await user.keyboard("hi{Enter}");
    const card = await screen.findByTestId("dialogue-end-card");
    expect(card.textContent ?? "").toMatch(/any key/i);
  });

  test("any key on end card advances to summary", async () => {
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="end-card-3" />);
    await user.keyboard("hi{Enter}");
    await screen.findByTestId("dialogue-end-card");
    await user.keyboard(" ");
    expect(
      await screen.findByText(/Dialogue complete/i, undefined, { timeout: 2000 }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("dialogue-end-card")).toBeNull();
  });

  test("Esc on end card still calls onExit (not advance to summary)", async () => {
    const onExit = vi.fn();
    const user = userEvent.setup();
    render(
      <DialogueScene dialogue={TWO_TURN} scriptId="end-card-4" onExit={onExit} />,
    );
    await user.keyboard("hi{Enter}");
    await screen.findByTestId("dialogue-end-card");
    await user.keyboard("{Escape}");
    expect(onExit).toHaveBeenCalledTimes(1);
    // Summary not shown — Esc bailed before advancing.
    expect(screen.queryByText(/Dialogue complete/i)).toBeNull();
  });
});

describe("DialogueScene — settlement keyboard", () => {
  async function playToFinish(user: ReturnType<typeof userEvent.setup>) {
    // TWO_TURN: 1 bot ("Hello!") + 1 player turn ("hi")
    await user.keyboard("hi{Enter}");
    // End card lands first; ack with any key, then wait for the settlement.
    await screen.findByTestId("dialogue-end-card", undefined, { timeout: 2000 });
    await user.keyboard(" ");
    await screen.findByText(/Dialogue complete/i, undefined, { timeout: 2000 });
  }

  test("Enter on settlement triggers Play again (resets to start)", async () => {
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="kbd-test" />);
    await playToFinish(user);
    await user.keyboard("{Enter}");
    // After Play again, the typing panel should be back (a player turn open).
    expect((await screen.findAllByTestId("cell")).length).toBeGreaterThan(0);
  });

  test("R on settlement also triggers Play again", async () => {
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="kbd-test" />);
    await playToFinish(user);
    await user.keyboard("r");
    expect((await screen.findAllByTestId("cell")).length).toBeGreaterThan(0);
  });

  test("N on settlement calls onNavigateToNext with nextScriptId", async () => {
    const onNavigateToNext = vi.fn();
    const user = userEvent.setup();
    render(
      <DialogueScene
        dialogue={TWO_TURN}
        scriptId="kbd-test"
        nextScriptId="some-next"
        onNavigateToNext={onNavigateToNext}
      />,
    );
    await playToFinish(user);
    await user.keyboard("n");
    expect(onNavigateToNext).toHaveBeenCalledWith("some-next");
  });

  test("N is a no-op when there is no nextScriptId", async () => {
    const onNavigateToNext = vi.fn();
    const user = userEvent.setup();
    render(
      <DialogueScene
        dialogue={TWO_TURN}
        scriptId="kbd-test"
        onNavigateToNext={onNavigateToNext}
      />,
    );
    await playToFinish(user);
    await user.keyboard("n");
    expect(onNavigateToNext).not.toHaveBeenCalled();
  });

  test("Q on settlement fires onExit", async () => {
    const onExit = vi.fn();
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="kbd-test" onExit={onExit} />);
    await playToFinish(user);
    await user.keyboard("q");
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  test("Esc on settlement also fires onExit", async () => {
    const onExit = vi.fn();
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="kbd-test" onExit={onExit} />);
    await playToFinish(user);
    await user.keyboard("{Escape}");
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  test("typing chars on settlement is a no-op (does NOT start a new session)", async () => {
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="kbd-test" />);
    await playToFinish(user);
    await user.keyboard("xyz");
    // Still on settlement.
    expect(screen.queryByTestId("cell")).toBeNull();
    expect(screen.getByText(/Dialogue complete/i)).toBeInTheDocument();
  });
});

describe("DialogueScene — Resume banner", () => {
  test("shows the resume banner when a checkpoint is restored", async () => {
    const { saveCheckpoint } = await import("@/lib/progress/storage");
    saveCheckpoint("resume-test", {
      scriptId: "resume-test",
      turnIdx: 1,
      spokenBotTurnIds: ["t1"],
      completedPlayerTurnIds: [],
      savedAtMs: 1,
    });
    render(<DialogueScene dialogue={TWO_TURN} scriptId="resume-test" />);
    expect(screen.getByTestId("resume-banner")).toBeInTheDocument();
  });

  test("clicking 'Start over' clears the checkpoint and dismisses banner", async () => {
    const { saveCheckpoint, loadCheckpoint } = await import("@/lib/progress/storage");
    saveCheckpoint("resume-test", {
      scriptId: "resume-test",
      turnIdx: 1,
      spokenBotTurnIds: ["t1"],
      completedPlayerTurnIds: [],
      savedAtMs: 1,
    });
    const user = userEvent.setup();
    render(<DialogueScene dialogue={TWO_TURN} scriptId="resume-test" />);
    await user.click(screen.getByRole("button", { name: /start over/i }));
    expect(loadCheckpoint("resume-test")).toBeNull();
    expect(screen.queryByTestId("resume-banner")).toBeNull();
  });

  test("no banner when there is no checkpoint", () => {
    render(<DialogueScene dialogue={TWO_TURN} scriptId="no-checkpoint" />);
    expect(screen.queryByTestId("resume-banner")).toBeNull();
  });
});
