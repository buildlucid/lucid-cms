import type { AgentConversation } from "@types";
import classnames from "classnames";
import {
	type Component,
	createEffect,
	createSignal,
	type JSXElement,
	onCleanup,
	Show,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import Pill from "@/components/Pill/Pill";
import T from "@/translations";
import { getAgentName } from "@/utils/agent-access";

/** The top of a chat: the agent, the chat's title and its actions. It stays put while the messages scroll. */
const AgentChatHeader: Component<{
	conversation?: AgentConversation;
	/** Shown when there is no chat to load, eg. before a new one starts. Otherwise a missing chat shows as loading. */
	emptyTitle?: string;
	/** The panel sits beside a page's own heading, so it uses a smaller inset and a second-level heading. @default "page" */
	variant?: "page" | "panel";
	actions: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [displayTitle, setDisplayTitle] = createSignal("");
	let previous: AgentConversation | undefined;

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const current = props.conversation;
		const old = previous;
		previous = current;
		if (!current) return;
		if (
			old?.id !== current.id ||
			current.titleStatus !== "generated" ||
			old.title === current.title ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			setDisplayTitle(current.title);
			return;
		}

		const next = Array.from(current.title);
		let deleting = Array.from(old.title).length;
		let typing = 0;
		const interval = window.setInterval(() => {
			if (deleting > 0) {
				deleting = Math.max(0, deleting - 4);
				setDisplayTitle(Array.from(old.title).slice(0, deleting).join(""));
				return;
			}
			typing = Math.min(next.length, typing + 2);
			setDisplayTitle(next.slice(0, typing).join(""));
			if (typing === next.length) window.clearInterval(interval);
		}, 20);
		onCleanup(() => window.clearInterval(interval));
	});

	// ----------------------------------------
	// Render
	return (
		<header
			class={classnames(
				"flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3",
				{ "md:px-6": props.variant !== "panel" },
			)}
		>
			<Show
				when={props.conversation}
				fallback={
					<Show
						when={props.emptyTitle}
						fallback={<span class="skeleton block h-5 w-48" />}
					>
						{(title) => (
							<Dynamic
								component={props.variant === "panel" ? "h2" : "h1"}
								class="min-w-0 truncate text-sm font-medium text-title"
							>
								{title()}
							</Dynamic>
						)}
					</Show>
				}
			>
				{(conversation) => (
					<div class="flex min-w-0 items-center gap-2.5">
						<Pill size="sm" variant="neutral" class="shrink-0">
							{getAgentName(conversation().agentKey)}
						</Pill>
						<Show when={conversation().routineId}>
							<Pill
								size="sm"
								variant="primary-subtle"
								class="shrink-0 lg:hidden"
							>
								{T()("agent.routine.run")}
							</Pill>
						</Show>
						<Dynamic
							component={props.variant === "panel" ? "h2" : "h1"}
							class="min-w-0 truncate text-sm font-medium text-title"
						>
							{displayTitle()}
						</Dynamic>
					</div>
				)}
			</Show>
			<div class="flex shrink-0 items-center gap-2">{props.actions}</div>
		</header>
	);
};

export default AgentChatHeader;
