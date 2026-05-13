/**
 * ResumeBanner — appears at the top of a play page when DialogueScene
 * loaded a checkpoint mid-mount.
 */

interface ResumeBannerProps {
  resumedTurn: number;
  totalTurns: number;
  onStartOver: () => void;
}

export function ResumeBanner({ resumedTurn, totalTurns, onStartOver }: ResumeBannerProps) {
  return (
    <div
      data-testid="resume-banner"
      className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-lg bg-warning/10 px-4 py-2 text-sm text-warning ring-1 ring-warning/30"
    >
      <span>
        Resumed at turn {resumedTurn} / {totalTurns}.
      </span>
      <button
        type="button"
        onClick={onStartOver}
        className="rounded-md bg-warning/20 px-3 py-1 text-xs font-medium text-fg transition hover:bg-warning/30"
      >
        ↻ Start over
      </button>
    </div>
  );
}
