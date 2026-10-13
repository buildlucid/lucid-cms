import { createScheduled, throttle } from "@solid-primitives/scheduled";
import classnames from "classnames";
import { TbOutlineCheck, TbOutlineCopy } from "solid-icons/tb";
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
import {
	renderAgentMarkdown,
	renderAgentMarkdownCached,
} from "@/utils/agent-markdown";

const fadeDuration = 400;

interface Chunk {
	start: number;
	at: number;
}

/** Wraps fading text chunks with negative animation delays to preserve progress across renders. */
const fadeChunks = (root: HTMLElement, chunks: Chunk[], now: number) => {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const nodes: Text[] = [];
	while (walker.nextNode()) nodes.push(walker.currentNode as Text);

	let offset = 0;
	for (const node of nodes) {
		const start = offset;
		offset += node.length;
		//* Leave block-separating whitespace unwrapped to preserve spacing.
		if (!node.data.trim()) continue;
		//* Wrap from the end so earlier text offsets remain valid.
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

/** Keeps code copy buttons fixed while their blocks scroll. */
const wrapCodeBlocks = (root: HTMLElement) =>
	Array.from(root.querySelectorAll("pre"), (pre) => {
		const wrapper = document.createElement("div");
		wrapper.className = "agent-code";
		pre.replaceWith(wrapper);
		wrapper.append(pre);
		return wrapper;
	});

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
			<Show when={copied()} fallback={<TbOutlineCopy size={11} />}>
				<TbOutlineCheck size={11} class="text-success" />
			</Show>
		</button>
	);
};

/** Renders sanitised message markdown with code copy buttons and an optional user-bubble tone. */
const AgentMarkdown: Component<{
	text: string;
	tone?: "reply" | "bubble";
	size?: "sm";
	/** Read once on mount to animate initial text; later text growth always fades in. */
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
	const html = createMemo<string | undefined>((previous) => {
		const text = props.text;
		if (previous === undefined) return renderAgentMarkdownCached(text);
		return scheduled() ? renderAgentMarkdown(text) : previous;
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
