import { A } from "@solidjs/router";
import type { AgentConversation } from "@types";
import classnames from "classnames";
import { TbOutlineMessage } from "solid-icons/tb";
import { type Component, createMemo, For, Show } from "solid-js";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import api from "@/services/api";
import T from "@/translations";
import { getAgentName } from "@/utils/agent-access";
import { getAgentRunDisplay, isRunBusy } from "@/utils/agent-chat";

/** The chat that started the sub-agents, with each sub-agent branching off beneath it, for moving between them. Shows nothing for chats without any. */
const AgentChatSubagents: Component<{
	/** The chat open on the page. */
	conversationId: string;
}> = (props) => {
	// ----------------------------------------
	// Queries & Mutations
	//* shares the chat's query, which keeps it up to date while sub-agents work
	const subagents = api.agent.useGetSubagents({
		id: () => props.conversationId,
	});

	// ----------------------------------------
	// Memos
	const family = createMemo(() => {
		const data = subagents.data?.data;
		return data?.subagents.length ? data : undefined;
	});

	// ----------------------------------------
	// Render
	return (
		<Show when={family()}>
			{(family) => (
				<section
					aria-labelledby="agent-chat-subagents-title"
					class="flex flex-col gap-2 border-t border-border pt-4"
				>
					<h4
						id="agent-chat-subagents-title"
						class="flex items-baseline justify-between text-xs text-muted"
					>
						{T()("agent.subagent.title")}
						<span class="tabular-nums">{family().subagents.length}</span>
					</h4>
					{/* the rows' padding spaces them from each other, so the last one's doesn't widen the gap before the next section */}
					<ul class="-mb-1">
						<li>
							<SubagentLink
								conversation={family().parent}
								current={family().parent.id === props.conversationId}
								parent={true}
							/>
							{/* a line runs down from the parent's icon and branches off to each sub-agent's status dot */}
							<ul class="relative ms-1.5 before:absolute before:-top-4.5 before:h-4.5 before:border-s before:border-body/25 before:start-0">
								<For each={family().subagents}>
									{(subagent) => (
										<li class="relative ps-3.5 before:absolute before:top-0 before:h-3 before:w-2.5 before:rounded-es-md before:border-s before:border-b before:border-body/25 before:start-0 not-last:after:absolute not-last:after:top-1.5 not-last:after:bottom-0 not-last:after:border-s not-last:after:border-body/25 not-last:after:start-0">
											<SubagentLink
												conversation={subagent}
												current={subagent.id === props.conversationId}
												pending={subagent.pending !== null}
											/>
										</li>
									)}
								</For>
							</ul>
						</li>
					</ul>
				</section>
			)}
		</Show>
	);
};

/** One chat in the tree, marked by its status dot, with its agent and status beneath its title. */
const SubagentLink: Component<{
	conversation: AgentConversation;
	current: boolean;
	/** Whether it's the chat that started the sub-agents, which gets a chat icon in place of the dot. */
	parent?: boolean;
	/** Whether it waits on the person's confirmation. */
	pending?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const status = createMemo(() => {
		const run = props.conversation.latestRun;
		return run
			? getAgentRunDisplay(run.status, run.outcome, run.waitingFor)
			: undefined;
	});

	// ----------------------------------------
	// Render
	return (
		<A
			href={`/admin/agent/chats/${props.conversation.id}`}
			aria-current={props.current ? "page" : undefined}
			class="group -mx-1 flex gap-2 rounded-md px-1 py-1 text-start focus-ring"
		>
			<span
				class="flex h-4 w-3.25 shrink-0 items-center text-muted"
				aria-hidden="true"
			>
				<Show
					when={props.parent}
					fallback={
						<StatusIndicator
							size="xs"
							variant={status()?.variant}
							class={classnames({
								"animate-pulse": isRunBusy(props.conversation.latestRun),
							})}
						/>
					}
				>
					<TbOutlineMessage size={14} />
				</Show>
			</span>
			<span class="min-w-0 grow">
				<span
					class={classnames(
						"block truncate text-xs transition-colors",
						props.current
							? "font-medium text-title"
							: "text-body group-hover:text-title",
					)}
				>
					{props.conversation.title}
				</span>
				<span class="block truncate text-2xs leading-4 text-muted">
					{getAgentName(props.conversation.agentKey)}
					<Show when={status()}>
						{(status) => (
							<>
								{" · "}
								<span class={classnames({ "text-warning": props.pending })}>
									{props.pending
										? T()("agent.subagent.confirmation")
										: status().label}
								</span>
							</>
						)}
					</Show>
				</span>
			</span>
		</A>
	);
};

export default AgentChatSubagents;
