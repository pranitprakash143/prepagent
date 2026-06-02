import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import AppShell from "./AppShell";

function MockNextRouter({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Object.defineProperty(window, "next", {
      value: { version: "14.0.3" },
      writable: true,
    });
    setReady(true);
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}

const meta: Meta<typeof AppShell> = {
  component: AppShell,
  title: "Components/AppShell",
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/dashboard",
      },
    },
  },
  decorators: [
    (Story) => (
      <MockNextRouter>
        <Story />
      </MockNextRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AppShell>;

export const Dashboard: Story = {
  args: {
    title: "Study Dashboard",
    description: "Your dojo overview and progress summary.",
    children: (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-slate-400">
        Dashboard content goes here
      </div>
    ),
  },
};

export const Upload: Story = {
  args: {
    title: "Upload Study Materials",
    description: "Add PDFs and documents to your library.",
    children: (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-slate-400">
        Upload content goes here
      </div>
    ),
  },
};

export const WithLongContent: Story = {
  args: {
    title: "Notes Library",
    description: "A longer page title to verify text wrapping and layout stability across breakpoints.",
    children: (
      <div className="space-y-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400"
          >
            Note item {i + 1} lorem ipsum dolor sit amet consectetur adipiscing elit
          </div>
        ))}
      </div>
    ),
  },
};
