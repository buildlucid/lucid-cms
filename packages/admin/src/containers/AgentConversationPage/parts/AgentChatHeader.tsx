import type { AgentConversation } from "@types";
import { type Component, type JSXElement, Show } from "solid-js";
import Pill from "@/components/Pill/Pill";
import { getAgentName } from "@/utils/agent-access";

/** The top of the chat column: the agent, the chat's title and its actions. It stays put while the messages scroll. */
const AgentChatHeader: Component<{
	conversation?: AgentConversation;
	actions: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<header class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
			<Show
				when={props.conversation}
				fallback={<span class="skeleton block h-5 w-48" />}
			>
				{(conversation) => (
					<div class="flex min-w-0 items-center gap-2.5">
						<Pill size="sm" variant="neutral" class="shrink-0">
							{getAgentName(conversation().agentKey)}
						</Pill>
						<h1 class="min-w-0 truncate text-base font-medium text-title">
							{conversation().title}
						</h1>
					</div>
				)}
			</Show>
			<div class="flex shrink-0 items-center gap-2">{props.actions}</div>
		</header>
	);
};

export default AgentChatHeader;
