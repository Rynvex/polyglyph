/**
 * VocabLanding — client island for /vocab. Owns the (native, target)
 * language pair UI: two pickers + a swap button, persisted via the
 * lang-prefs store. Each deck link carries the native language as a
 * query param so the play page can load both translation tables.
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Deck } from "@/lib/data/vocab/schema";
import {
  DEFAULT_NATIVE_LANG,
  DEFAULT_TARGET_LANG,
  loadNativeLang,
  loadTargetLang,
  saveTargetLang,
} from "@/lib/data/lang-prefs";

const LANG_LABEL: Record<string, string> = {
  en: "English",
  es: "Español",
  ja: "日本語",
  "zh-tw": "繁體中文",
  ko: "한국어",
  it: "Italiano",
  de: "Deutsch",
};

interface VocabLandingProps {
  decks: Deck[];
  languages: string[];
}

const LEVEL_BADGE: Record<string, string> = {
  A1: "bg-success/15 text-success",
  A2: "bg-accent/15 text-accent",
  B1: "bg-violet-500/15 text-violet-300",
  B2: "bg-warning/15 text-warning",
  C1: "bg-error/15 text-error",
};

type CefrFilter = "ALL" | "A1" | "A2" | "B1" | "B2" | "C1";
type DeckKindTab = "vocab" | "alphabet";

const VOCAB_TAB_KEY = "polyglyph:vocab-tab";

function loadStoredTab(): DeckKindTab {
  if (typeof window === "undefined") return "vocab";
  try {
    const raw = window.localStorage.getItem(VOCAB_TAB_KEY);
    return raw === "alphabet" ? "alphabet" : "vocab";
  } catch {
    return "vocab";
  }
}

export function VocabLanding({ decks, languages }: VocabLandingProps) {
  const [nativeLang, setNativeLang] = useState(DEFAULT_NATIVE_LANG);
  const [targetLang, setTargetLang] = useState(DEFAULT_TARGET_LANG);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [cefrFilter, setCefrFilter] = useState<CefrFilter>("ALL");
  const [kindTab, setKindTab] = useState<DeckKindTab>("vocab");

  useEffect(() => {
    const native = loadNativeLang();
    const storedTarget = loadTargetLang();
    const target = languages.includes(storedTarget)
      ? storedTarget
      : DEFAULT_TARGET_LANG;
    /* eslint-disable react-hooks/set-state-in-effect */
    setNativeLang(native);
    setTargetLang(target);
    setKindTab(loadStoredTab());
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [languages]);

  useEffect(() => {
    if (!hydrated) return;
    saveTargetLang(targetLang);
  }, [hydrated, targetLang]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(VOCAB_TAB_KEY, kindTab);
    } catch {
      // localStorage might be unavailable; tab still works in-memory
    }
  }, [hydrated, kindTab]);

  if (!hydrated) return null;

  const sameLang = nativeLang === targetLang;

  return (
    <div className="flex flex-col gap-6">
      <section
        data-testid="target-lang-picker"
        className="flex flex-col gap-3 rounded-2xl bg-surface/60 p-4 ring-1 ring-border"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <LangSelect
            label="I type in"
            value={targetLang}
            languages={languages}
            onChange={setTargetLang}
          />
          <p className="text-xs text-fg-faint">
            Hints shown in {LANG_LABEL[nativeLang] ?? nativeLang}.{" "}
            <Link href="/" className="underline hover:text-accent">
              Change on home page
            </Link>
            .
          </p>
        </div>
        {sameLang ? (
          <p className="text-xs text-warning">
            Native and target are the same — you&apos;ll be reading and typing in{" "}
            {LANG_LABEL[nativeLang] ?? nativeLang}.
          </p>
        ) : null}
      </section>

      <section
        data-testid="deck-kind-tabs"
        className="flex gap-2"
        role="tablist"
        aria-label="Deck category"
      >
        {(["vocab", "alphabet"] as DeckKindTab[]).map((k) => {
          const active = kindTab === k;
          const label = k === "vocab" ? "Vocabulary" : "Alphabet";
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setKindTab(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ring-1 transition ${
                active
                  ? "bg-accent text-white ring-accent"
                  : "bg-surface-2 text-fg-muted ring-border hover:text-fg"
              }`}
            >
              {label}
            </button>
          );
        })}
      </section>

      <section
        data-testid="deck-filters"
        className="flex flex-wrap items-center gap-3"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search decks…"
          aria-label="Search decks"
          className="flex-1 min-w-[12rem] rounded-md bg-surface-2 px-3 py-2 text-sm text-fg ring-1 ring-border placeholder:text-fg-faint focus:outline-none focus:ring-accent"
        />
        <div className="flex flex-wrap gap-1" role="group" aria-label="CEFR level filter">
          {(["ALL", "A1", "A2", "B1", "B2", "C1"] as CefrFilter[]).map((level) => {
            const active = cefrFilter === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => setCefrFilter(level)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
                  active
                    ? "bg-accent/20 text-accent ring-accent"
                    : "bg-surface-2 text-fg-muted ring-border hover:bg-accent/10 hover:text-accent"
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </section>

      {(() => {
        const filtered = decks.filter((deck) => {
          // Tab gate: kind defaults to "vocab" for legacy decks
          const deckKind = deck.kind ?? "vocab";
          if (deckKind !== kindTab) return false;
          if (cefrFilter !== "ALL" && deck.cefr !== cefrFilter) return false;
          if (query.trim().length === 0) return true;
          const haystack = `${deck.title} ${deck.description ?? ""}`.toLowerCase();
          return haystack.includes(query.trim().toLowerCase());
        });
        return (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm uppercase tracking-[0.2em] text-fg-faint">
              Decks ({filtered.length}
              {filtered.length === decks.length ? "" : ` of ${decks.length}`})
            </h2>
            {filtered.length === 0 ? (
              <p
                role="status"
                className="rounded-xl bg-surface/60 p-4 text-sm text-fg-muted ring-1 ring-border"
              >
                {(() => {
                  const tabLabel = kindTab === "alphabet" ? "Alphabet" : "Vocabulary";
                  const hasFilters = query || cefrFilter !== "ALL";
                  if (!hasFilters) {
                    return `No ${tabLabel.toLowerCase()} decks available yet.`;
                  }
                  return (
                    <>
                      No {tabLabel.toLowerCase()} decks match
                      {query ? <span> “{query}”</span> : null}
                      {query && cefrFilter !== "ALL" ? " at " : null}
                      {cefrFilter !== "ALL" ? <span>{cefrFilter}</span> : null}.
                    </>
                  );
                })()}
              </p>
            ) : null}
            <ul className="flex flex-col gap-2">
              {filtered.map((deck) => (
            <li key={deck.id}>
              <Link
                href={`/vocab/${deck.target ?? targetLang}/${deck.id}?from=${encodeURIComponent(nativeLang)}`}
                className="flex flex-col gap-1 rounded-xl bg-surface/60 p-4 ring-1 ring-border transition hover:bg-surface hover:ring-accent"
              >
                <div className="flex items-center gap-2 text-xs text-fg-faint">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      LEVEL_BADGE[deck.cefr] ?? "bg-surface-2 text-fg-muted"
                    }`}
                  >
                    {deck.cefr}
                  </span>
                  {deck.target ? (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent">
                      {LANG_LABEL[deck.target] ?? deck.target}
                    </span>
                  ) : null}
                  <span>{deck.conceptIds.length} cards</span>
                  {deck.estimated_minutes ? (
                    <span>· ~{deck.estimated_minutes} min</span>
                  ) : null}
                </div>
                <span className="text-base font-medium text-fg">{deck.title}</span>
                {deck.description ? (
                  <span className="text-sm text-fg-muted">{deck.description}</span>
                ) : null}
              </Link>
            </li>
              ))}
            </ul>
          </section>
        );
      })()}
    </div>
  );
}

interface LangSelectProps {
  label: string;
  value: string;
  languages: string[];
  onChange: (v: string) => void;
}

function LangSelect({ label, value, languages, onChange }: LangSelectProps) {
  return (
    <label className="flex flex-col gap-1 text-xs text-fg-faint">
      <span className="uppercase tracking-[0.18em]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md bg-surface-2 px-3 py-2 text-sm text-fg ring-1 ring-border transition focus:outline-none focus:ring-accent"
      >
        {languages.map((l) => (
          <option key={l} value={l}>
            {LANG_LABEL[l] ?? l}
          </option>
        ))}
      </select>
    </label>
  );
}
