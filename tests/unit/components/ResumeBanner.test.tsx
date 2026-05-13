import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { ResumeBanner } from "@/components/ResumeBanner";

describe("ResumeBanner", () => {
  test("shows turn position", () => {
    render(<ResumeBanner resumedTurn={3} totalTurns={10} onStartOver={() => {}} />);
    expect(screen.getByTestId("resume-banner").textContent).toMatch(/3.*10/);
  });

  test("clicking 'Start over' fires the callback", async () => {
    const onStartOver = vi.fn();
    const user = userEvent.setup();
    render(<ResumeBanner resumedTurn={1} totalTurns={5} onStartOver={onStartOver} />);
    await user.click(screen.getByRole("button", { name: /start over/i }));
    expect(onStartOver).toHaveBeenCalledTimes(1);
  });
});
