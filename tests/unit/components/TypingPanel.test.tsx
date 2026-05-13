/**
 * TDD spec for TypingPanel — colored cells, cursor, hint, ready-to-send cue.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { TypingPanel } from "@/components/TypingPanel";
import { CharState, createSession, inputChar } from "@/lib/typing/engine";
import { DirectIME } from "@/lib/typing/ime/direct";

describe("TypingPanel — cells", () => {
  test("renders one cell per target char", () => {
    const s = createSession("hi", new DirectIME());
    render(<TypingPanel session={s} />);
    expect(screen.getAllByTestId("cell")).toHaveLength(2);
  });

  test("each cell carries its CharState as data-state", () => {
    let s = createSession("hi", new DirectIME());
    s = inputChar(s, "h");
    render(<TypingPanel session={s} />);
    const cells = screen.getAllByTestId("cell");
    expect(cells[0]).toHaveAttribute("data-state", CharState.Correct);
    expect(cells[1]).toHaveAttribute("data-state", CharState.Pending);
  });

  test("wrong char marks the cell as wrong", () => {
    let s = createSession("hi", new DirectIME());
    s = inputChar(s, "x");
    render(<TypingPanel session={s} />);
    expect(screen.getAllByTestId("cell")[0]).toHaveAttribute("data-state", CharState.Wrong);
  });

  test("cursor cell carries data-cursor=true", () => {
    let s = createSession("hi", new DirectIME());
    s = inputChar(s, "h");
    render(<TypingPanel session={s} />);
    const cells = screen.getAllByTestId("cell");
    expect(cells[1]).toHaveAttribute("data-cursor", "true");
    expect(cells[0]).not.toHaveAttribute("data-cursor", "true");
  });
});

describe("TypingPanel — hint", () => {
  test("hint is rendered when provided", () => {
    const s = createSession("hi", new DirectIME());
    render(<TypingPanel session={s} hintZh="嗨" />);
    expect(screen.getByText("嗨")).toBeInTheDocument();
  });

  test("no hint slot when prop omitted", () => {
    const s = createSession("hi", new DirectIME());
    render(<TypingPanel session={s} />);
    expect(screen.queryByTestId("hint")).toBeNull();
  });

  test("hint container exposes data-testid for layout assertions", () => {
    const s = createSession("hi", new DirectIME());
    render(<TypingPanel session={s} hintZh="嗨" />);
    expect(screen.getByTestId("hint")).toBeInTheDocument();
  });
});

describe("TypingPanel — no in-panel chrome", () => {
  test("never renders a 'press Enter' cue (handled by global footer)", () => {
    let s = createSession("hi", new DirectIME());
    s = inputChar(s, "hi");
    render(<TypingPanel session={s} />);
    expect(screen.queryByTestId("ready-cue")).toBeNull();
  });
});

describe("TypingPanel — displayTarget (native-script reference)", () => {
  test("shows displayTarget above the cells when provided", () => {
    const s = createSession("ohayou", new DirectIME());
    render(<TypingPanel session={s} displayTarget="おはよう" />);
    const ref = screen.getByTestId("display-target");
    expect(ref.textContent).toBe("おはよう");
  });

  test("does not render the reference row when displayTarget is omitted", () => {
    const s = createSession("hello", new DirectIME());
    render(<TypingPanel session={s} />);
    expect(screen.queryByTestId("display-target")).toBeNull();
  });

  test("displayTarget and the romaji cells coexist (both visible)", () => {
    const s = createSession("ohayou", new DirectIME());
    render(<TypingPanel session={s} displayTarget="おはよう" />);
    expect(screen.getByTestId("display-target")).toBeInTheDocument();
    expect(screen.getAllByTestId("cell").length).toBeGreaterThan(0);
  });
});

describe("TypingPanel — displayFurigana (inline ruby annotations)", () => {
  test("renders <ruby> wrapping each segment with its romaji as <rt>", () => {
    const s = createSession("anatagasonzaisitehoshii", new DirectIME());
    render(
      <TypingPanel
        session={s}
        displayFurigana={[
          { jp: "あなた", ro: "anata" },
          { jp: "が", ro: "ga" },
          { jp: "存在", ro: "sonzai" },
          { jp: "してほしい", ro: "shitehoshii" },
        ]}
      />,
    );
    const ruby = screen.getByTestId("display-furigana");
    // Native <ruby> elements with <rt> inside.
    const rubies = ruby.querySelectorAll("ruby");
    expect(rubies).toHaveLength(4);
    const rts = ruby.querySelectorAll("rt");
    expect(Array.from(rts).map((rt) => rt.textContent)).toEqual([
      "anata", "ga", "sonzai", "shitehoshii",
    ]);
  });

  test("displayFurigana takes precedence over displayTarget + displayRomaji", () => {
    const s = createSession("anata", new DirectIME());
    render(
      <TypingPanel
        session={s}
        displayTarget="あなた"
        displayRomaji="anata (spaced)"
        displayFurigana={[{ jp: "あなた", ro: "anata" }]}
      />,
    );
    expect(screen.queryByTestId("display-furigana")).toBeInTheDocument();
    // The two-line fallback rows are suppressed.
    expect(screen.queryByTestId("display-target")).toBeNull();
    expect(screen.queryByTestId("display-romaji")).toBeNull();
  });

  test("does not render furigana row when displayFurigana is omitted", () => {
    const s = createSession("hi", new DirectIME());
    render(<TypingPanel session={s} displayTarget="嗨" />);
    expect(screen.queryByTestId("display-furigana")).toBeNull();
  });
});

describe("TypingPanel — displayRomaji (spaced romaji hint)", () => {
  test("shows displayRomaji as a separate hint row when provided", () => {
    const s = createSession("ohayougozaimasu", new DirectIME());
    render(
      <TypingPanel
        session={s}
        displayTarget="おはようございます"
        displayRomaji="ohayou gozaimasu"
      />,
    );
    const r = screen.getByTestId("display-romaji");
    expect(r.textContent).toBe("ohayou gozaimasu");
  });

  test("does not render the romaji row when displayRomaji is omitted", () => {
    const s = createSession("ohayougozaimasu", new DirectIME());
    render(<TypingPanel session={s} displayTarget="おはようございます" />);
    expect(screen.queryByTestId("display-romaji")).toBeNull();
  });

  test("displayRomaji renders even when displayTarget is absent", () => {
    const s = createSession("ohayou", new DirectIME());
    render(<TypingPanel session={s} displayRomaji="o ha you" />);
    expect(screen.getByTestId("display-romaji").textContent).toBe("o ha you");
  });
});

describe("TypingPanel — IME composition buffer (Japanese-style)", () => {
  test("shows the IME buffer inline when composition is in progress", async () => {
    const { JapaneseHiraganaIME } = await import("@/lib/typing/ime/japanese");
    let s = createSession("はい", new JapaneseHiraganaIME());
    s = inputChar(s, "h"); // buffer pending: "h" — no kana committed yet
    render(<TypingPanel session={s} />);
    const buf = screen.getByTestId("ime-buffer");
    expect(buf.textContent).toBe("h");
  });

  test("hides the buffer element when nothing is pending", async () => {
    const { JapaneseHiraganaIME } = await import("@/lib/typing/ime/japanese");
    const s = createSession("はい", new JapaneseHiraganaIME());
    render(<TypingPanel session={s} />);
    expect(screen.queryByTestId("ime-buffer")).toBeNull();
  });

  test("DirectIME never shows a buffer (no composition for Latin scripts)", () => {
    let s = createSession("hi", new DirectIME());
    s = inputChar(s, "h"); // committed immediately, no buffer
    render(<TypingPanel session={s} />);
    expect(screen.queryByTestId("ime-buffer")).toBeNull();
  });
});

describe("TypingPanel — typo counter", () => {
  test("does NOT render a counter when there are no wrong cells", () => {
    let s = createSession("hi", new DirectIME());
    s = inputChar(s, "h");
    render(<TypingPanel session={s} />);
    expect(screen.queryByTestId("typo-counter")).toBeNull();
  });

  test("renders 'N typos' when wrong cells exist", () => {
    let s = createSession("hello", new DirectIME());
    s = inputChar(s, "hxllx"); // 2 wrong, 3 correct
    render(<TypingPanel session={s} />);
    const counter = screen.getByTestId("typo-counter");
    expect(counter.textContent).toMatch(/2/);
    expect(counter.textContent).toMatch(/typo/i);
  });

  test("singular form for one typo", () => {
    let s = createSession("hi", new DirectIME());
    s = inputChar(s, "x");
    render(<TypingPanel session={s} />);
    const text = screen.getByTestId("typo-counter").textContent ?? "";
    expect(text).toMatch(/1\s+typo/i);
    expect(text).not.toMatch(/typos/i);
  });
});
