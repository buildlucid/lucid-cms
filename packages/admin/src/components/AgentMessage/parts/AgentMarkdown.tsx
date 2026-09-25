import { createScheduled, throttle } from "@solid-primitives/scheduled";
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

const render = (text: string) =>
	DOMPurify.sanitize(markdown.parse(text, { async: false }), {
		ALLOWED_TAGS: allowedTags,
		ALLOWED_ATTR: ["href", "title", "start"],
	});

/** Renders model text as sanitised markdown. Only registered widgets can render interactive content. */
const AgentMarkdown: Component<{ text: string }> = (props) => {
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
			class="break-words text-sm leading-7 text-title [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-input [&_code]:px-1 [&_code]:text-xs [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-input [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-3 [&_table]:block [&_table]:overflow-x-auto [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:pl-5"
			innerHTML={html()}
		/>
	);
};

export default AgentMarkdown;
