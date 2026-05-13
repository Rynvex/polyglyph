# Vocab Visual Strategy

> Drafted 2026-05-11 as Sprint 5 / G2 (draft awaiting review per user Q9).
> Companion to [VOCAB_FREQUENCY_SOURCES.md](./VOCAB_FREQUENCY_SOURCES.md).

## Problem

Today's `Concept` schema requires a single `emoji` field. Emoji works
beautifully for concrete nouns (`🍎` for *apple*) and emotive words
(`😊` for *happy*). It collapses for:

- **Abstract nouns** — *justice*, *thought*, *patience*, *concept*
- **Function words** — *the*, *of*, *if*, *however*
- **Verbs of state** — *consider*, *exist*, *belong*
- **Adjectives without a face** — *vague*, *necessary*, *relative*

We need a layered visual strategy so the vocab UI never falls back to
a default `·` for a third of the deck.

## Three-Layer Strategy

| Layer | Asset type | When | Source |
|---|---|---|---|
| **L1** Emoji | Single emoji | Concrete nouns, expressive verbs, emotions, foods, animals, objects | Unicode standard (already shipping) |
| **L2** Icon | Lucide SVG | Abstract nouns, verbs of state, adjectives, time/space concepts | [Lucide](https://lucide.dev) — MIT licensed, ~1500 icons |
| **L3** Photo / text | Unsplash photo or text-only card | Function words, particles, very rare nouns | Unsplash API (free tier) + plain text-only card layout |

`Concept.visual.kind` carries the choice; `Concept.visual.asset` is the
emoji char, Lucide icon name, or Unsplash photo id.

### When to use each

```text
visual.kind === "emoji"   → render Concept.visual.asset (emoji char)
visual.kind === "icon"    → render <LucideIcon name={asset} />
visual.kind === "photo"   → render <Image src={unsplashUrl} alt={...} />
visual.kind === "none"    → render large word + example sentence, no visual
```

### Coverage targets

| Layer | Expected share of 10,000 |
|---|---|
| L1 emoji | ~35% (3,500 concrete words) |
| L2 icon  | ~40% (4,000 abstract & state) |
| L3 photo | ~10% (1,000 scene-dependent — `airport`, `restaurant`) |
| L4 none  | ~15% (1,500 function/particle words) |

## Lucide Icon Mapping — Pilot 30

The proof-of-concept mappings below are the *seed* for the metonymy
catalog. Every entry below routes to L2 Lucide.

| Concept | Icon (Lucide name) | Rationale |
|---|---|---|
| thought | `lightbulb` | Idiomatic in EN; lightbulb = "I have an idea" |
| memory | `brain` | Direct embodiment |
| idea | `lightbulb` | Same family as thought |
| knowledge | `book-open` | Books = knowledge metonymy |
| wisdom | `crown` | Royal/sage metaphor |
| justice | `scale` | Scales of justice |
| freedom | `bird` | Cross-cultural metaphor |
| time | `clock` | Direct |
| future | `arrow-right` | Arrow forward |
| past | `arrow-left` | Arrow back |
| present (time) | `circle-dot` | Centered, here |
| beginning | `play` | Start glyph |
| end | `square` | Stop glyph |
| love | `heart` | Universal |
| friendship | `users` | People together |
| family | `house` | Home as family unit |
| work | `briefcase` | Workplace metonymy |
| study | `graduation-cap` | Academic |
| sleep | `moon` | Night = sleep |
| food | `utensils` | Generic eating |
| money | `wallet` | Object metonymy |
| home | `home` | Direct |
| city | `building-2` | Urban |
| road | `road` | Direct |
| sea | `waves` | Direct |
| sky | `cloud` | Direct |
| fire | `flame` | Direct |
| water | `droplets` | Generic |
| earth | `globe` | Planet |
| safety | `shield` | Shield metaphor |

Once the user signs off on these, the categorize-concepts script can
auto-suggest icons for the remaining ~3,970 abstract entries; humans
review the suggestions before commit (G6+).

## Decision Algorithm

The auto-classifier (`lib/visual/concept-visual-rules.ts`, written in
G3) routes each concept through:

```text
1. If kind === "noun-concrete" AND emoji exists for it      → L1
2. If kind === "verb-action" AND emoji exists               → L1
3. If category in {emotion, weather, food, animal, body}    → L1 (most have emoji)
4. If POS in {prep, conj, interj, det}                      → L4 (text only)
5. If kind === "noun-abstract"                              → L2 (lucide best-match)
6. Else (rare)                                              → L3 photo (or L2 fallback)
```

The classifier emits candidate visuals; a human reviewer accepts or
overrides before the row is published.

## Component Updates Needed

Once schema (G3) lands:

- `components/VocabCard.tsx` — branch on `concept.visual.kind`:
  - `"emoji"` → existing path (still wraps emoji in the big hero box)
  - `"icon"` → `<LucideIcon name={asset} className="w-32 h-32 stroke-[1.5]" />`
  - `"photo"` → `<Image src={...} className="rounded-2xl object-cover h-32 w-32" />`
  - `"none"` → drop the hero square entirely; double the word size and
    show an example sentence below it.

## Open Questions

1. **License compliance** — Lucide MIT is fine; Unsplash requires
   per-photo attribution. Schema should carry `attribution_url` for L3.
2. **Self-hosted vs CDN icons** — bundle Lucide React (~80 kB tree-shaken)
   vs SVG sprite sheet. Default to react bundle; revisit if startup
   weight matters.
3. **Photo caching** — Unsplash has a "track download" API. Use the
   in-memory ASCII cache only; CDN delivery via Vercel image
   optimization.
4. **Cultural sensitivity** — metonymy table must be culturally
   neutral; review for stereotypes before B1+ rollout.

## Next Steps

1. **Review** this draft with the user (per Q9 instructions).
2. After sign-off, write `lib/visual/concept-visual-rules.ts` (G3
   companion).
3. Audit existing 140 concepts under the new rules and migrate to
   `Concept.visual.{kind, asset}`.
4. Bulk-classify new G6 batch using the rules + spot-check.