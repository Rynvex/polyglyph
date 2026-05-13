import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { CapsLockWarning } from "@/components/CapsLockWarning";

describe("CapsLockWarning", () => {
  test("renders nothing when inactive", () => {
    render(<CapsLockWarning active={false} />);
    expect(screen.queryByTestId("capslock-warning")).toBeNull();
  });

  test("renders banner when active", () => {
    render(<CapsLockWarning active />);
    const w = screen.getByTestId("capslock-warning");
    expect(w.textContent).toMatch(/caps lock/i);
  });
});
