import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import ReviewCard from "../components/ReviewCard";

test("renders ReviewCard with title and excerpt", () => {
  render(
    <ReviewCard
      title="Test Concept"
      excerpt="This is a test excerpt for the review card."
      difficulty="easy"
    />
  );

  expect(screen.getByText("Test Concept")).toBeTruthy();
  expect(screen.getByText(/This is a test excerpt/)).toBeTruthy();
  expect(screen.getByText("easy")).toBeTruthy();
});

test("renders tags when provided", () => {
  render(
    <ReviewCard
      title="Test Concept"
      excerpt="Excerpt"
      tags={["tag1", "tag2"]}
      difficulty="medium"
    />
  );

  expect(screen.getByText("tag1")).toBeTruthy();
  expect(screen.getByText("tag2")).toBeTruthy();
});

test("renders Begin review button when onStudy callback is provided", () => {
  const mockCallback = () => {};
  render(
    <ReviewCard
      title="Test Concept"
      excerpt="Excerpt"
      difficulty="hard"
      onStudy={mockCallback}
    />
  );

  expect(screen.getByText("Begin review")).toBeTruthy();
});
