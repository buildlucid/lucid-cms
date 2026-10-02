import { Extension } from "@tiptap/core";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { Plugin } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";

/** Plain text pasted from chats and docs keeps its Markdown formatting. */
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

export const agentMarkdownExtensions = (props: {
	placeholder: () => string;
}) => [
	StarterKit.configure({
		heading: { levels: [1, 2, 3, 4] },
		//* Markdown has no underline
		underline: false,
		dropcursor: false,
		gapcursor: false,
		trailingNode: false,
		link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
	}),
	//* Also explains why a disabled chat cannot be used.
	Placeholder.configure({
		placeholder: () => props.placeholder(),
		showOnlyWhenEditable: false,
	}),
	//* Messages and routine instructions have the same server limit.
	CharacterCount.configure({ limit: 20_000 }),
	Markdown,
	pasteMarkdown,
];
