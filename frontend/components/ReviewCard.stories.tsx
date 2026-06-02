import type { Meta, StoryObj } from "@storybook/react";
import ReviewCard from "./ReviewCard";

const meta: Meta<typeof ReviewCard> = {
  component: ReviewCard,
  title: "Components/ReviewCard",
  parameters: {
    layout: "centered",
  },
};

export default meta;

type Story = StoryObj<typeof ReviewCard>;

export const Default: Story = {
  args: {
    title: "Photosynthesis in Plants",
    excerpt: "The process by which plants convert light energy into chemical energy, creating glucose and oxygen from carbon dioxide and water.",
    tags: ["Biology", "Chapter 3"],
    difficulty: "medium",
  },
};

export const Easy: Story = {
  args: {
    title: "Basic Algebra Concepts",
    excerpt: "Introduction to variables, constants, and simple equations. Foundation for understanding more complex mathematical operations.",
    tags: ["Mathematics", "Basics"],
    difficulty: "easy",
  },
};

export const Hard: Story = {
  args: {
    title: "Quantum Mechanics Superposition",
    excerpt: "Advanced concept describing how a quantum system can exist in multiple states simultaneously until measured or observed.",
    tags: ["Physics", "Quantum"],
    difficulty: "hard",
  },
};

export const WithAction: Story = {
  args: {
    title: "European History: Industrial Revolution",
    excerpt: "The period of human history centered on the mass production of goods by machines, which radically transformed society.",
    tags: ["History", "Social Change"],
    difficulty: "medium",
    onStudy: () => alert("Begin review session!"),
  },
};
