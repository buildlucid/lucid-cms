import { type Editor, Extension } from "@tiptap/core";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { Plugin } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";

/** The server's limit for one message. */
export const maxMessageLength = 20_000;

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

/** Plain text pasted from chats and docs is usually markdown, so it keeps its formatting. */
const pasteMarkdown = Extension.create({
	name: "pasteMarkdown",
	addProseMirrorPlugins() {
		const editor = this.editor;
		return [
			new Plugin({
				props: {
					handlePaste: (_view, event) => {
						const data = event.clipboardData;
						const text = data?.getData("text/plain");
						if (
							!text ||
							data?.types.includes("text/html") ||
							editor.isActive("codeBlock")
						) {
							return false;
						}
						editor.commands.insertContent(text, { contentType: "markdown" });
						return true;
					},
				},
			}),
		];
	},
});

/**
 * The formatting the chat box supports: emphasis, code, quotes, lists and links.
 * Markdown shortcuts such as `**bold**` apply as you type, and the content is
 * sent as markdown.
 */
export const composerExtensions = (props: {
	placeholder: () => string;
	keys: ComposerKeyHandlers;
}) => [
	StarterKit.configure({
		heading: false,
		horizontalRule: false,
		//* markdown has no underline
		underline: false,
		dropcursor: false,
		gapcursor: false,
		trailingNode: false,
		link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
	}),
	Placeholder.configure({ placeholder: () => props.placeholder() }),
	CharacterCount.configure({ limit: maxMessageLength }),
	Markdown,
	pasteMarkdown,
	composerKeys(props.keys),
];

/** Whitespace-only content counts as empty, so it cannot be sent. */
export const isBlank = (editor: Editor) => editor.getText().trim() === "";
