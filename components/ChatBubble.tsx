/**
 * ChatBubble — LINE-style chat row.
 *
 * Bot row: avatar + name + bubble on the left, text streams in via
 * TypewriterText. Player row: bubble on the right, instant text. Colors
 * route through theme tokens so light/dark switch flips everything.
 *
 * Optional `translationText` renders a small native-language strip
 * directly beneath the bubble for learners who opted in. The strip lives
 * outside the bubble so styles and the typewriter animation stay
 * untouched.
 */

import { TranslationStrip } from "@/components/TranslationStrip";
import { TypewriterText } from "@/components/TypewriterText";
import type { Speaker } from "@/lib/data/schema";

interface ChatBubbleProps {
  speaker: Speaker;
  text: string;
  speakerName?: string;
  skipTyping?: boolean;
  skipSignal?: number;
  /** Native-language version of `text`. Omit / empty to hide. */
  translationText?: string;
  /**
   * Forwarded to the bot bubble's typewriter. Fires when the message is
   * fully on screen so the parent can release UI that was waiting on the
   * bot to finish "speaking".
   */
  onTypewriterComplete?: () => void;
}

function avatarInitial(name?: string): string {
  if (!name) return "?";
  const ch = name.trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

export function ChatBubble({
  speaker,
  text,
  speakerName,
  skipTyping,
  skipSignal,
  translationText,
  onTypewriterComplete,
}: ChatBubbleProps) {
  const isPlayer = speaker === "player";

  if (isPlayer) {
    return (
      <div data-testid="chat-row" data-speaker="player" className="flex flex-col items-end gap-1">
        <div className="max-w-[78%] rounded-2xl rounded-br-md bg-bubble-player px-5 py-3 text-lg leading-relaxed text-bubble-player-fg shadow-sm">
          {text}
        </div>
        {translationText ? (
          <TranslationStrip text={translationText} side="right" />
        ) : null}
      </div>
    );
  }

  return (
    <div data-testid="chat-row" data-speaker="bot" className="flex items-end gap-2">
      <div
        data-testid="avatar"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-avatar text-base font-medium text-avatar-fg ring-1 ring-border-strong"
      >
        {avatarInitial(speakerName)}
      </div>
      <div className="flex max-w-[78%] flex-col gap-1">
        {speakerName ? (
          <span className="px-1 text-sm text-fg-muted">{speakerName}</span>
        ) : null}
        <div className="rounded-2xl rounded-bl-md bg-bubble-bot px-5 py-3 text-lg leading-relaxed text-bubble-bot-fg shadow-sm ring-1 ring-border">
          <TypewriterText
            text={text}
            instant={skipTyping}
            skipSignal={skipSignal}
            onComplete={onTypewriterComplete}
          />
        </div>
        {translationText ? (
          <TranslationStrip text={translationText} side="left" />
        ) : null}
      </div>
    </div>
  );
}
