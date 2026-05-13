import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ThemeToggle } from "@/components/ThemeToggle";

const ORIGINAL_MATCH_MEDIA = window.matchMedia;

function stubMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  document.documentElement.removeAttribute("data-theme");
  stubMatchMedia(false); // OS prefers dark by default
});

afterEach(() => {
  window.matchMedia = ORIGINAL_MATCH_MEDIA;
});

describe("ThemeToggle", () => {
  test("starts in 'auto' when no preference saved", async () => {
    render(<ThemeToggle />);
    const btn = await screen.findByTestId("theme-toggle");
    expect(btn).toHaveAttribute("data-pref", "auto");
  });

  test("cycles auto → light → dark → auto on click", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const btn = await screen.findByTestId("theme-toggle");

    await user.click(btn);
    expect(btn).toHaveAttribute("data-pref", "light");
    expect(document.documentElement.dataset.theme).toBe("light");

    await user.click(btn);
    expect(btn).toHaveAttribute("data-pref", "dark");
    expect(document.documentElement.dataset.theme).toBe("dark");

    await user.click(btn);
    expect(btn).toHaveAttribute("data-pref", "auto");
    // Auto resolves to the OS hint — we stubbed prefersLight=false above.
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  test("auto resolves to light when OS prefers light", async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const btn = await screen.findByTestId("theme-toggle");
    // auto → light → dark → auto
    await user.click(btn);
    await user.click(btn);
    await user.click(btn);
    expect(btn).toHaveAttribute("data-pref", "auto");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  test("hydrates the saved preference on mount", async () => {
    localStorage.setItem("polyglyph:theme", "light");
    render(<ThemeToggle />);
    const btn = await screen.findByTestId("theme-toggle");
    expect(btn).toHaveAttribute("data-pref", "light");
    localStorage.removeItem("polyglyph:theme");
  });

  test("persists chosen preference to localStorage", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const btn = await screen.findByTestId("theme-toggle");
    await user.click(btn); // auto → light
    expect(localStorage.getItem("polyglyph:theme")).toBe("light");
  });
});
