import type { Meta, StoryObj } from "@storybook/react";
import { Upload } from "lucide-react";
import EmptyState from "./EmptyState";

const meta: Meta<typeof EmptyState> = {
  component: EmptyState,
  title: "Components/EmptyState",
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const WithoutAction: Story = {
  args: {
    title: "No documents yet",
    description: "Upload a document to see it appear here with status and processing details.",
  },
};

export const WithAction: Story = {
  args: {
    title: "No notes yet",
    description: "Create your first study note to start building a revision library.",
    action: {
      label: "Create note",
      onClick: () => alert("Create note clicked"),
    },
  },
};

export const WithIcon: Story = {
  args: {
    icon: <Upload className="h-8 w-8" />,
    title: "Ready to upload",
    description: "Drag and drop your study materials or click the button below to browse files.",
    action: {
      label: "Upload file",
      onClick: () => alert("Upload clicked"),
    },
  },
};

export const LongDescription: Story = {
  args: {
    title: "Search results",
    description: "No results found for your query. Try adjusting your search terms or browse your notes and documents from the navigation menu.",
    action: {
      label: "Browse notes",
      onClick: () => alert("Browse notes clicked"),
    },
  },
};
