import { type Editor, Extension } from "@tiptap/core";
import { agentMarkdownExtensions } from "@/utils/agent-markdown-editor";

export type ComposerKeyHandlers = {
	/** Enter sends. ⌘ or Ctrl + Enter steers a busy agent. */
	submit: (mode: "send" | "steer") => void;
	/** ↑ in an empty box takes the last queued message back. */
	editLast: () => boolean;
};

/**
 * Enter sends, except in a code block where it adds a line. Shift + Enter starts
 * a new paragraph or list item, so markdown shortcuts such as `- ` work on the
 * next line. It runs before the list keymap, so lists never swallow Enter.
 */
const composerKeys = (handlers: ComposerKeyHandlers) =>
	Extension.create({
		name: "composerKeys",
		priority: 1000,
		addKeyboardShortcuts() {
			const steer = () => {
				handlers.submit("steer");
				return true;
			};
			return {
				Enter: ({ editor }) => {
					if (editor.isActive("codeBlock")) return false;
					handlers.submit("send");
					return true;
				},
				"Shift-Enter": ({ editor }) =>
					editor.commands.first(({ commands }) => [
						() => commands.newlineInCode(),
						() => commands.splitListItem("listItem"),
						() => commands.splitBlock(),
					]),
				//* both, rather than Mod, so ⌘ and Ctrl work on every platform
				"Meta-Enter": steer,
				"Ctrl-Enter": steer,
				ArrowUp: ({ editor }) => isBlank(editor) && handlers.editLast(),
			};
		},
	});

export const composerExtensions = (props: {
	placeholder: () => string;
	keys: ComposerKeyHandlers;
}) => [...agentMarkdownExtensions(props), composerKeys(props.keys)];

export const isBlank = (editor: Editor) => editor.getText().trim() === "";
