/**
 * TDD spec for the dialogue target-language picker.
 *
 * Renders a chip per available language. Clicking a chip persists the
 * choice in localStorage and notifies the parent. Languages with zero
 * scripts render dimmed.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DialogueLanguagePicker } from "@/components/DialogueLanguagePicker";

beforeEach(() => {
  window.localStorage.clear();
});

describe("DialogueLanguagePicker", () => {
  test("renders one chip per supported language", () => {
    render(
      <DialogueLanguagePicker
        active="en"
        counts={{ en: 39, "zh-tw": 0, ja: 0, ko: 0, it: 0, de: 0, es: 0 }}
        onChange={() => {}}
      />,
    );
    // Each of the seven languages renders.
    expect(screen.getByRole("button", { name: /english/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /中文/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /日本語/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /한국어/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /italiano/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deutsch/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /español/i })).toBeInTheDocument();
  });

  test("chip count matches the provided counts", () => {
    render(
      <DialogueLanguagePicker
        active="en"
        counts={{ en: 39, "zh-tw": 2, ja: 0, ko: 0, it: 0, de: 0, es: 0 }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /english/i }).textContent).toMatch(
      /39/,
    );
    expect(screen.getByRole("button", { name: /中文/ }).textContent).toMatch(/2/);
  });

  test("active chip is marked aria-pressed=true", () => {
    render(
      <DialogueLanguagePicker
        active="en"
        counts={{ en: 39, "zh-tw": 0, ja: 0, ko: 0, it: 0, de: 0, es: 0 }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /english/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /日本語/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("clicking an enabled chip calls onChange and persists to localStorage", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DialogueLanguagePicker
        active="en"
        counts={{ en: 39, "zh-tw": 0, ja: 2, ko: 0, it: 0, de: 0, es: 0 }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /日本語/ }));
    expect(onChange).toHaveBeenCalledWith("ja");
    expect(window.localStorage.getItem("polyglyph:dialogue-target-lang")).toBe(
      "ja",
    );
  });

  test("clicking a zero-count chip is disabled (no onChange)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DialogueLanguagePicker
        active="en"
        counts={{ en: 39, "zh-tw": 0, ja: 0, ko: 0, it: 0, de: 0, es: 0 }}
        onChange={onChange}
      />,
    );
    const koreanChip = screen.getByRole("button", { name: /한국어/ });
    expect(koreanChip).toBeDisabled();
    await user.click(koreanChip);
    expect(onChange).not.toHaveBeenCalled();
  });
});
