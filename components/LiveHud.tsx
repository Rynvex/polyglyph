/**
 * LiveHud — real-time WPM / accuracy / combo readout shown above the
 * typing panel.
 */

import {
  elapsedSec,
  type DialogueController,
} from "@/lib/dialogue/controller";
import { accuracy as statsAccuracy, wpm as statsWpm, type Stats } from "@/lib/typing/stats";

interface LiveHudProps {
  controller: DialogueController;
}

function combine(total: Stats, session?: Stats | null): Stats {
  if (!session) return total;
  return {
    charsCorrect: total.charsCorrect + session.charsCorrect,
    charsWrong: total.charsWrong + session.charsWrong,
    combo: session.combo,
    maxCombo: Math.max(total.maxCombo, session.maxCombo),
    elapsedSec: total.elapsedSec + session.elapsedSec,
  };
}

export function LiveHud({ controller }: LiveHudProps) {
  const live = combine(controller.totalStats, controller.currentSession?.stats);
  const elapsed = elapsedSec(controller);
  const wpmValue = Math.round(statsWpm({ ...live, elapsedSec: elapsed }));
  const accValue = Math.round(statsAccuracy(live) * 100);
  const comboValue = live.combo;

  return (
    <div
      data-testid="live-hud"
      className="flex items-center justify-end gap-4 text-xs tabular-nums text-fg-faint"
    >
      <span>
        <span className="text-fg-muted">WPM</span>{" "}
        <span data-testid="hud-wpm" className="font-semibold text-fg">
          {wpmValue}
        </span>
      </span>
      <span className="text-border-strong">·</span>
      <span>
        <span className="text-fg-muted">Acc</span>{" "}
        <span data-testid="hud-acc" className="font-semibold text-fg">
          {accValue}%
        </span>
      </span>
      {comboValue >= 3 ? (
        <>
          <span className="text-border-strong">·</span>
          <span data-testid="hud-combo" className="font-semibold text-warning">
            ×{comboValue}
          </span>
        </>
      ) : null}
    </div>
  );
}
