import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createSpeaker, isSpeechAvailable } from "@/lib/audio/web-speech";

interface FakeUtterance {
  text: string;
  lang: string;
  rate: number;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

class FakeSpeechSynthesisUtterance implements FakeUtterance {
  text: string;
  lang = "";
  rate = 1;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

describe("isSpeechAvailable", () => {
  beforeEach(() => {
    // @ts-expect-error - test stubs
    globalThis.window = {};
  });
  afterEach(() => {
    // @ts-expect-error - test cleanup
    delete globalThis.window;
  });

  test("false when speechSynthesis missing", () => {
    expect(isSpeechAvailable()).toBe(false);
  });

  test("true when speechSynthesis present", () => {
    // @ts-expect-error - test stub
    globalThis.window.speechSynthesis = { speak: () => {}, cancel: () => {} };
    // @ts-expect-error - test stub
    globalThis.window.SpeechSynthesisUtterance = FakeSpeechSynthesisUtterance;
    expect(isSpeechAvailable()).toBe(true);
  });
});

describe("createSpeaker", () => {
  let utterances: FakeUtterance[];
  let cancelCalls: number;

  beforeEach(() => {
    utterances = [];
    cancelCalls = 0;
    // @ts-expect-error - test stub
    globalThis.window = {
      speechSynthesis: {
        speak: (u: FakeUtterance) => {
          utterances.push(u);
        },
        cancel: () => {
          cancelCalls += 1;
        },
      },
      SpeechSynthesisUtterance: FakeSpeechSynthesisUtterance,
    };
  });
  afterEach(() => {
    // @ts-expect-error - test cleanup
    delete globalThis.window;
  });

  test("speak passes text/lang/rate to utterance", async () => {
    const speaker = createSpeaker();
    const promise = speaker.speak("hola", { lang: "es", rate: 0.9 });
    expect(utterances).toHaveLength(1);
    expect(utterances[0].text).toBe("hola");
    expect(utterances[0].lang).toBe("es");
    expect(utterances[0].rate).toBe(0.9);
    utterances[0].onend?.();
    await promise;
  });

  test("speak resolves on onend", async () => {
    const speaker = createSpeaker();
    const promise = speaker.speak("test", { lang: "en" });
    const resolved = vi.fn();
    promise.then(resolved);
    expect(resolved).not.toHaveBeenCalled();
    utterances[0].onend?.();
    await promise;
    expect(resolved).toHaveBeenCalled();
  });

  test("speak rejects on onerror", async () => {
    const speaker = createSpeaker();
    const promise = speaker.speak("test", { lang: "en" });
    utterances[0].onerror?.({ error: "synthesis-failed" });
    await expect(promise).rejects.toThrow("synthesis-failed");
  });

  test("cancel calls speechSynthesis.cancel", () => {
    const speaker = createSpeaker();
    speaker.cancel();
    expect(cancelCalls).toBe(1);
  });

  test("each speak cancels prior speech first", () => {
    const speaker = createSpeaker();
    void speaker.speak("a", { lang: "en" });
    void speaker.speak("b", { lang: "en" });
    expect(cancelCalls).toBe(2);
    expect(utterances).toHaveLength(2);
  });
});

describe("createSpeaker without browser support", () => {
  beforeEach(() => {
    // @ts-expect-error - test stub
    globalThis.window = {};
  });
  afterEach(() => {
    // @ts-expect-error - test cleanup
    delete globalThis.window;
  });

  test("speak resolves silently when API missing", async () => {
    const speaker = createSpeaker();
    await expect(speaker.speak("x", { lang: "es" })).resolves.toBeUndefined();
  });

  test("cancel is a no-op when API missing", () => {
    const speaker = createSpeaker();
    expect(() => speaker.cancel()).not.toThrow();
  });
});
