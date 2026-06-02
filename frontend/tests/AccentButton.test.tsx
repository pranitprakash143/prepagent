import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import AccentButton from "../components/AccentButton";

test("renders AccentButton with label", () => {
  render(<AccentButton>Focus</AccentButton>);
  expect(screen.getByRole("button", { name: /focus/i })).toBeInTheDocument();
});
