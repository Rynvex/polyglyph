/**
 * DialogueController — pure dialogue traversal with TypingSession lifecycle.
 *
 * Linear walk through `dialogue.turns`. Bot turns auto-emit into
 * `spokenBotTurns`. The first player turn opens a TypingSession on its
 * `templates[0]`. Typing never auto-advances; the user must explicitly
 * `commit` (Enter in the UI) once the line is filled. On commit the just-
 * finished session is folded into `totalStats` AND retained in
 * `completedPlayerTurns` (with cells) so the settlement screen can show a
 * per-turn review of what the user actually typed.
 */

import type { Dialogue, Template, Turn } from "@/lib/data/schema";
import type { CheckpointSnapshot } from "@/lib/progress/storage";
import {
  backspace as engineBackspace,
  CharState,
  createSession,
  inputChar,
  flushSession,
  isFilled,
  type CharCell,
  type TypingSession,
} from "@/lib/typing/engine";
import type { InputMethod } from "@/lib/typing/ime/types";
import { createStats, type Stats } from "@/lib/typing/stats";

export interface CompletedPlayerTurn {
  readonly turn: Turn;
  readonly template: Template;
  readonly cells: readonly CharCell[];
}

export interface DialogueController {
  readonly dialogue: Dialogue;
  readonly ime: InputMethod;
  readonly turnIdx: number;
  readonly currentSession: TypingSession | null;
  readonly spokenBotTurns: readonly Turn[];
  readonly completedPlayerTurns: readonly CompletedPlayerTurn[];
  readonly isFinished: boolean;
  readonly totalStats: Stats;
  readonly startedAtMs: number;
}

export function createController(dialogue: Dialogue, ime: InputMethod): DialogueController {
  const seed: DialogueController = {
    dialogue,
    ime,
    turnIdx: 0,
    currentSession: null,
    spokenBotTurns: [],
    completedPlayerTurns: [],
    isFinished: false,
    totalStats: createStats(),
    startedAtMs: Date.now(),
  };
  return advance(seed);
}

export function elapsedSec(c: DialogueController): number {
  return (Date.now() - c.startedAtMs) / 1000;
}

export function submitInput(c: DialogueController, raw: string): DialogueController {
  if (c.currentSession === null) return c;
  return { ...c, currentSession: inputChar(c.currentSession, raw) };
}

export function commitController(c: DialogueController): DialogueController {
  if (c.currentSession === null) return c;
  // Drain any IME composition buffer first (e.g. Korean's trailing
  // syllable, Japanese trailing ん). The IME may have been holding
  // chars waiting for more input that won't come.
  const drained = flushSession(c.currentSession);
  if (!isFilled(drained)) {
    // Preserve referential identity when nothing actually drained
    // (DirectIME / empty buffer) — existing tests rely on no-op commit
    // returning the same object.
    if (drained === c.currentSession) return c;
    return { ...c, currentSession: drained };
  }
  const turn = c.dialogue.turns[c.turnIdx];
  const template = (turn.templates ?? [])[0];
  const completed: CompletedPlayerTurn[] = [
    ...c.completedPlayerTurns,
    {
      turn,
      template,
      cells: [...drained.cells], // freeze a copy for review
    },
  ];
  const folded = foldStats(c.totalStats, drained.stats);
  return advance({
    ...c,
    currentSession: null,
    completedPlayerTurns: completed,
    turnIdx: c.turnIdx + 1,
    totalStats: folded,
  });
}

export function backspaceController(c: DialogueController): DialogueController {
  if (c.currentSession === null) return c;
  return { ...c, currentSession: engineBackspace(c.currentSession) };
}

/**
 * Reset the current session to a pristine state without committing — wipes
 * any wrong cells and the cursor so the user can re-attempt the line. Stats
 * already collected for this session are discarded; nothing is folded into
 * totalStats. No-op when there's no active session.
 */
export function resetLine(c: DialogueController): DialogueController {
  if (c.currentSession === null) return c;
  return {
    ...c,
    currentSession: createSession(c.currentSession.target, c.ime),
  };
}

export function snapshotController(
  c: DialogueController,
  scriptId: string,
): CheckpointSnapshot {
  return {
    scriptId,
    turnIdx: c.turnIdx,
    spokenBotTurnIds: c.spokenBotTurns.map((t) => t.id),
    completedPlayerTurnIds: c.completedPlayerTurns.map(
      ({ turn, template }) => [turn.id, template.id] as [string, string],
    ),
    savedAtMs: Date.now(),
  };
}

export function restoreController(
  dialogue: Dialogue,
  ime: InputMethod,
  snapshot: CheckpointSnapshot,
): DialogueController {
  const byId = new Map(dialogue.turns.map((t) => [t.id, t] as const));
  const spoken: Turn[] = [];
  for (const id of snapshot.spokenBotTurnIds) {
    const turn = byId.get(id);
    if (!turn || turn.speaker !== "bot") return createController(dialogue, ime);
    spoken.push(turn);
  }

  const completed: CompletedPlayerTurn[] = [];
  let foldedStats = createStats();
  for (const [turnId, templateId] of snapshot.completedPlayerTurnIds) {
    const turn = byId.get(turnId);
    if (!turn || turn.speaker !== "player") return createController(dialogue, ime);
    const template = (turn.templates ?? []).find((t) => t.id === templateId);
    if (!template) return createController(dialogue, ime);
    completed.push({
      turn,
      template,
      cells: cellsFromTarget(template.text), // synthetic perfect cells
    });
    foldedStats = foldStats(foldedStats, sessionStatsFromTarget(template.text));
  }

  const expectedIdx =
    snapshot.spokenBotTurnIds.length + snapshot.completedPlayerTurnIds.length;
  if (snapshot.turnIdx !== expectedIdx) return createController(dialogue, ime);

  const seed: DialogueController = {
    dialogue,
    ime,
    turnIdx: snapshot.turnIdx,
    currentSession: null,
    spokenBotTurns: spoken,
    completedPlayerTurns: completed,
    isFinished: false,
    totalStats: foldedStats,
    startedAtMs: Date.now(),
  };
  return advance(seed);
}

/**
 * Synthesize "perfect" cells for a target string. Used by restoreController
 * because we don't persist per-cell state across reload — the kindest
 * fallback for the player is to assume past lines were perfect.
 */
function cellsFromTarget(target: string): CharCell[] {
  const cells: CharCell[] = [];
  for (const ch of target) {
    cells.push({ target: ch, state: CharState.Correct, typed: ch });
  }
  return cells;
}

function sessionStatsFromTarget(target: string): Stats {
  const len = [...target].length;
  return {
    charsCorrect: len,
    charsWrong: 0,
    combo: 0,
    maxCombo: len,
    elapsedSec: 0,
  };
}

function foldStats(total: Stats, sessionStats: Stats): Stats {
  return {
    charsCorrect: total.charsCorrect + sessionStats.charsCorrect,
    charsWrong: total.charsWrong + sessionStats.charsWrong,
    combo: 0,
    maxCombo: Math.max(total.maxCombo, sessionStats.maxCombo),
    elapsedSec: total.elapsedSec + sessionStats.elapsedSec,
  };
}

function advance(c: DialogueController): DialogueController {
  let idx = c.turnIdx;
  const spoken = [...c.spokenBotTurns];
  while (idx < c.dialogue.turns.length) {
    const turn = c.dialogue.turns[idx];
    if (turn.speaker === "bot") {
      spoken.push(turn);
      idx += 1;
      continue;
    }
    const template = (turn.templates ?? [])[0];
    return {
      ...c,
      turnIdx: idx,
      currentSession: createSession(template.text, c.ime),
      spokenBotTurns: spoken,
      isFinished: false,
    };
  }
  return {
    ...c,
    turnIdx: idx,
    currentSession: null,
    spokenBotTurns: spoken,
    isFinished: true,
  };
}
