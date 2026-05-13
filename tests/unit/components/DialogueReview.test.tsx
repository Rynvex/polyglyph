import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { DialogueReview } from "@/components/DialogueReview";
import { CharState } from "@/lib/typing/engine";
import type { CompletedPlayerTurn } from "@/lib/dialogue/controller";
import type { Template, Turn } from "@/lib/data/schema";

const turn = (id: string): Turn => ({ id, speaker: "player" } as Turn);
const template = (id: string, text: string): Template => ({ id, text, weight: 1 });

function entry(
  turnId: string,
  text: string,
  cells: { c: string; state: "pending" | "correct" | "wrong"; typed?: string }[],
): CompletedPlayerTurn {
  return {
    turn: turn(turnId),
    template: template(`${turnId}.0`, text),
    cells: cells.map((c) => ({
      target: c.c,
      state: c.state as typeof CharState[keyof typeof CharState],
      typed: c.typed ?? c.c,
    })),
  };
}

describe("DialogueReview", () => {
  test("renders nothing when no completed turns", () => {
    render(<DialogueReview turns={[]} />);
    expect(screen.queryByTestId("dialogue-review")).toBeNull();
  });

  test("lists every completed turn", () => {
    const turns: CompletedPlayerTurn[] = [
      entry("p1", "hi", [
        { c: "h", state: "correct" },
        { c: "i", state: "correct" },
      ]),
      entry("p2", "yo", [
        { c: "y", state: "wrong", typed: "x" },
        { c: "o", state: "correct" },
      ]),
    ];
    render(<DialogueReview turns={turns} />);
    expect(screen.getAllByTestId("review-line")).toHaveLength(2);
  });

  test("flags lines with wrong cells", () => {
    const turns: CompletedPlayerTurn[] = [
      entry("p1", "hi", [
        { c: "h", state: "correct" },
        { c: "i", state: "wrong", typed: "x" },
      ]),
    ];
    render(<DialogueReview turns={turns} />);
    expect(screen.getByTestId("review-line")).toHaveAttribute("data-flagged", "true");
  });

  test("does not flag perfect lines", () => {
    const turns: CompletedPlayerTurn[] = [
      entry("p1", "hi", [
        { c: "h", state: "correct" },
        { c: "i", state: "correct" },
      ]),
    ];
    render(<DialogueReview turns={turns} />);
    expect(screen.getByTestId("review-line")).toHaveAttribute("data-flagged", "false");
  });

  test("shows the typed char (not target) for wrong cells so mistakes are visible", () => {
    const turns: CompletedPlayerTurn[] = [
      entry("p1", "yo", [
        { c: "y", state: "wrong", typed: "x" },
        { c: "o", state: "correct" },
      ]),
    ];
    render(<DialogueReview turns={turns} />);
    const line = screen.getByTestId("review-line");
    expect(line.textContent).toContain("xo"); // the typed sequence, not 'yo'
  });
});
