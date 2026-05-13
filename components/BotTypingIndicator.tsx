/**
 * BotTypingIndicator — the LINE-style "Barista is typing..." row.
 */

interface BotTypingIndicatorProps {
  speakerName?: string;
}

function avatarInitial(name?: string): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function BotTypingIndicator({ speakerName }: BotTypingIndicatorProps) {
  return (
    <div data-testid="typing-row" data-speaker="bot" className="flex items-end gap-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-avatar text-base font-medium text-avatar-fg ring-1 ring-border-strong">
        {avatarInitial(speakerName)}
      </div>
      <div className="flex flex-col gap-1">
        {speakerName ? (
          <span className="px-1 text-sm text-fg-muted">{speakerName}</span>
        ) : null}
        <div className="rounded-2xl rounded-bl-md bg-bubble-bot px-4 py-3 ring-1 ring-border">
          <span data-testid="typing-dots" className="flex items-center gap-1">
            <span
              className="block h-2 w-2 animate-bounce rounded-full bg-fg-faint"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="block h-2 w-2 animate-bounce rounded-full bg-fg-faint"
              style={{ animationDelay: "120ms" }}
            />
            <span
              className="block h-2 w-2 animate-bounce rounded-full bg-fg-faint"
              style={{ animationDelay: "240ms" }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
