import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { DialogueProgress } from "@/components/DialogueProgress";

describe("DialogueProgress", () => {
  test("renders a progressbar role with current/100 ratio", () => {
    render(<DialogueProgress current={5} total={10} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "50");
  });

  test("clamps ratio to 0..100 even with bad inputs", () => {
    render(<DialogueProgress current={20} total={10} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  test("returns 0% when total is zero", () => {
    render(<DialogueProgress current={3} total={0} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });
});
