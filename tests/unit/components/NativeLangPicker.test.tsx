/**
 * TDD spec for the home-page native language picker.
 *
 * Behaviour:
 *   - On first visit (no stored value), seeds from navigator.language
 *     if supported, otherwise the default.
 *   - On revisit, restores the stored value.
 *   - Persists changes via saveNativeLang under the new split key.
 */
import { describe, expect, test, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NativeLangPicker } from "@/components/NativeLangPicker";
import {
  DEFAULT_NATIVE_LANG,
  NATIVE_LANG_KEY,
} from "@/lib/data/lang-prefs";

beforeEach(() => {
  window.localStorage.clear();
});

describe("NativeLangPicker", () => {
  test("renders a select labelled 'I read in'", async () => {
    render(<NativeLangPicker />);
    expect(await screen.findByTestId("native-lang-picker")).toBeInTheDocument();
    expect(screen.getByText(/i read in/i)).toBeInTheDocument();
  });

  test("seeds default when no localStorage entry and no nav guess", async () => {
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: "xx-YY", // unsupported
    });
    render(<NativeLangPicker />);
    const select = await screen.findByLabelText(/native language/i);
    expect((select as HTMLSelectElement).value).toBe(DEFAULT_NATIVE_LANG);
  });

  test("guesses from navigator.language on first visit", async () => {
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: "ja-JP",
    });
    render(<NativeLangPicker />);
    const select = await screen.findByLabelText(/native language/i);
    expect((select as HTMLSelectElement).value).toBe("ja");
    // Persist guess so subsequent visits keep it.
    expect(window.localStorage.getItem(NATIVE_LANG_KEY)).toBe("ja");
  });

  test("respects stored value over navigator guess", async () => {
    window.localStorage.setItem(NATIVE_LANG_KEY, "zh-tw");
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: "ja-JP",
    });
    render(<NativeLangPicker />);
    const select = await screen.findByLabelText(/native language/i);
    expect((select as HTMLSelectElement).value).toBe("zh-tw");
  });

  test("persists change immediately", async () => {
    render(<NativeLangPicker />);
    const select = (await screen.findByLabelText(
      /native language/i,
    )) as HTMLSelectElement;
    await act(async () => {
      await userEvent.selectOptions(select, "ko");
    });
    expect(window.localStorage.getItem(NATIVE_LANG_KEY)).toBe("ko");
  });
});

// Replace vi.fn import if unused below — keep it for clarity that we
// haven't added other doubles.
void vi;
