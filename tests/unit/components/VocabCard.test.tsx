/**
 * TDD spec for VocabCard — vocab prompt panel.
 *
 * Targets behaviour, not pixel layout: the card renders the emoji, the
 * category line, the native-language prompt, and (when speech is
 * available) a labelled speak button. Visual hero treatment lives in
 * Tailwind utility classes which aren't asserted here — F6 visual
 * review covers that.
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VocabCard } from "@/components/VocabCard";
import type { Concept, Translation } from "@/lib/data/vocab/schema";

vi.mock("@/lib/audio/web-speech", () => ({
  createSpeaker: () => ({
    speak: vi.fn(async () => {}),
    cancel: vi.fn(),
  }),
  isSpeechAvailable: () => true,
}));

const concept: Concept = {
  id: "apple",
  kind: "noun",
  emoji: "🍎",
  category: "food",
  cefr: "A1",
};

const translation: Translation = {
  concept_id: "apple",
  text: "りんご",
};

describe("VocabCard", () => {
  test("renders emoji, category, and target text", () => {
    render(
      <VocabCard
        concept={concept}
        translation={translation}
        language="ja"
        autoSpeak={false}
      />,
    );
    expect(screen.getByTestId("vocab-card")).toBeInTheDocument();
    expect(screen.getByText("🍎")).toBeInTheDocument();
    expect(screen.getByText(/food/i)).toBeInTheDocument();
    // Without nativePrompt, the prompt falls back to the concept id.
    expect(screen.getByText("apple")).toBeInTheDocument();
  });

  test("prefers nativePrompt text when provided", () => {
    render(
      <VocabCard
        concept={concept}
        translation={translation}
        nativePrompt={{ concept_id: "apple", text: "蘋果" }}
        language="ja"
        nativeLang="zh-tw"
        autoSpeak={false}
      />,
    );
    expect(screen.getByText("蘋果")).toBeInTheDocument();
    // Native cue's lang attribute reflects user's nativeLang.
    expect(screen.getByText("蘋果").getAttribute("lang")).toBe("zh-tw");
  });

  test("speak button has an accessible label", () => {
    render(
      <VocabCard
        concept={concept}
        translation={translation}
        language="ja"
        autoSpeak={false}
      />,
    );
    expect(
      screen.getByRole("button", { name: /pronounce りんご/i }),
    ).toBeInTheDocument();
  });
});

describe("VocabCard — letter (alphabet drill)", () => {
  const hiraganaA: Concept = {
    id: "hira_a",
    kind: "letter",
    emoji: "あ",
    category: "alphabet.hiragana",
    cefr: "A1",
  };

  const trans: Translation = {
    concept_id: "hira_a",
    text: "a",
  };

  test("renders with a letter-specific test id", () => {
    render(
      <VocabCard concept={hiraganaA} translation={trans} language="ja" autoSpeak={false} />,
    );
    expect(screen.getByTestId("vocab-card-letter")).toBeInTheDocument();
    // Does NOT render the standard vocab-card variant
    expect(screen.queryByTestId("vocab-card")).not.toBeInTheDocument();
  });

  test("shows the native character as the hero glyph", () => {
    render(
      <VocabCard concept={hiraganaA} translation={trans} language="ja" autoSpeak={false} />,
    );
    expect(screen.getByText("あ")).toBeInTheDocument();
  });

  test("shows the romaji target as a small label below", () => {
    render(
      <VocabCard concept={hiraganaA} translation={trans} language="ja" autoSpeak={false} />,
    );
    // The romaji "a" appears (separately from anywhere it might be embedded)
    expect(screen.getByTestId("letter-romaji")).toHaveTextContent("a");
  });

  test("does NOT fall back to the concept id as a visible prompt", () => {
    render(
      <VocabCard concept={hiraganaA} translation={trans} language="ja" autoSpeak={false} />,
    );
    // `hira_a` is not learner-friendly — should never surface in the UI
    expect(screen.queryByText("hira_a")).not.toBeInTheDocument();
  });

  test("hangul syllable letter renders the same way", () => {
    const hangulGa: Concept = {
      id: "hangul_ga",
      kind: "letter",
      emoji: "가",
      category: "alphabet.hangul",
      cefr: "A1",
    };
    render(
      <VocabCard
        concept={hangulGa}
        translation={{ concept_id: "hangul_ga", text: "ga" }}
        language="ko"
        autoSpeak={false}
      />,
    );
    expect(screen.getByTestId("vocab-card-letter")).toBeInTheDocument();
    expect(screen.getByText("가")).toBeInTheDocument();
  });
});
