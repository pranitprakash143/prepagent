import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import ErrorBoundary from "./ErrorBoundary";

const meta: Meta<typeof ErrorBoundary> = {
  component: ErrorBoundary,
  title: "Components/ErrorBoundary",
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof ErrorBoundary>;

function ThrowError() {
  const [ready] = useState(false);
  if (!ready) throw new Error("Test error boundary message");
  return null;
}

export const Normal: Story = {
  args: {
    children: (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-slate-400">
        Normal content renders without issue
      </div>
    ),
  },
};

export const ErrorState: Story = {
  args: {
    children: <ThrowError />,
  },
};

export const WithCustomFallback: Story = {
  args: {
    children: <ThrowError />,
    fallback: (
      <div className="flex min-h-[200px] items-center justify-center rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8">
        <p className="text-amber-300">Custom fallback message</p>
      </div>
    ),
  },
};
