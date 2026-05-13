import { describe, expect, test } from "vitest";
import {
  backspaceController,
  buildCards,
  commitController,
  createController,
  resetCard,
  submitInput,
  tallyMastery,
} from "@/lib/vocab/controller";
import type { Concept, Deck, Translation } from "@/lib/data/vocab/schema";
import { DirectIME } from "@/lib/typing/ime/direct";

const concept = (id: string, emoji = "🍎"): Concept => ({
  id,
  emoji,
  category: "test",
  cefr: "A1",
  kind: "noun",
});

const translation = (
  conceptId: string,
  text: string,
  language = "es",
): Translation => ({
  conceptId,
  language,
  text,
});

function makeInputs(text: Record<string, string> = { apple: "manzana", banana: "platano" }) {
  const deck: Deck = {
    id: "d1",
    title: "Test Deck",
    cefr: "A1",
    conceptIds: ["apple", "banana"],
  };
  const concepts = new Map<string, Concept>([
    ["apple", concept("apple", "🍎")],
    ["banana", concept("banana", "🍌")],
  ]);
  const translations = new Map<string, Translation>(
    Object.entries(text).map(([id, t]) => [id, translation(id, t)]),
  );
  return { deck, language: "es", concepts, translations, ime: new DirectIME() };
}

describe("buildCards", () => {
  test("pairs concepts to translations in deck order", () => {
    const cards = buildCards(makeInputs());
    expect(cards).toHaveLength(2);
    expect(cards[0].concept.id).toBe("apple");
    expect(cards[0].translation.text).toBe("manzana");
    expect(cards[1].concept.id).toBe("banana");
  });

  test("skips concepts that lack a translation", () => {
    const inputs = makeInputs();
    inputs.translations.delete("banana");
    const cards = buildCards(inputs);
    expect(cards).toHaveLength(1);
    expect(cards[0].concept.id).toBe("apple");
  });
});

describe("createController", () => {
  test("starts with the first card's session open", () => {
    const c = createController(makeInputs());
    expect(c.cardIdx).toBe(0);
    expect(c.currentSession?.target).toBe("manzana");
    expect(c.isFinished).toBe(false);
  });

  test("empty deck → finished immediately", () => {
    const inputs = makeInputs();
    inputs.deck.conceptIds.length = 0;
    inputs.translations.clear();
    const c = createController(inputs);
    expect(c.isFinished).toBe(true);
    expect(c.currentSession).toBeNull();
  });
});

describe("submit / commit / advance", () => {
  test("submitInput types into the active session", () => {
    let c = createController(makeInputs());
    c = submitInput(c, "ma");
    expect(c.currentSession?.cursor).toBe(2);
  });

  test("commit advances to next card when filled", () => {
    let c = createController(makeInputs());
    c = submitInput(c, "manzana");
    c = commitController(c);
    expect(c.cardIdx).toBe(1);
    expect(c.currentSession?.target).toBe("platano");
    expect(c.completed).toHaveLength(1);
  });

  test("commit on partial input is a no-op", () => {
    let c = createController(makeInputs());
    c = submitInput(c, "man");
    const before = c;
    c = commitController(c);
    expect(c.currentSession?.cursor).toBe(3);
    expect(c).toBe(before);
  });

  test("commit ALLOWS wrong cells once cursor at end (matches dialogue UX)", () => {
    let c = createController(makeInputs());
    c = submitInput(c, "xxxxxxx"); // 7 wrong cells (manzana = 7)
    c = commitController(c);
    expect(c.cardIdx).toBe(1);
    expect(c.completed).toHaveLength(1);
    expect(c.totalStats.charsWrong).toBe(7);
  });

  test("finishes after the last card", () => {
    let c = createController(makeInputs());
    c = submitInput(c, "manzana");
    c = commitController(c);
    c = submitInput(c, "platano");
    c = commitController(c);
    expect(c.isFinished).toBe(true);
    expect(c.completed).toHaveLength(2);
  });
});

describe("backspace + resetCard", () => {
  test("backspace rewinds within current card", () => {
    let c = createController(makeInputs());
    c = submitInput(c, "ma");
    c = backspaceController(c);
    expect(c.currentSession?.cursor).toBe(1);
  });

  test("resetCard wipes a card without committing", () => {
    let c = createController(makeInputs());
    c = submitInput(c, "manzx");
    c = resetCard(c);
    expect(c.currentSession?.cursor).toBe(0);
    expect(c.completed).toHaveLength(0);
    expect(c.cardIdx).toBe(0);
  });
});

describe("native-prompt translations", () => {
  function makeInputsWithNative() {
    const deck: Deck = {
      id: "d1",
      title: "Test Deck",
      cefr: "A1",
      conceptIds: ["apple", "banana"],
    };
    const concepts = new Map<string, Concept>([
      ["apple", concept("apple", "🍎")],
      ["banana", concept("banana", "🍌")],
    ]);
    // Target language: Spanish — what the user types.
    const translations = new Map<string, Translation>([
      ["apple", translation("apple", "manzana", "es")],
      ["banana", translation("banana", "platano", "es")],
    ]);
    // Native language: Traditional Chinese — what the user reads as a cue.
    const nativePrompts = new Map<string, Translation>([
      ["apple", translation("apple", "蘋果", "zh-tw")],
      ["banana", translation("banana", "香蕉", "zh-tw")],
    ]);
    return {
      deck,
      language: "es",
      concepts,
      translations,
      nativePrompts,
      ime: new DirectIME(),
    };
  }

  test("buildCards exposes nativePrompt when nativePrompts map is supplied", () => {
    const cards = buildCards(makeInputsWithNative());
    expect(cards).toHaveLength(2);
    expect(cards[0].nativePrompt?.text).toBe("蘋果");
    expect(cards[1].nativePrompt?.text).toBe("香蕉");
    // Target translation still drives the typing target.
    expect(cards[0].translation.text).toBe("manzana");
  });

  test("buildCards leaves nativePrompt null when concept has no native translation", () => {
    const inputs = makeInputsWithNative();
    inputs.nativePrompts.delete("banana");
    const cards = buildCards(inputs);
    expect(cards[0].nativePrompt?.text).toBe("蘋果");
    expect(cards[1].nativePrompt).toBeNull();
  });

  test("buildCards omits nativePrompt entirely when nativePrompts is missing", () => {
    const cards = buildCards(makeInputs());
    expect(cards[0].nativePrompt).toBeNull();
  });

  test("createController seeds typing session from target translation, not native", () => {
    const c = createController(makeInputsWithNative());
    expect(c.currentSession?.target).toBe("manzana");
    expect(c.cards[0].nativePrompt?.text).toBe("蘋果");
  });

  test("commit advances to next card carrying its native prompt", () => {
    let c = createController(makeInputsWithNative());
    c = submitInput(c, "manzana");
    c = commitController(c);
    expect(c.cards[c.cardIdx].nativePrompt?.text).toBe("香蕉");
    expect(c.currentSession?.target).toBe("platano");
  });
});

describe("shuffle mode", () => {
  // Bigger deck so shuffle has somewhere to move things.
  function bigInputs() {
    const deck: Deck = {
      id: "d2",
      title: "Big",
      cefr: "A1",
      conceptIds: ["a", "b", "c", "d", "e"],
    };
    const concepts = new Map<string, Concept>([
      ["a", concept("a")], ["b", concept("b")], ["c", concept("c")],
      ["d", concept("d")], ["e", concept("e")],
    ]);
    const translations = new Map<string, Translation>([
      ["a", translation("a", "1")], ["b", translation("b", "2")],
      ["c", translation("c", "3")], ["d", translation("d", "4")],
      ["e", translation("e", "5")],
    ]);
    return { deck, language: "es", concepts, translations, ime: new DirectIME() };
  }

  test("buildCards preserves deck order by default", () => {
    const cards = buildCards(bigInputs());
    expect(cards.map((c) => c.concept.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  test("buildCards with shuffle:true reorders using injected RNG", () => {
    // Deterministic RNG that always picks index 0 → reverses by Fisher-Yates
    let seq = 0;
    const fakeRandom = () => {
      // values produce indices 4,3,2,1 for n=5,4,3,2 ⇒ no-op shuffle
      const vals = [0.99, 0.99, 0.99, 0.99];
      const r = vals[seq] ?? 0;
      seq += 1;
      return r;
    };
    const ordered = buildCards(bigInputs());
    const shuffled = buildCards({
      ...bigInputs(),
      shuffle: true,
      random: fakeRandom,
    });
    // With this RNG, Fisher-Yates picks the last element each iteration so
    // the resulting order should match the input (effectively no swap).
    // The important assertion is the function accepts the flag without
    // changing ordered output when called without shuffle.
    expect(ordered.map((c) => c.concept.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(shuffled).toHaveLength(5);
    // Reset for determinism, then test with always-pick-first (r=0)
    seq = 0;
    const pickFirst = () => 0;
    const reversed = buildCards({
      ...bigInputs(),
      shuffle: true,
      random: pickFirst,
    });
    // Fisher-Yates picking index 0 each time produces [b,c,d,e,a] → first
    // element moves to back at each step. We just need to confirm it
    // differs from sorted order to prove shuffle ran.
    expect(reversed.map((c) => c.concept.id)).not.toEqual([
      "a", "b", "c", "d", "e",
    ]);
    expect(new Set(reversed.map((c) => c.concept.id))).toEqual(
      new Set(["a", "b", "c", "d", "e"]),
    );
  });

  test("createController forwards shuffle option", () => {
    const c = createController({
      ...bigInputs(),
      shuffle: true,
      random: () => 0,
    });
    expect(c.cards).toHaveLength(5);
    // Same set, possibly different order
    expect(new Set(c.cards.map((x) => x.concept.id))).toEqual(
      new Set(["a", "b", "c", "d", "e"]),
    );
  });
});

describe("tallyMastery", () => {
  test("counts perfect vs flagged cards", () => {
    let c = createController(makeInputs());
    c = submitInput(c, "manzana");
    c = commitController(c);
    c = submitInput(c, "platxno"); // 1 wrong
    c = commitController(c);
    expect(tallyMastery(c)).toEqual({ total: 2, perfect: 1, flagged: 1 });
  });
});
