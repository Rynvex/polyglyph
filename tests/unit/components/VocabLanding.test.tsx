/**
 * TDD spec for VocabLanding — vocab vs alphabet deck filtering.
 *
 * Scoped to the new tab behaviour (kind-based filter); other
 * concerns (CEFR, search) are exercised manually + via visual review.
 */
import { describe, expect, test, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VocabLanding } from "@/components/VocabLanding";
import type { Deck } from "@/lib/data/vocab/schema";
import { TARGET_LANG_KEY } from "@/lib/data/lang-prefs";

const vocabDeck: Deck = {
  id: "food_a1",
  title: "Food & Drinks",
  cefr: "A1",
  description: "Common foods",
  conceptIds: ["apple", "banana"],
  kind: "vocab",
};

const alphabetDeck: Deck = {
  id: "ja_hiragana_basic_a1",
  title: "Hiragana — Basic",
  cefr: "A1",
  description: "46 base hiragana",
  conceptIds: ["hira_a", "hira_i"],
  kind: "alphabet",
};

const supportedLangs = ["en", "ja", "ko"];

beforeEach(() => {
  window.localStorage.clear();
});

describe("VocabLanding — Vocabulary / Alphabet tab", () => {
  test("renders a tab strip with Vocabulary and Alphabet", async () => {
    render(
      <VocabLanding decks={[vocabDeck, alphabetDeck]} languages={supportedLangs} />,
    );
    expect(await screen.findByRole("tab", { name: /Vocabulary/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Alphabet/i })).toBeInTheDocument();
  });

  test("defaults to Vocabulary (alphabet decks hidden)", async () => {
    render(
      <VocabLanding decks={[vocabDeck, alphabetDeck]} languages={supportedLangs} />,
    );
    expect(await screen.findByText("Food & Drinks")).toBeInTheDocument();
    expect(screen.queryByText("Hiragana — Basic")).not.toBeInTheDocument();
  });

  test("clicking Alphabet hides vocab decks and shows alphabet decks", async () => {
    render(
      <VocabLanding decks={[vocabDeck, alphabetDeck]} languages={supportedLangs} />,
    );
    const alphabetTab = await screen.findByRole("tab", { name: /Alphabet/i });
    await userEvent.click(alphabetTab);
    expect(screen.queryByText("Food & Drinks")).not.toBeInTheDocument();
    expect(screen.getByText("Hiragana — Basic")).toBeInTheDocument();
  });

  test("alphabet deck link uses deck.target (not user's targetLang)", async () => {
    const jaAlphabetWithTarget: Deck = {
      ...alphabetDeck,
      id: "ja_hiragana_basic_a1",
      target: "ja",
    };
    // User picked English target, but clicks a ja alphabet deck
    window.localStorage.setItem("polyglyph:target-lang", "en");
    render(
      <VocabLanding
        decks={[vocabDeck, jaAlphabetWithTarget]}
        languages={supportedLangs}
      />,
    );
    await userEvent.click(await screen.findByRole("tab", { name: /Alphabet/i }));
    const link = screen.getByText("Hiragana — Basic").closest("a");
    expect(link?.getAttribute("href")).toMatch(
      /^\/vocab\/ja\/ja_hiragana_basic_a1/,
    );
  });

  test("vocab deck link uses user's targetLang (no deck.target override)", async () => {
    window.localStorage.setItem("polyglyph:target-lang", "ja");
    render(<VocabLanding decks={[vocabDeck]} languages={supportedLangs} />);
    const link = (await screen.findByText("Food & Drinks")).closest("a");
    expect(link?.getAttribute("href")).toMatch(/^\/vocab\/ja\/food_a1/);
  });

  test("clicking Vocabulary again restores vocab-only view", async () => {
    render(
      <VocabLanding decks={[vocabDeck, alphabetDeck]} languages={supportedLangs} />,
    );
    await userEvent.click(await screen.findByRole("tab", { name: /Alphabet/i }));
    await userEvent.click(screen.getByRole("tab", { name: /Vocabulary/i }));
    expect(screen.getByText("Food & Drinks")).toBeInTheDocument();
    expect(screen.queryByText("Hiragana — Basic")).not.toBeInTheDocument();
  });

  test("restores last-selected tab from localStorage on mount", async () => {
    window.localStorage.setItem("polyglyph:vocab-tab", "alphabet");
    render(
      <VocabLanding decks={[vocabDeck, alphabetDeck]} languages={supportedLangs} />,
    );
    expect(await screen.findByText("Hiragana — Basic")).toBeInTheDocument();
    expect(screen.queryByText("Food & Drinks")).not.toBeInTheDocument();
  });

  test("persists tab choice to localStorage when user clicks", async () => {
    render(
      <VocabLanding decks={[vocabDeck, alphabetDeck]} languages={supportedLangs} />,
    );
    await userEvent.click(await screen.findByRole("tab", { name: /Alphabet/i }));
    expect(window.localStorage.getItem("polyglyph:vocab-tab")).toBe("alphabet");
    await userEvent.click(screen.getByRole("tab", { name: /Vocabulary/i }));
    expect(window.localStorage.getItem("polyglyph:vocab-tab")).toBe("vocab");
  });

  test("when no alphabet decks exist, Alphabet tab still renders but shows empty state", async () => {
    render(
      <VocabLanding decks={[vocabDeck]} languages={supportedLangs} />,
    );
    const alphabetTab = await screen.findByRole("tab", { name: /Alphabet/i });
    await userEvent.click(alphabetTab);
    expect(screen.queryByText("Food & Drinks")).not.toBeInTheDocument();
    // Empty state message
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  // Sanity: target lang picker still works (the new tab shouldn't break it)
  test("language picker stays functional after tab switch", async () => {
    window.localStorage.setItem(TARGET_LANG_KEY, "ja");
    render(
      <VocabLanding decks={[vocabDeck, alphabetDeck]} languages={supportedLangs} />,
    );
    expect(await screen.findByTestId("target-lang-picker")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: /Alphabet/i }));
    expect(screen.getByTestId("target-lang-picker")).toBeInTheDocument();
  });
});
