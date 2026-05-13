/**
 * TranslationStrip — a small muted hint line rendered beneath a chat
 * bubble. Surfaces the native-language version of a turn for learners
 * who want a crutch while practicing. Stays outside the bubble so the
 * existing typewriter animation and bubble styling are untouched.
 *
 * Empty / whitespace text returns null so callers can pass through
 * whatever they have without guarding.
 */

interface TranslationStripProps {
  text: string;
  side: "left" | "right";
}

export function TranslationStrip({ text, side }: TranslationStripProps) {
  if (text.trim().length === 0) return null;
  const alignment = side === "right" ? "self-end text-right" : "self-start text-left";
  return (
    <p
      data-testid="translation-strip"
      data-side={side}
      className={`max-w-[78%] px-1 text-sm leading-snug text-fg-muted ${alignment}`}
    >
      {text}
    </p>
  );
}
