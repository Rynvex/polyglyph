/**
 * Builds the prompt sent to whichever LLM the user picks.
 *
 * The prompt template lives at `prompts/dialogue-from-source.md`; we
 * inline it here so the bundle ships without needing to fetch a markdown
 * file at runtime.
 */

export interface PromptInputs {
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  botName: string;
  topic: string;
  title: string;
  source: string;
}

const TEMPLATE = `You are turning a piece of source text (article, transcript, conversation
notes, anything) into a JSON dialogue script for an English typing-practice
app called Polyglyph.

# Hard rules

1. Output ONLY a single JSON object matching the schema below. No preamble,
   no closing remarks, no markdown fences. Your reply must START with \`{\`
   and END with \`}\`.

2. ASCII-only typography in every \`text\` field:
   - Use \`-\` (hyphen), never em dash or en dash.
   - Use straight quotes \`'\` and \`"\`, never curly quotes.
   - Use \`...\` instead of the ellipsis character.

3. Alternate speakers, starting with bot. Aim for 8-14 turns.
   Player turns must each have exactly 1 template (no branching for v0.1).

4. Every player turn has a \`hint_zh\` in 繁體中文 (Traditional Chinese).
   Translate naturally — match the casual / formal register of the English.

5. Vocabulary fits the target level:
   - A1: present simple, ~500 most common words, 1-clause sentences
   - A2: simple past, conjunctions, common idioms, casual phrasings
   - B1: relative clauses, modal verbs, casual workplace / travel vocab
   - B2: complex tenses, subjunctive, professional / abstract vocab
   - C1: nuanced register, idiomatic expressions, hedging language

6. Length per line: keep player lines <= 120 characters.

7. IDs: use t1, t2, t3, ... sequentially. Templates inside a player turn
   use <turnId>.0 (e.g. t2.0).

8. Bot persona: voice the bot consistently as a single character.

# Schema

\`\`\`json
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
    { "id": "t1", "speaker": "bot", "text": "..." },
    {
      "id": "t2",
      "speaker": "player",
      "templates": [{ "id": "t2.0", "text": "...", "hint_zh": "..." }]
    }
  ]
}
\`\`\`

# Inputs

- Target level: {{LEVEL}}
- Bot persona name: {{BOT_NAME}}
- Topic slug: {{TOPIC}}
- Title: {{TITLE}}
- Source material:

\`\`\`
{{SOURCE}}
\`\`\`

Output the JSON now.`;

export function buildPrompt(inputs: PromptInputs): string {
  return TEMPLATE.replaceAll("{{LEVEL}}", inputs.level)
    .replaceAll("{{BOT_NAME}}", inputs.botName)
    .replaceAll("{{TOPIC}}", inputs.topic)
    .replaceAll("{{TITLE}}", inputs.title)
    .replaceAll("{{SOURCE}}", inputs.source);
}
