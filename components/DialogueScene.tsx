/**
 * DialogueScene — top-level interactive view, owns the play-page layout.
 *
 * Sticky-bottom layout (LINE/iMessage style):
 *   ┌─ Progress bar
 *   ├─ flex-1 overflow-y-auto  ← chat thread scrolls inside this region
 *   │     bubbles, indicator, bottom anchor
 *   └─ sticky bottom panel     ← typing area always visible at bottom
 *         CapsLock banner, LiveHud, TypingPanel
 *
 * Owns keyboard routing (Enter/Backspace/Esc/Alt+R + chars) plus auto-
 * scroll + checkpoint persistence side effects.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BotTypingIndicator } from "@/components/BotTypingIndicator";
import { CapsLockWarning } from "@/components/CapsLockWarning";
import { ChatBubble } from "@/components/ChatBubble";
import { DialogueProgress } from "@/components/DialogueProgress";
import { DialogueSummary } from "@/components/DialogueSummary";
import { LiveHud } from "@/components/LiveHud";
import { ResumeBanner } from "@/components/ResumeBanner";
import { TypingPanel } from "@/components/TypingPanel";
import type { Dialogue, Template, Turn } from "@/lib/data/schema";
import {
  backspaceController,
  commitController,
  createController,
  elapsedSec,
  resetLine,
  restoreController,
  snapshotController,
  submitInput,
  type DialogueController,
} from "@/lib/dialogue/controller";
import { createImeForLanguage } from "@/lib/typing/ime/factory";
import { pickHint } from "@/lib/data/dialogues/hints";
import { attachNativeText } from "@/lib/data/dialogues/compose";
import { TranslationSchema } from "@/lib/data/dialogues/schema";
import { loadNativeLang } from "@/lib/data/lang-prefs";
import {
  DEFAULT_TRANSLATION_PREFS,
  TRANSLATION_PREFS_EVENT,
  loadTranslationPrefs,
  type TranslationPrefs,
} from "@/lib/data/translation-prefs";
import {
  clearCheckpoint,
  loadCheckpoint,
  saveCheckpoint,
  saveResult,
} from "@/lib/progress/storage";
import { accuracy as statsAccuracy, wpm as statsWpm } from "@/lib/typing/stats";

interface DialogueSceneProps {
  dialogue: Dialogue;
  scriptId: string;
  /** Where to send the user when they hit Esc / Q / leave. */
  onExit?: () => void;
  /** Optional next-script suggestion for the settlement screen. */
  nextScriptId?: string | null;
  /** Called when the user picks "Next script" (button or N shortcut). */
  onNavigateToNext?: (scriptId: string) => void;
}

type HistoryItem =
  | { kind: "bot"; turn: Turn }
  | { kind: "player"; turn: Turn; template: Template };

const BOT_REVEAL_DELAY_MS = 600;

function buildHistory(
  controller: DialogueController,
  revealedBotCount: number,
): HistoryItem[] {
  const items: HistoryItem[] = [];
  let botSeen = 0;
  for (let i = 0; i < controller.turnIdx; i++) {
    const turn = controller.dialogue.turns[i];
    if (turn.speaker === "bot") {
      if (botSeen < revealedBotCount) {
        items.push({ kind: "bot", turn });
        botSeen += 1;
      }
      continue;
    }
    const completed = controller.completedPlayerTurns.find(
      (e) => e.turn.id === turn.id,
    );
    if (completed) {
      items.push({ kind: "player", turn, template: completed.template });
    }
  }
  return items;
}

/**
 * Returns true unless the user has actively scrolled up far from the bottom.
 * Used as a soft "follow the conversation" gate so we don't fight users who
 * are scrolling back to re-read; everything else (new bubble, new turn,
 * keystroke) snaps to the bottom.
 */
function isFollowingBottom(container: HTMLElement | null): boolean {
  if (!container) return true;
  // Generous buffer so layout shifts (typing panel resize, font reflow)
  // don't accidentally trip the "user scrolled up" branch.
  const SOFT_BUFFER = 400;
  return (
    container.scrollTop + container.clientHeight >=
    container.scrollHeight - SOFT_BUFFER
  );
}

export function DialogueScene({
  dialogue,
  scriptId,
  onExit,
  nextScriptId,
  onNavigateToNext,
}: DialogueSceneProps) {
  const ime = useMemo(
    () => createImeForLanguage(dialogue.language),
    [dialogue.language],
  );
  // Initialize to dialogue.language so the first render does not race a
  // fetch against a stale default. The mount effect overwrites with the
  // user's actual nativeLang from localStorage; identical values
  // short-circuit the network entirely.
  const [nativeLang, setNativeLang] = useState<string>(dialogue.language);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNativeLang(loadNativeLang());
  }, []);

  // Translation strip prefs (defaults: both off). Re-read on every
  // TRANSLATION_PREFS_EVENT so the global footer's toggles flip strips
  // on/off in-place without a remount or page reload.
  const [translationPrefs, setTranslationPrefs] = useState<TranslationPrefs>(
    DEFAULT_TRANSLATION_PREFS,
  );
  useEffect(() => {
    setTranslationPrefs(loadTranslationPrefs());
    const onChange = () => setTranslationPrefs(loadTranslationPrefs());
    window.addEventListener(TRANSLATION_PREFS_EVENT, onChange);
    return () => window.removeEventListener(TRANSLATION_PREFS_EVENT, onChange);
  }, []);

  // Lazy-loaded native translation file. We only fetch when nativeLang
  // differs from dialogue.language; same-lang short-circuits to keep the
  // network quiet for monolingual users. AbortController guards against
  // out-of-order responses when nativeLang flips quickly.
  const [nativeOverlay, setNativeOverlay] = useState<unknown | null>(null);
  useEffect(() => {
    if (nativeLang === dialogue.language) {
      setNativeOverlay(null);
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `/dialogues/translations/${scriptId}/${nativeLang}.json`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const payload = await res.json();
        const parsed = TranslationSchema.safeParse(payload);
        if (parsed.success) setNativeOverlay(parsed.data);
      } catch {
        // Network errors / aborts → leave overlay empty, strip stays
        // hidden, no user-facing crash.
      }
    })();
    return () => controller.abort();
  }, [scriptId, nativeLang, dialogue.language]);

  const enrichedDialogue = useMemo(() => {
    if (!nativeOverlay) return dialogue;
    const parsed = TranslationSchema.safeParse(nativeOverlay);
    if (!parsed.success) return dialogue;
    return attachNativeText(dialogue, parsed.data);
  }, [dialogue, nativeOverlay]);

  // turn-id → enrichedTurn lookup; the controller works on the original
  // dialogue (no nativeText), so history items reference plain Turns and
  // we use this map to fetch the native overlay for the bubble.
  const enrichedTurnById = useMemo(() => {
    const m = new Map<string, Turn>();
    for (const t of enrichedDialogue.turns) m.set(t.id, t);
    return m;
  }, [enrichedDialogue]);
  const [controller, setController] = useState<DialogueController>(() =>
    createController(dialogue, ime),
  );
  const [revealedBotCount, setRevealedBotCount] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [resumedTurn, setResumedTurn] = useState<number | null>(null);
  const [capsLockOn, setCapsLockOn] = useState(false);
  // Bumped on every player keystroke so any in-flight typewriter
  // animation in old bot bubbles fast-forwards instead of holding the
  // user back.
  const [skipSignal, setSkipSignal] = useState(0);
  // Set of bot turn IDs whose typewriter has finished. We use it to gate
  // the input panel: it stays hidden until the latest revealed turn's
  // ID is in this set. Tracked as IDs (not a "isComplete" boolean) so
  // the natural-drip path and the user-skip path don't race each other —
  // both produce idempotent set-membership signals.
  const [completedBotTurnIds, setCompletedBotTurnIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  // Soft landing on the end of a dialogue: when isFinished and all bots
  // have spoken, we show an "end card" first (instead of jumping to the
  // settlement). Any key acknowledges it and reveals the summary.
  const [acknowledgedEnd, setAcknowledgedEnd] = useState(false);
  const savedFinishedRef = useRef(false);

  const markBotTurnComplete = useCallback((turnId: string) => {
    setCompletedBotTurnIds((prev) => {
      if (prev.has(turnId)) return prev;
      const next = new Set(prev);
      next.add(turnId);
      return next;
    });
  }, []);

  // On first mount, if a checkpoint exists for this script, replay it.
  useEffect(() => {
    const cp = loadCheckpoint(scriptId);
    if (!cp) return;
    const restored = restoreController(dialogue, ime, cp);
    if (
      restored.completedPlayerTurns.length === 0 &&
      restored.spokenBotTurns.length === 0
    ) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setController(restored);

    setRevealedBotCount(restored.spokenBotTurns.length);
    // Restored bubbles render with skipTyping → they fire onComplete on
    // mount. Pre-fill anyway so the typing panel doesn't briefly hide
    // during the first render of the restored history.
    setCompletedBotTurnIds(new Set(restored.spokenBotTurns.map((t) => t.id)));

    setResumedTurn(restored.completedPlayerTurns.length + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ref = useRef(controller);
  useEffect(() => {
    ref.current = controller;
  }, [controller]);

  // Persist checkpoint at turn boundaries (not per keystroke).
  useEffect(() => {
    if (controller.isFinished) {
      if (!savedFinishedRef.current) {
        savedFinishedRef.current = true;
        const duration = elapsedSec(controller);
        const totalForWpm = { ...controller.totalStats, elapsedSec: duration };
        const wpmRounded = Math.round(statsWpm(totalForWpm));
        const accuracyValue = statsAccuracy(controller.totalStats);
        const { isNewRecord: nr } = saveResult(scriptId, {
          wpm: wpmRounded,
          accuracy: accuracyValue,
          completedAtMs: Date.now(),
        });
        setIsNewRecord(nr);
        clearCheckpoint(scriptId);
      }
      return;
    }
    saveCheckpoint(scriptId, snapshotController(controller, scriptId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    controller.turnIdx,
    controller.completedPlayerTurns.length,
    controller.spokenBotTurns.length,
    controller.isFinished,
    scriptId,
  ]);

  // Drip-feed bot bubbles.
  useEffect(() => {
    const total = controller.spokenBotTurns.length;
    if (revealedBotCount >= total) return;
    const timer = setTimeout(() => {
      setRevealedBotCount((c) => Math.min(c + 1, total));
    }, BOT_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [controller.spokenBotTurns.length, revealedBotCount]);


  // Auto-scroll: ResizeObserver on the chat content. ANY height growth
  // (new bubble, typewriter char appearing, indicator showing/disappearing)
  // triggers a follow scroll. Smart-bottom gate uses a generous 400px
  // buffer so typing-panel reflow doesn't mis-classify the user as
  // "scrolled up".
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const chatInnerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const container = scrollContainerRef.current;
    const inner = chatInnerRef.current;
    if (!container || !inner) return;
    const observer = new ResizeObserver(() => {
      if (!isFollowingBottom(container)) return;
      requestAnimationFrame(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      });
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  const handlePlayAgain = useCallback(() => {
    clearCheckpoint(scriptId);
    setController(createController(dialogue, ime));
    setRevealedBotCount(0);
    setIsNewRecord(false);
    setResumedTurn(null);
    setCompletedBotTurnIds(new Set());
    setAcknowledgedEnd(false);
    savedFinishedRef.current = false;
  }, [dialogue, ime, scriptId]);

  const handleStartOver = useCallback(() => {
    clearCheckpoint(scriptId);
    setController(createController(dialogue, ime));
    setRevealedBotCount(0);
    setResumedTurn(null);
    setCompletedBotTurnIds(new Set());
    setAcknowledgedEnd(false);
  }, [dialogue, ime, scriptId]);

  // --- derived state (kept above the keyboard effect so the effect's
  // dep array can reference them without hitting the TDZ) ---
  const showIndicator =
    !controller.isFinished && revealedBotCount < controller.spokenBotTurns.length;
  const latestRevealedBotTurnId =
    revealedBotCount > 0
      ? (controller.spokenBotTurns[revealedBotCount - 1]?.id ?? null)
      : null;
  const botStillSpeaking =
    showIndicator ||
    (latestRevealedBotTurnId !== null &&
      !completedBotTurnIds.has(latestRevealedBotTurnId));
  const dialogueDone = controller.isFinished && !botStillSpeaking;
  const showEndCard = dialogueDone && !acknowledgedEnd;
  const showSummary = dialogueDone && acknowledgedEnd;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      setCapsLockOn(e.getModifierState("CapsLock"));

      // Esc always exits, on summary, end card, or in-play.
      if (e.key === "Escape") {
        e.preventDefault();
        onExit?.();
        return;
      }

      // End-card mode: dialogue is over but the user hasn't asked for
      // the settlement yet. Any non-Esc key advances.
      if (showEndCard) {
        e.preventDefault();
        setAcknowledgedEnd(true);
        return;
      }

      // Settlement-mode keyboard. No active typing session here, so single-
      // letter shortcuts are safe.
      if (showSummary) {
        if (e.key === "Enter" || e.key === "r" || e.key === "R") {
          e.preventDefault();
          handlePlayAgain();
          return;
        }
        if ((e.key === "n" || e.key === "N") && nextScriptId && onNavigateToNext) {
          e.preventDefault();
          onNavigateToNext(nextScriptId);
          return;
        }
        if (e.key === "q" || e.key === "Q") {
          e.preventDefault();
          onExit?.();
          return;
        }
        return; // swallow everything else on settlement
      }

      // In-play keys.
      if (e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        setController(resetLine(ref.current));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        setController(commitController(ref.current));
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        setController(backspaceController(ref.current));
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setRevealedBotCount((current) => {
          const total = ref.current.spokenBotTurns.length;
          return current < total ? total : current;
        });
        // The user is choosing to skip past any unfinished bot speech.
        // Mark every revealed bot turn as 'spoken' so the typing panel
        // becomes visible immediately, even on bubbles that mounted in
        // the same batch as the keystroke (TypewriterText's skipSignal
        // ref races with mount and would otherwise miss the fast-
        // forward signal).
        setCompletedBotTurnIds((prev) => {
          const next = new Set(prev);
          for (const t of ref.current.spokenBotTurns) next.add(t.id);
          return next;
        });
        setSkipSignal((s) => s + 1);
        setController(submitInput(ref.current, e.key));
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    onExit,
    showEndCard,
    showSummary,
    handlePlayAgain,
    nextScriptId,
    onNavigateToNext,
  ]);

  const botName = dialogue.characters?.bot?.name;
  const totalTurns = dialogue.turns.length;
  const currentPlayerTurn = controller.dialogue.turns[controller.turnIdx];
  // Look up the enriched copy of the current turn so `pickHint` sees the
  // `nativeText` overlay attached by attachNativeText(). Without this,
  // the hint falls back to legacy `hint_zh` regardless of nativeLang.
  // Same-lang pairs short-circuit the hint entirely — you don't need a
  // translation hint for a language you already read.
  const enrichedCurrentTemplate = enrichedTurnById
    .get(currentPlayerTurn?.id ?? "")
    ?.templates?.[0];
  const hint =
    controller.isFinished || nativeLang === dialogue.language
      ? undefined
      : pickHint(enrichedCurrentTemplate, nativeLang);
  // Show the native-script form (display field) above the romaji cells
  // so non-Latin learners can see what they're typing toward. Latin
  // languages leave display unset so the row is hidden.
  const displayTarget = controller.isFinished
    ? undefined
    : currentPlayerTurn?.templates?.[0]?.display;
  // Optional second-line hint: spaced romaji shown beneath displayTarget.
  // Used for ja where the typed `text` is intentionally space-free so
  // the player can see word boundaries while typing the continuous form.
  const displayRomaji = controller.isFinished
    ? undefined
    : currentPlayerTurn?.templates?.[0]?.display_romaji;
  // Inline furigana — when present, takes over the prompt area and
  // renders romaji floating above each native-script chunk via HTML
  // <ruby>. Supersedes displayTarget + displayRomaji.
  const displayFurigana = controller.isFinished
    ? undefined
    : currentPlayerTurn?.templates?.[0]?.display_furigana;
  const history = buildHistory(controller, revealedBotCount);

  if (showSummary) {
    const total = controller.totalStats;
    const duration = elapsedSec(controller);
    const totalForWpm = { ...total, elapsedSec: duration };
    return (
      <div className="flex-1 overflow-y-auto">
        <DialogueSummary
          title={dialogue.title}
          wpm={Math.round(statsWpm(totalForWpm))}
          accuracy={statsAccuracy(total)}
          durationSec={duration}
          maxCombo={total.maxCombo}
          charsTyped={total.charsCorrect + total.charsWrong}
          completedTurns={controller.completedPlayerTurns}
          nextScriptId={nextScriptId ?? null}
          nextScriptHref={
            nextScriptId
              ? `/play/${nextScriptId}?lang=${encodeURIComponent(dialogue.language)}`
              : null
          }
          isNewRecord={isNewRecord}
          onPlayAgain={handlePlayAgain}
        />
      </div>
    );
  }

  return (
    <>
      <DialogueProgress current={controller.turnIdx} total={totalTurns} />
      <div
        ref={scrollContainerRef}
        data-testid="chat-scroll"
        className="flex-1 overflow-y-auto"
      >
        <div
          ref={chatInnerRef}
          className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-6"
        >
          {resumedTurn !== null ? (
            <ResumeBanner
              resumedTurn={resumedTurn}
              totalTurns={totalTurns}
              onStartOver={handleStartOver}
            />
          ) : null}
          <div className="flex flex-col gap-3">
            {history.map((item, idx) => {
              if (item.kind === "bot") {
                const isLatestBot = idx === history.length - 1;
                // Skip the typewriter when this bubble is older than the
                // current frontier (history[length-1]) OR when this turn
                // was already heard in a previous session — restored
                // bubbles arrive with their IDs pre-seeded into
                // completedBotTurnIds, so checking the set lets new
                // post-resume bot turns animate while resumed history
                // stays instant.
                const alreadyHeard = completedBotTurnIds.has(item.turn.id);
                const botNative = translationPrefs.showNpcTranslation
                  ? enrichedTurnById.get(item.turn.id)?.nativeText
                  : undefined;
                return (
                  <ChatBubble
                    key={`bot-${item.turn.id}`}
                    speaker="bot"
                    text={item.turn.text ?? ""}
                    speakerName={botName}
                    skipTyping={idx < history.length - 1 || alreadyHeard}
                    skipSignal={skipSignal}
                    translationText={botNative}
                    // Only listen for completion on the latest bubble;
                    // historical ones already finished long ago.
                    onTypewriterComplete={
                      isLatestBot
                        ? () => markBotTurnComplete(item.turn.id)
                        : undefined
                    }
                  />
                );
              }
              const playerNative = translationPrefs.showPlayerTranslation
                ? enrichedTurnById
                    .get(item.turn.id)
                    ?.templates?.find((t) => t.id === item.template.id)
                    ?.nativeText
                : undefined;
              return (
                <ChatBubble
                  key={`p-${item.turn.id}`}
                  speaker="player"
                  // For non-Latin languages the player types a romanization
                  // (`text`) but the chat bubble should show the native
                  // script (`display`). Falls back to the typed text when
                  // no override is provided.
                  text={item.template.display ?? item.template.text}
                  translationText={playerNative}
                />
              );
            })}
            {showIndicator ? <BotTypingIndicator speakerName={botName} /> : null}
          </div>
        </div>
      </div>
      <div className="border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 py-3">
          <CapsLockWarning active={capsLockOn} />
          <LiveHud controller={controller} />
          {showEndCard ? (
            <div
              data-testid="dialogue-end-card"
              role="status"
              aria-live="polite"
              className="rounded-2xl bg-accent/10 px-6 py-5 text-center ring-1 ring-accent/30"
            >
              <p className="text-lg font-medium text-fg">
                Conversation complete
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                Press any key to see your stats →
              </p>
            </div>
          ) : controller.currentSession ? (
            <div
              data-testid="typing-panel-wrapper"
              aria-hidden={botStillSpeaking || undefined}
              className={
                botStillSpeaking ? "invisible pointer-events-none" : ""
              }
            >
              <TypingPanel
                session={controller.currentSession}
                hintZh={hint}
                displayTarget={displayTarget}
                displayRomaji={displayRomaji}
                displayFurigana={displayFurigana}
              />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
