# Convert source material into a Polyglyph typing-practice dialogue

You are turning a piece of source text (article, transcript, conversation
notes, anything) into a JSON dialogue script for an English typing-practice
app called Polyglyph.

## Hard rules

1. **Output ONLY a single JSON object** matching the schema below. No
   preamble, no closing remarks, no markdown fences. The first character of
   your reply MUST be `{` and the last MUST be `}`.

2. **ASCII-only typography** in every `text` field:
   - Use `-` (U+002D), never `—` (em dash) or `–` (en dash).
   - Use straight quotes `'` and `"`, never curly `’ ‘ “ ”`.
   - Use `...` (three dots) instead of `…` (ellipsis char).
   - These get auto-corrected by the engine but cleaner ASCII = nicer to type.

3. **Alternate speakers**, starting with `bot`. Aim for **8–14 turns**.
   Player turns must each have **exactly 1 template** (no branching).

4. **Every player turn** has a `hint_zh` in 繁體中文 (Traditional Chinese).
   Translate naturally — match the casual / formal register of the English.

5. **Vocabulary fits the target level**:
   - **A1**: present simple, ~500 most common words, 1-clause sentences
   - **A2**: simple past, conjunctions, common idioms, casual phrasings
   - **B1**: relative clauses, modal verbs, casual workplace / travel vocab
   - **B2**: complex tenses, subjunctive, professional / abstract vocab
   - **C1**: nuanced register, idiomatic expressions, hedging language

6. **Length per line**: keep player lines **≤ 120 characters**. Long lines
   are tedious to type and break flow.

7. **IDs**: use `t1, t2, t3, ...` sequentially. Templates inside a player
   turn use `<turnId>.0` (e.g. `t2.0`).

8. **Bot persona**: voice the bot consistently as a single character
   matching the topic (barista, interviewer, doctor, etc.).

## Schema (exact shape — extra fields are stripped)

```json
{
  "schema_version": 1,
  "id": "user.<topic>.<level>",
  "language": "en",
  "level": "A1" | "A2" | "B1" | "B2" | "C1",
  "topic": "<short slug>",
  "title": "<human-readable title>",
  "description": "<one-sentence summary>",
  "estimated_minutes": 3,
  "tags": ["..."],
  "characters": {
    "bot":    { "name": "<bot persona name>" },
    "player": { "name": "You" }
  },
  "turns": [
    { "id": "t1", "speaker": "bot",    "text": "..." },
    {
      "id": "t2",
      "speaker": "player",
      "templates": [
        { "id": "t2.0", "text": "...", "hint_zh": "..." }
      ]
    }
    // ... alternate, 8-14 total
  ]
}
```

## Inputs (fill in before sending)

- **Target level**: {{LEVEL}}
- **Bot persona name**: {{BOT_NAME}}
- **Topic slug**: {{TOPIC}}
- **Title**: {{TITLE}}
- **Source material** (article / transcript / notes — extract a natural
  conversation from this, don't just copy):

```
{{SOURCE}}
```

## Quality checklist before you output

- [ ] Strict JSON, ASCII-only typography
- [ ] 8-14 turns, alternating bot/player, starts with bot
- [ ] Every player turn has exactly 1 template with `hint_zh`
- [ ] Player lines ≤ 120 chars
- [ ] Vocabulary matches target level
- [ ] Bot voice is consistent across turns

Output the JSON now.
