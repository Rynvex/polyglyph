/**
 * DialogueProgress — slim bar under the sticky header showing dialogue
 * progress.
 */

interface DialogueProgressProps {
  current: number;
  total: number;
}

export function DialogueProgress({ current, total }: DialogueProgressProps) {
  const ratio = total <= 0 ? 0 : Math.min(1, Math.max(0, current / total));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-0.5 w-full bg-border"
      data-testid="dialogue-progress"
    >
      <div
        className="h-full bg-success transition-all duration-300 ease-out"
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
