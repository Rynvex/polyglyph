import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TypewriterText } from "@/components/TypewriterText";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TypewriterText", () => {
  test("starts empty and reveals one character per tick", async () => {
    render(<TypewriterText text="hi" charDelayMs={50} />);
    const node = screen.getByTestId("typewriter");
    expect(node.textContent?.replace(/▍/g, "")).toBe("");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(node.textContent?.replace(/▍/g, "")).toBe("h");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(node.textContent?.replace(/▍/g, "")).toBe("hi");
  });

  test("instant mode renders full text immediately, no caret", () => {
    render(<TypewriterText text="hi" instant />);
    expect(screen.getByTestId("typewriter").textContent).toBe("hi");
  });

  test("skipSignal fast-forwards to full text", () => {
    const { rerender } = render(
      <TypewriterText text="hello" charDelayMs={50} skipSignal={0} />,
    );
    // After ~one tick we'd have 1 char. Bump the skip signal — should jump.
    rerender(<TypewriterText text="hello" charDelayMs={50} skipSignal={1} />);
    expect(screen.getByTestId("typewriter").textContent?.replace(/▍/g, "")).toBe(
      "hello",
    );
  });

  test("caret stops showing once the animation completes", async () => {
    render(<TypewriterText text="hi" charDelayMs={10} />);
    // Each tick reveals one char then re-renders, scheduling the next
    // setTimeout in an effect. Step the clock once per char so React can
    // queue the follow-up timer.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.getByTestId("typewriter").textContent).toBe("hi");
  });
});

describe("TypewriterText — onComplete", () => {
  test("fires once when animation finishes naturally", async () => {
    const onComplete = vi.fn();
    render(<TypewriterText text="hi" charDelayMs={10} onComplete={onComplete} />);
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test("fires immediately on mount when instant=true", () => {
    const onComplete = vi.fn();
    render(<TypewriterText text="hi" instant onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test("fires once after skipSignal fast-forwards the animation", () => {
    const onComplete = vi.fn();
    const { rerender } = render(
      <TypewriterText
        text="hello"
        charDelayMs={50}
        skipSignal={0}
        onComplete={onComplete}
      />,
    );
    // Mid-animation, parent bumps skipSignal — should jump to done.
    rerender(
      <TypewriterText
        text="hello"
        charDelayMs={50}
        skipSignal={1}
        onComplete={onComplete}
      />,
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test("does not fire twice across re-renders once complete", () => {
    const onComplete = vi.fn();
    const { rerender } = render(
      <TypewriterText text="hi" instant onComplete={onComplete} />,
    );
    rerender(<TypewriterText text="hi" instant onComplete={onComplete} />);
    rerender(<TypewriterText text="hi" instant onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
