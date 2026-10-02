import { createScheduled, throttle } from "@solid-primitives/scheduled";
import classnames from "classnames";
import DOMPurify from "dompurify";
import { Marked } from "marked";
import { FaSolidCheck, FaSolidCopy } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
	untrack,
} from "solid-js";
import { Portal } from "solid-js/web";
import { createCopy } from "@/components/Copy/copyValue";
import T from "@/translations";

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
const fadeDuration = 400;
const cacheSize = 300;
const cache = new Map<string, string>();

interface Chunk {
	start: number;
	at: number;
}

//* its own instance, so the link hook below never changes sanitising elsewhere in the admin
const purify = DOMPurify();

//* links in agent text point away from the admin, so they open in a new tab without a referrer
purify.addHook("afterSanitizeAttributes", (node) => {
	if (node.tagName !== "A") return;
	node.setAttribute("target", "_blank");
	node.setAttribute("rel", "noopener noreferrer");
});

const render = (text: string) =>
	purify.sanitize(markdown.parse(text, { async: false }), {
		ALLOWED_TAGS: allowedTags,
		ALLOWED_ATTR: ["href", "title", "start"],
	});

/**
 * Renders text once and keeps the result. Streamed text differs on every
 * render, so only text as it first mounts, or previews, go through here.
 */
const renderCached = (text: string) => {
	const cached = cache.get(text);
	//* re-added on each hit, so the least recently used entry is the one dropped
	cache.delete(text);
	const html = cached ?? render(text);
	cache.set(text, html);
	const oldest = cache.keys().next();
	if (cache.size > cacheSize && !oldest.done) cache.delete(oldest.value);
	return html;
};

/** Markdown as one line of plain text, for previews such as queued messages. */
export const markdownPreview = (text: string) => {
	const body = new DOMParser().parseFromString(
		renderCached(text),
		"text/html",
	).body;
	//* blocks run together in textContent, so each one ends with a space
	for (const block of body.querySelectorAll(blockTags)) block.append(" ");
	return (body.textContent ?? "").replace(/\s+/g, " ").trim();
};

/**
 * Wraps the text of each chunk still fading in a span. Each render replaces the
 * HTML, so a negative delay picks each fade up where the last render left it.
 */
const fadeChunks = (root: HTMLElement, chunks: Chunk[], now: number) => {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const nodes: Text[] = [];
	while (walker.nextNode()) nodes.push(walker.currentNode as Text);

	let offset = 0;
	for (const node of nodes) {
		const start = offset;
		offset += node.length;
		//* the latest chunk first, so wrapping the end of a node leaves earlier offsets in place
		for (let index = chunks.length - 1; index >= 0; index--) {
			const chunk = chunks[index];
			if (!chunk) continue;
			const from = Math.max(chunk.start, start);
			const to = Math.min(chunks[index + 1]?.start ?? offset, offset);
			if (from >= to) continue;

			const range = document.createRange();
			range.setStart(node, from - start);
			range.setEnd(node, to - start);
			const span = document.createElement("span");
			span.className = "agent-fade";
			span.style.animationDelay = `${chunk.at - now}ms`;
			range.surroundContents(span);
		}
	}
};

/** Wraps each code block, so its copy button can sit in the corner while the code scrolls. */
const wrapCodeBlocks = (root: HTMLElement) =>
	Array.from(root.querySelectorAll("pre"), (pre) => {
		const wrapper = document.createElement("div");
		wrapper.className = "agent-code";
		pre.replaceWith(wrapper);
		wrapper.append(pre);
		return wrapper;
	});

/**
 * Copies a code block. It shows while the block is hovered or it has focus,
 * in the block's own colour, so a long line fades out behind it.
 */
const CopyCode: Component<{ block: HTMLElement }> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [copied, copy] = createCopy(
		() => props.block.querySelector("pre")?.textContent ?? "",
	);

	// ----------------------------------------
	// Render
	return (
		<button
			type="button"
			class="absolute top-2 right-2 flex size-6 items-center justify-center rounded-md bg-input text-muted opacity-0 shadow-[-12px_0_8px_var(--lucid-input),8px_0_0_var(--lucid-input)] transition-[opacity,color] hover:text-body focus:outline-hidden focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-primary pointer-coarse:opacity-100 [.agent-code:hover_&]:opacity-100 [.agent-markdown-bubble_&]:bg-card [.agent-markdown-bubble_&]:shadow-[-12px_0_8px_var(--lucid-card),8px_0_0_var(--lucid-card)]"
			aria-label={T()("agent.message.copy.code")}
			title={T()("agent.message.copy.code")}
			onClick={() => void copy()}
		>
			<Show when={copied()} fallback={<FaSolidCopy size={11} />}>
				<FaSolidCheck size={11} class="text-success" />
			</Show>
		</button>
	);
};

/**
 * Renders message text as sanitised markdown, with a copy button on each code
 * block. Only registered widgets can render interactive content. The bubble
 * tone is for user messages: it matches the chat box's compact spacing and
 * keeps code visible on the bubble.
 */
const AgentMarkdown: Component<{
	text: string;
	tone?: "reply" | "bubble";
	size?: "sm";
	/**
	 * Fades in the text it first renders, for text that mounts mid-stream. Text
	 * that grows after the first render always fades in. Read once, on mount.
	 */
	animate?: boolean;
	/** Overrides the default text size and colour, such as for a smaller preview. */
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	let element: HTMLDivElement | undefined;
	const scheduled = createScheduled((update) => throttle(update, 100));
	const [codeBlocks, setCodeBlocks] = createSignal<HTMLElement[]>([]);
	let rendered = untrack(() => props.animate) ? 0 : undefined;
	let chunks: Chunk[] = [];

	// ----------------------------------------
	// Memos
	//* streamed text re-renders at most every 100ms rather than on every chunk
	const html = createMemo<string | undefined>((previous) => {
		const text = props.text;
		if (previous === undefined) return renderCached(text);
		return scheduled() ? render(text) : previous;
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		html();
		if (!element) return;

		const length = element.textContent?.length ?? 0;
		const now = performance.now();
		chunks = chunks.filter(
			(chunk) => now - chunk.at < fadeDuration && chunk.start < length,
		);
		if (rendered !== undefined && length > rendered) {
			chunks.push({ start: rendered, at: now });
		}
		rendered = length;

		if (chunks.length > 0) fadeChunks(element, chunks, now);
		setCodeBlocks(wrapCodeBlocks(element));
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<div
				ref={element}
				class={classnames("agent-markdown", props.class, {
					"agent-markdown-bubble agent-markdown-compact":
						props.tone === "bubble",
					"agent-markdown-sm": props.size === "sm",
				})}
				innerHTML={html()}
			/>
			<For each={codeBlocks()}>
				{(block) => (
					<Portal mount={block}>
						<CopyCode block={block} />
					</Portal>
				)}
			</For>
		</>
	);
};

export default AgentMarkdown;
