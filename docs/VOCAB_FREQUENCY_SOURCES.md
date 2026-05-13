# Vocab Frequency Sources

> Drafted 2026-05-11 as Sprint 5 / G1.
> Backed by the design rationale in [OPEN_ISSUES.md §3 Track G](./OPEN_ISSUES.md#track-g-vocab-擴充140--10000以英文為準).

## Goal

Build a single English-anchored frequency master list of ≈10,000
concept candidates. The list seeds:

1. The new concept schema (G3) — one row per English headword with
   frequency rank, CEFR hint, and source attribution.
2. The visual strategy (G2) — frequency drives whether a concept gets
   L1 emoji, L2 Lucide icon, or L3 photo.
3. The deck restructure (G5) — decks emerge from frequency bands + topic
   tags rather than handcrafted lists.

## License Constraint

Polyglyph is positioned as a free, offline-friendly learning tool. Any
upstream list must allow redistribution of the *list itself*, not only
of derived works. The candidates below all satisfy that requirement.

Lists explicitly **excluded** despite popularity:

| List | Why excluded |
|---|---|
| Oxford 3000 / 5000 | Copyrighted; reference only |
| Cambridge Vocabulary in Use | Copyrighted |
| Cambridge English Profile | Free to view, but licensing prohibits bulk distribution |
| Top-K subsets of proprietary corpora (BNC, COCA paid splits) | Source corpora are licensed; only public-domain extracts are usable |

## Approved Sources

### Primary — NGSL family (CC BY-SA 4.0)

The **New General Service List** family by Browne/Culligan/Phillips.
All four lists are released CC BY-SA 4.0 and are the closest thing we
have to a vetted, free, modern frequency list aligned to CEFR.

| List | Words | Coverage | Use for |
|---|---|---|---|
| **NGSL** | 2,801 | ~92% of running text in general English | Backbone A1–B1 |
| **NAWL** | 963 | Academic supplement to NGSL | B1–B2 academic register |
| **TSL** (TOEIC) | 1,200 | Business / workplace | B1–B2 work vocab |
| **BSL** (Business) | 1,700 | Broader business register | B2 supplement |

Combined coverage after dedupe: ≈ 5,500 distinct headwords. Enough
to fill A1 through B1 with room for B2 academic and business strands.

Citation requirements:
- Attribute "Browne, Culligan, and Phillips" on the Sources page in-app
- Mention CC BY-SA 4.0
- Distribute derivatives under the same license

### Secondary — COCA & Wikipedia open snapshots

To push past ≈5,500 toward 10,000 we need general-purpose long-tail
coverage. Acceptable options:

1. **Davies' COCA 5K free list** — top 5,000 lemmas, released free
   under attribution (no SA constraint). Useful for cross-validation
   against NGSL.
2. **Wikipedia / Wiktionary frequency dumps** — public domain;
   downloadable via the Wiktionary frequency-lists project (`enwiki`
   word lists). Noisier than COCA but free of license drag.
3. **OpenSubtitles 2018 unigram frequency** — released under CC BY-SA
   for derivatives. Good for conversational register coverage; many
   high-frequency colloquial words missing from formal corpora.

### Tertiary — CEFR alignment

To assign a CEFR level to each entry we cross-reference:

- **Cambridge English Profile** (read-only; not bundled but used for
  manual band assignment of ambiguous entries)
- **EVP (English Vocabulary Profile) extracts** that have been
  re-released as CC0 (see English Profile's public sample data)

These are reference-only; no raw rows are shipped.

## Pipeline (executed in G4)

```
sources/
├── ngsl_2_8k.csv        # primary
├── nawl_963.csv         # academic supplement
├── tsl_1_2k.csv         # toeic / business
├── bsl_1_7k.csv         # broader business
├── coca_5k.csv          # general long-tail
└── opensubs_unigrams.csv  # conversational

scripts/
├── import-frequency-list.ts
│   • read each CSV, dedupe by lemma
│   • merge frequency ranks (lowest rank wins when overlapping)
│   • emit concept stubs into data/sources/<list>.json
└── categorize-concepts.ts
    • LLM-assisted POS tagging and abstract/concrete split
    • output goes into the new schema fields (G3)
```

## CEFR Banding Strategy

```
A1   ranks 1–500       (core daily, ~500)
A2   ranks 501–1500    (basic conversation, ~1000)
B1   ranks 1501–3500   (general fluency, ~2000)
B2   ranks 3501–6500   (advanced + register-specific, ~3000)
C1   ranks 6501–10000  (literary / academic long tail, ~3500)
```

Ranks come from the merged NGSL+COCA priority. NAWL / BSL / TSL ranks
override the band when those specialty lists are explicitly invoked
(e.g. business deck for B2).

## Open Questions

These are the decisions still owed before G4 can run:

1. **Inflected forms** — keep `run / runs / ran / running` as one
   concept or four? Recommendation: one concept per lemma with a
   `forms[]` field; the typing target picks one form by deck context.
2. **Multi-word entries** — `give up`, `take care of`. Keep as concept
   only if frequency rank is high (top 3000); otherwise drop.
3. **Proper nouns** — exclude entirely (London, Tom). Proper nouns
   belong in scenario blueprints, not the vocab spine.
4. **Function words** — `the`, `of`, `and`. Include in the rank but
   route them to **L3 photo / text-only cards** per G2; don't try to
   illustrate.

Each of the above will be decided when G3 (schema) is finalized.