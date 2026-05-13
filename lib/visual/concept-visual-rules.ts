/**
 * concept-visual-rules — rule-based classifier that assigns a default
 * Visual (kind + asset) to a Concept based on its POS / category /
 * frequency. The output is a *candidate* the bulk-import pipeline
 * (G4) attaches; a human reviewer accepts or overrides before commit.
 *
 * Rule order matches the priority documented in
 * docs/VISUAL_STRATEGY.md → "Decision Algorithm".
 */

import type {
  Concept,
  PartOfSpeech,
  Visual,
} from "@/lib/data/vocab/schema";

const ICON_BY_ID: Record<string, string> = {
  thought: "lightbulb",
  memory: "brain",
  idea: "lightbulb",
  knowledge: "book-open",
  wisdom: "crown",
  justice: "scale",
  freedom: "bird",
  time: "clock",
  future: "arrow-right",
  past: "arrow-left",
  present: "circle-dot",
  beginning: "play",
  end: "square",
  love: "heart",
  friendship: "users",
  family: "house",
  work: "briefcase",
  study: "graduation-cap",
  sleep: "moon",
  food: "utensils",
  money: "wallet",
  home: "home",
  city: "building-2",
  road: "road",
  sea: "waves",
  sky: "cloud",
  fire: "flame",
  water: "droplets",
  earth: "globe",
  safety: "shield",
};

const FUNCTION_WORD_POS = new Set<PartOfSpeech>([
  "preposition",
  "conjunction",
  "interjection",
  "determiner",
  "particle",
]);

const EMOJI_PREFERRED_CATEGORIES = new Set([
  "food",
  "animal",
  "weather",
  "body",
  "emotions",
  "transportation",
  "kitchen",
  "common_objects",
]);

/** Classify a concept into one of the four visual layers. */
export function classifyVisual(concept: Concept): Visual {
  // 1. Honor explicit emoji on the concept (legacy data + author override).
  if (concept.emoji && concept.emoji.length > 0) {
    return { kind: "emoji", asset: concept.emoji };
  }

  // 2. Curated icon mapping (G2 pilot 30 + future expansions).
  const curated = ICON_BY_ID[concept.id];
  if (curated) {
    return { kind: "icon", asset: curated };
  }

  // 3. Function words → text-only card.
  if (concept.pos && FUNCTION_WORD_POS.has(concept.pos)) {
    return { kind: "none", asset: null };
  }

  // 4. Concrete categories without an emoji → icon fallback.
  if (EMOJI_PREFERRED_CATEGORIES.has(concept.category)) {
    return { kind: "icon", asset: posFallbackIcon(concept.pos) };
  }

  // 5. Abstract nouns and state verbs → icon by POS heuristic.
  if (concept.pos === "noun-abstract" || concept.pos === "verb-state") {
    return { kind: "icon", asset: posFallbackIcon(concept.pos) };
  }

  // 6. Default — best-effort icon by POS.
  return { kind: "icon", asset: posFallbackIcon(concept.pos) };
}

function posFallbackIcon(pos: PartOfSpeech | undefined): string {
  switch (pos) {
    case "noun-abstract":
      return "circle-help";
    case "noun-concrete":
      return "box";
    case "verb-action":
      return "play";
    case "verb-state":
      return "circle-dot";
    case "adjective":
      return "palette";
    case "adverb":
      return "gauge";
    default:
      return "circle-help";
  }
}
