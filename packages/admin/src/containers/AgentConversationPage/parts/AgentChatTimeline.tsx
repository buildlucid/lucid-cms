import type { AgentMessage } from "@types";
import classnames from "classnames";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	onCleanup,
	Show,
} from "solid-js";
import { markdownPreview } from "@/components/AgentMessage/parts/AgentMarkdown";
import T from "@/translations";
import { messageText } from "@/utils/agent-chat";

const endThreshold = 32;

const dashWidth = (distance: number | undefined) => {
	if (distance === 0) return 22;
	if (distance === 1) return 15;
	return 10;
};

/** The agent's first reply to the message at this index with text, skipping turns that only call tools. */
const replyTo = (messages: AgentMessage[], index: number) => {
	for (const message of messages.slice(index + 1)) {
		if (message.role === "user") return undefined;
		const text = messageText(message);
		if (text) return text;
	}
	return undefined;
};

/**
 * A dash for each message the reader sent, down the left of the chat, shown
 * while the chat's column has room beside its messages. Hovering
 * or focusing one previews the message and the agent's reply, selecting it
 * scrolls to the message, and the one being read stands out. Messages carry
 * their id in `data-chat-message` and their role in `data-chat-role`.
 */
const AgentChatTimeline: Component<{
	messages: AgentMessage[];
	viewport?: HTMLElement;
	onSelect: (id: string) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [hovered, setHovered] = createSignal<number>();
	const [cardTop, setCardTop] = createSignal(0);
	const [active, setActive] = createSignal<string>();
	let root: HTMLDivElement | undefined;
	let list: HTMLOListElement | undefined;

	// ----------------------------------------
	// Memos
	const sent = createMemo(() =>
		props.messages.filter((message) => message.role === "user"),
	);
	const preview = createMemo(() => {
		const index = hovered();
		if (index === undefined) return undefined;
		const message = sent()[index];
		if (!message) return undefined;
		const reply = replyTo(props.messages, props.messages.indexOf(message));
		return {
			message: markdownPreview(messageText(message)),
			reply: reply ? markdownPreview(reply) : undefined,
		};
	});

	// ----------------------------------------
	// Functions
	const hover = (index: number, dash: HTMLElement) => {
		if (root) {
			const bounds = dash.getBoundingClientRect();
			setCardTop(
				bounds.top + bounds.height / 2 - root.getBoundingClientRect().top,
			);
		}
		setHovered(index);
	};
	/** The message being read: the last one sent above the middle of the view, or the last on screen at the end. */
	const updateActive = () => {
		const element = props.viewport;
		if (!element) return;
		const bounds = element.getBoundingClientRect();
		const atEnd =
			element.scrollHeight - element.clientHeight - element.scrollTop <=
			endThreshold;
		const line = atEnd ? bounds.bottom : bounds.top + bounds.height / 2;
		let current: string | undefined;
		for (const node of element.querySelectorAll<HTMLElement>(
			'[data-chat-role="user"]',
		)) {
			if (node.getBoundingClientRect().top > line) break;
			current = node.dataset.chatMessage;
		}
		setActive(current ?? sent()[0]?.id);
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const element = props.viewport;
		sent();
		if (!element) return;
		let frame = 0;
		const onScroll = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(updateActive);
		};
		onScroll();
		element.addEventListener("scroll", onScroll, { passive: true });
		onCleanup(() => {
			cancelAnimationFrame(frame);
			element.removeEventListener("scroll", onScroll);
		});
	});
	createEffect(() => {
		const id = active();
		const dash = id
			? list?.querySelector<HTMLElement>(
					`[data-timeline-message="${CSS.escape(id)}"]`,
				)
			: undefined;
		if (!list || !dash) return;
		if (dash.offsetTop < list.scrollTop) list.scrollTop = dash.offsetTop;
		else if (
			dash.offsetTop + dash.offsetHeight >
			list.scrollTop + list.clientHeight
		) {
			list.scrollTop = dash.offsetTop + dash.offsetHeight - list.clientHeight;
		}
	});

	// ----------------------------------------
	// Render
	return (
		<Show when={sent().length > 1}>
			<div
				ref={root}
				class="pointer-events-none absolute inset-y-0 inset-s-2 z-10 hidden items-center @4xl:flex"
			>
				<ol
					ref={list}
					aria-label={T()("agent.chat.timeline")}
					class="pointer-events-auto relative flex max-h-[60%] flex-col overflow-y-auto py-1 scrollbar-none"
					onPointerLeave={() => setHovered(undefined)}
				>
					<For each={sent()}>
						{(message, index) => {
							const id = message.id;
							const label = createMemo(() =>
								markdownPreview(messageText(message)),
							);
							const distance = () => {
								const current = hovered();
								return current === undefined
									? undefined
									: Math.abs(index() - current);
							};

							return (
								<li>
									<button
										type="button"
										data-timeline-message={id}
										class="group flex h-3 w-8 items-center ps-1.5 focus:outline-hidden"
										aria-label={label()}
										aria-current={active() === id ? "location" : undefined}
										onPointerEnter={(event) =>
											hover(index(), event.currentTarget)
										}
										onFocus={(event) => hover(index(), event.currentTarget)}
										onBlur={() => setHovered(undefined)}
										onClick={() => props.onSelect(id)}
									>
										<span
											class={classnames(
												"h-0.5 rounded-full transition-[width,background-color] duration-200 ease-out group-focus-visible:ring-1 group-focus-visible:ring-primary",
												active() === id
													? "bg-title"
													: distance() === 0
														? "bg-body"
														: "bg-muted/40",
											)}
											style={{ width: `${dashWidth(distance())}px` }}
										/>
									</button>
								</li>
							);
						}}
					</For>
				</ol>
				<Show when={preview()}>
					{(current) => (
						<div
							class="absolute inset-s-full w-72 -translate-y-1/2 rounded-lg border border-border bg-popover px-3 py-2 shadow-md motion-safe:animate-fade-in motion-safe:transition-[top] motion-safe:duration-150 motion-safe:ease-out"
							style={{ top: `${cardTop()}px` }}
						>
							<p class="line-clamp-1 text-xs font-medium text-title">
								{current().message}
							</p>
							<Show when={current().reply}>
								{(reply) => (
									<p class="mt-1 line-clamp-2 text-xs leading-5 text-muted">
										{reply()}
									</p>
								)}
							</Show>
						</div>
					)}
				</Show>
			</div>
		</Show>
	);
};

export default AgentChatTimeline;
