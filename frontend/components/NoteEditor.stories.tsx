import type { Meta, StoryObj } from "@storybook/react";
import NoteEditor from "./NoteEditor";

const meta: Meta<typeof NoteEditor> = {
  component: NoteEditor,
  title: "Components/NoteEditor",
  parameters: {
    layout: "centered",
  },
};

export default meta;

type Story = StoryObj<typeof NoteEditor>;

export const CreateNew: Story = {
  args: {
    initialTitle: "",
    initialContent: "",
    initialTags: [],
    onSave: async (title, content, tags) => {
      console.log("Saving note:", { title, content, tags });
    },
  },
};

export const Edit: Story = {
  args: {
    id: "note-123",
    initialTitle: "Photosynthesis: Key Steps",
    initialContent: `# Light-Dependent Reactions
- Occurs in thylakoid membranes
- Produces ATP and NADPH
- Releases oxygen as byproduct

# Light-Independent Reactions (Calvin Cycle)
- Occurs in stroma
- Uses ATP and NADPH
- Produces glucose`,
    initialTags: ["Biology", "Chapter 3", "Exam Prep"],
    onSave: async (title, content, tags) => {
      console.log("Updating note:", { title, content, tags });
    },
  },
};

export const ReadOnly: Story = {
  args: {
    initialTitle: "Photosynthesis: Key Steps",
    initialContent: `# Light-Dependent Reactions
- Occurs in thylakoid membranes
- Produces ATP and NADPH
- Releases oxygen as byproduct`,
    initialTags: ["Biology", "Chapter 3"],
    readOnly: true,
  },
};
