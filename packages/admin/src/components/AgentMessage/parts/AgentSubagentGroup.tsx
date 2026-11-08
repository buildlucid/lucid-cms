import type { AgentSubagentWidgetData } from "@lucidcms/types";
import { A } from "@solidjs/router";
import type { AgentMessagePart, AgentSubagent, AgentWidgetPart } from "@types";
import { TbOutlineSubtask } from "solid-icons/tb";
import { type Component, createMemo, For, Show } from "solid-js";
import AgentChatThumb from "@/components/AgentChatThumb/AgentChatThumb";
import AgentRunStatus from "@/components/AgentRunStatus/AgentRunStatus";
import Skeleton from "@/components/Skeleton/Skeleton";
import api from "@/services/api";
import T from "@/translations";
import { getAgentName } from "@/utils/agent-access";
import {
	type AgentPartGroup,
	isSubagentWidgetData,
	isWidgetSupported,
	subagentWidget,
} from "@/utils/agent-tools";

type SubagentPart = AgentWidgetPart & { data: AgentSubagentWidgetData };

/** Matches a sub-agent a reply started. Consecutive ones share a card. */
export const isSubagentPart = (part: AgentMessagePart): part is SubagentPart =>
	part.type === "widget" &&
	part.key === subagentWidget &&
	isWidgetSupported(part) &&
	isSubagentWidgetData(part.data);

/** Lists the sub-agents a reply started in a card like its references, with their live status. */
const AgentSubagentGroup: Component<{
	/** The chat that started the sub-agents. */
	conversationId: string;
	group: AgentPartGroup<SubagentPart>;
}> = (props) => {
	// ----------------------------------------
	// Queries & Mutations
	const subagents = api.agent.useGetSubagents({
		id: () => props.conversationId,
	});

	// ----------------------------------------
	// Memos
	const live = createMemo(
		() =>
			new Map(
				(subagents.data?.data.subagents ?? []).map((subagent) => [
					subagent.id,
					subagent,
				]),
			),
	);

	// ----------------------------------------
	// Render
	return (
		<section class="rounded-2xl border border-border bg-card">
			<div class="flex items-center gap-2 px-3.5 py-2">
				<TbOutlineSubtask size={11} class="shrink-0 text-muted" />
				<span class="min-w-0 grow truncate text-xs text-muted">
					{T()("agent.subagent.title")}
				</span>
				<span class="shrink-0 text-xs text-muted tabular-nums">
					{props.group.parts.length === 1
						? T()("agent.subagent.count.one")
						: T()("agent.subagent.count", {
								count: props.group.parts.length,
							})}
				</span>
			</div>
			<ul class="flex flex-col border-t border-border p-1.5">
				<For each={props.group.parts}>
					{(part) => (
						<SubagentRow
							conversationId={part.data.conversationId}
							agentKey={part.data.agentKey}
							subagent={live().get(part.data.conversationId)}
							loading={subagents.isPending}
						/>
					)}
				</For>
			</ul>
		</section>
	);
};

/** A sub-agent linking to its chat, laid out like a reference row. Shows its agent as the title when it can't be loaded. */
const SubagentRow: Component<{
	conversationId: string;
	agentKey: string;
	subagent?: AgentSubagent;
	loading: boolean;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<li>
			<A
				href={`/admin/agent/chats/${props.conversationId}`}
				class="flex min-w-0 items-center gap-2.5 rounded-md p-1.5 text-start transition-colors hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
			>
				<AgentChatThumb />
				<div class="min-w-0 flex-1">
					<Show
						when={!props.loading}
						fallback={
							<Skeleton class="py-0.5">
								<span class="skeleton block h-3 w-32" />
							</Skeleton>
						}
					>
						<span class="block truncate text-xs text-title">
							{props.subagent?.title ?? getAgentName(props.agentKey)}
						</span>
					</Show>
					<Show when={props.loading || props.subagent}>
						<span class="block truncate text-[11px] text-muted">
							{[
								getAgentName(props.agentKey),
								props.subagent?.pending
									? T()("agent.subagent.confirmation")
									: undefined,
							]
								.filter(Boolean)
								.join(" · ")}
						</span>
					</Show>
				</div>
				<Show when={props.subagent?.latestRun}>
					{(run) => (
						<AgentRunStatus
							status={run().status}
							outcome={run().outcome}
							waitingFor={run().waitingFor}
							class="shrink-0"
						/>
					)}
				</Show>
			</A>
		</li>
	);
};

export default AgentSubagentGroup;
