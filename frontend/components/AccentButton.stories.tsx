import type { Meta, StoryObj } from "@storybook/react";
import AccentButton from "./AccentButton";

const meta: Meta<typeof AccentButton> = {
  title: "Components/AccentButton",
  component: AccentButton,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof AccentButton>;

export const Default: Story = {
  args: {
    children: "Begin the path",
  },
};
