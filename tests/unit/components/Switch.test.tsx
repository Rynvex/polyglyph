/**
 * TDD spec for Switch — a sliding toggle styled to match the rest of
 * Polyglyph's accent-orange pill controls.
 *
 * Contract:
 *   - Renders as `role="switch"` with `aria-checked` reflecting `checked`.
 *   - Accessible name from `label` prop.
 *   - Clicking fires onChange with the inverted value.
 *   - Disabled prop blocks onChange and reflects `aria-disabled`.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { Switch } from "@/components/Switch";

describe("Switch", () => {
  test("renders with role='switch' and accessible name from label", () => {
    render(<Switch checked={false} onChange={() => undefined} label="Demo" />);
    expect(screen.getByRole("switch", { name: "Demo" })).toBeInTheDocument();
  });

  test("aria-checked reflects checked prop", () => {
    const { rerender } = render(
      <Switch checked={false} onChange={() => undefined} label="x" />,
    );
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    rerender(<Switch checked={true} onChange={() => undefined} label="x" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  test("clicking fires onChange with the inverted value", async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(<Switch checked={false} onChange={handle} label="x" />);
    await user.click(screen.getByRole("switch"));
    expect(handle).toHaveBeenCalledWith(true);
  });

  test("clicking a checked switch reports false", async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(<Switch checked={true} onChange={handle} label="x" />);
    await user.click(screen.getByRole("switch"));
    expect(handle).toHaveBeenCalledWith(false);
  });

  test("disabled blocks onChange", async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(
      <Switch checked={false} onChange={handle} label="x" disabled />,
    );
    await user.click(screen.getByRole("switch"));
    expect(handle).not.toHaveBeenCalled();
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});
