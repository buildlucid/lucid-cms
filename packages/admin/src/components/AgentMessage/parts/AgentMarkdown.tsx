import { createScheduled, throttle } from "@solid-primitives/scheduled";
import classnames from "classnames";
import DOMPurify from "dompurify";
import { Marked } from "marked";
import { type Component, createMemo } from "solid-js";

const markdown = new Marked({ gfm: true, breaks: true });
const allowedTags = [
	"p",
	"br",
	"strong",
	"em",
	"del",
	"code",
	"pre",
	"ul",
	"ol",
	"li",
	"blockquote",
	"h1",
	"h2",
	"h3",
	"h4",
	"a",
	"hr",
	"table",
	"thead",
	"tbody",
	"tr",
	"th",
	"td",
];
const blockTags = "p, li, pre, blockquote, h1, h2, h3, h4, tr, br";

const render = (text: string) =>
	DOMPurify.sanitize(markdown.parse(text, { async: false }), {
		ALLOWED_TAGS: allowedTags,
		ALLOWED_ATTR: ["href", "title", "start"],
	});

/** Markdown as one line of plain text, for previews such as queued messages. */
export const markdownPreview = (text: string) => {
	const body = new DOMParser().parseFromString(render(text), "text/html").body;
	//* blocks run together in textContent, so each one ends with a space
	for (const block of body.querySelectorAll(blockTags)) block.append(" ");
	return (body.textContent ?? "").replace(/\s+/g, " ").trim();
};

/**
 * Renders message text as sanitised markdown. Only registered widgets can render
 * interactive content. The bubble tone keeps code visible on a user message.
 */
const AgentMarkdown: Component<{
	text: string;
	tone?: "reply" | "bubble";
	/** Overrides the default text size and colour, such as for a smaller preview. */
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const scheduled = createScheduled((update) => throttle(update, 100));

	// ----------------------------------------
	// Memos
	//* streamed text re-renders at most every 100ms rather than on every chunk
	const html = createMemo<string | undefined>((previous) => {
		const text = props.text;
		return previous === undefined || scheduled() ? render(text) : previous;
	});

	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames("agent-markdown", props.class, {
				"agent-markdown-bubble": props.tone === "bubble",
			})}
			innerHTML={html()}
		/>
	);
};

export default AgentMarkdown;
