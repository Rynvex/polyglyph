/**
 * TDD spec for TranslationStrip — the small native-language hint line
 * rendered beneath a ChatBubble when the user has opted into translations.
 *
 * Contract:
 *   - Renders the supplied text.
 *   - Returns null for empty / whitespace-only text so callers do not
 *     have to guard at the call site.
 *   - Exposes `data-testid="translation-strip"` and `data-side` so the
 *     scene can find it from tests and so styles can flip alignment.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { TranslationStrip } from "@/components/TranslationStrip";

describe("TranslationStrip", () => {
  test("renders the supplied text", () => {
    render(<TranslationStrip text="你好,要喝什麼?" side="left" />);
    expect(screen.getByText("你好,要喝什麼?")).toBeInTheDocument();
  });

  test("exposes the translation-strip testid", () => {
    render(<TranslationStrip text="Bonjour" side="left" />);
    expect(screen.getByTestId("translation-strip")).toBeInTheDocument();
  });

  test("left side carries data-side='left'", () => {
    render(<TranslationStrip text="x" side="left" />);
    expect(screen.getByTestId("translation-strip")).toHaveAttribute(
      "data-side",
      "left",
    );
  });

  test("right side carries data-side='right'", () => {
    render(<TranslationStrip text="x" side="right" />);
    expect(screen.getByTestId("translation-strip")).toHaveAttribute(
      "data-side",
      "right",
    );
  });

  test("renders nothing for empty string", () => {
    const { container } = render(<TranslationStrip text="" side="left" />);
    expect(container).toBeEmptyDOMElement();
  });

  test("renders nothing for whitespace-only string", () => {
    const { container } = render(<TranslationStrip text="   " side="left" />);
    expect(container).toBeEmptyDOMElement();
  });
});
