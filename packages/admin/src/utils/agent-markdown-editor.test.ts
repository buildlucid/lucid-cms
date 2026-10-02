import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { composerExtensions } from "@/components/AgentComposer/editor";
import { agentMarkdownExtensions } from "./agent-markdown-editor";

const editors: Editor[] = [];
const createEditor = (
	extensions = agentMarkdownExtensions({ placeholder: () => "" }),
) => {
	const element = document.createElement("div");
	document.body.append(element);
	const editor = new Editor({ element, extensions });
	editors.push(editor);
	return editor;
};

/** Sends typing through the same input rules as the browser. */
const typeText = (editor: Editor, text: string) => {
	for (const character of text) {
		const { from, to } = editor.state.selection;
		const insert = () => editor.state.tr.insertText(character, from, to);
		const handled = editor.view.someProp("handleTextInput", (handler) =>
			handler(editor.view, from, to, character, insert),
		);
		if (!handled) editor.view.dispatch(insert());
	}
};

afterEach(() => {
	for (const editor of editors.splice(0)) {
		const element = editor.options.element;
		editor.destroy();
		if (element instanceof HTMLElement) element.remove();
	}
});

describe("live agent Markdown formatting", () => {
	it.each([
		{ typed: "# Heading", selector: "h1", markdown: "# Heading" },
		{ typed: "## Heading", selector: "h2", markdown: "## Heading" },
		{ typed: "- Task", selector: "ul li", markdown: "- Task" },
		{ typed: "1. Task", selector: "ol li", markdown: "1. Task" },
		{ typed: "> Note", selector: "blockquote", markdown: "> Note" },
		{ typed: "**Bold**", selector: "strong", markdown: "**Bold**" },
		{ typed: "*Italic*", selector: "em", markdown: "*Italic*" },
		{ typed: "~~Removed~~", selector: "s", markdown: "~~Removed~~" },
		{ typed: "`code`", selector: "code", markdown: "`code`" },
		{ typed: "---", selector: "hr", markdown: "---\n\n" },
	])("formats $typed as it is typed and saves Markdown", ({
		typed,
		selector,
		markdown,
	}) => {
		const editor = createEditor();
		typeText(editor, typed);
		expect(editor.view.dom.querySelector(selector)).not.toBeNull();
		expect(editor.getMarkdown()).toBe(markdown);
	});

	it("opens saved instructions with headings, links, nested lists and fenced code", () => {
		const editor = createEditor();
		editor.commands.setContent(
			"# Brief\n\n- First\n  - Nested\n\n[Sources](https://example.com)\n\n```json\n{}\n```",
			{ contentType: "markdown" },
		);
		expect(editor.view.dom.querySelector("h1")?.textContent).toBe("Brief");
		expect(editor.view.dom.querySelector("ul ul li")?.textContent).toBe(
			"Nested",
		);
		expect(editor.view.dom.querySelector("a")?.getAttribute("href")).toBe(
			"https://example.com",
		);
		expect(editor.view.dom.querySelector("pre code")?.textContent).toBe("{}");
		expect(editor.getMarkdown()).toContain("```json\n{}\n```");
	});

	it("continues a routine list with Enter and keeps undo available", () => {
		const editor = createEditor();
		typeText(editor, "- First");
		editor.view.dom.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
		);
		typeText(editor, "Second");
		expect(editor.getMarkdown()).toBe("- First\n- Second");
		expect(editor.commands.undo()).toBe(true);
	});

	it("formats headings in chat while Enter sends and Shift + Enter adds a line", () => {
		const submit = vi.fn();
		const editor = createEditor(
			composerExtensions({
				placeholder: () => "",
				keys: { submit, editLast: () => false },
			}),
		);
		typeText(editor, "# Brief");
		editor.view.dom.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
		);
		expect(submit).toHaveBeenCalledExactlyOnceWith("send");
		editor.view.dom.dispatchEvent(
			new KeyboardEvent("keydown", {
				key: "Enter",
				shiftKey: true,
				bubbles: true,
			}),
		);
		typeText(editor, "Next paragraph");
		expect(submit).toHaveBeenCalledTimes(1);
		expect(editor.getMarkdown()).toBe("# Brief\n\nNext paragraph");
	});
});
