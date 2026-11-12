import { A } from "@solidjs/router";
import type { AgentSubagent } from "@types";
import classnames from "classnames";
import { TbOutlineSubtask } from "solid-icons/tb";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import api from "@/services/api";
import T from "@/translations";
import { getAgentName } from "@/utils/agent-access";
import { getAgentRunDisplay, isRunBusy } from "@/utils/agent-chat";

const shownSubagents = 3;

/** The sub-agents a chat started, working ones first and then newest first. Shows nothing for chats without any. */
const AgentChatSubagents: Component<{
	conversationId: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [showAll, setShowAll] = createSignal(false);

	// ----------------------------------------
	// Queries & Mutations
	//* shares the chat's query, which keeps it up to date while sub-agents work
	const subagents = api.agent.useGetSubagents({
		id: () => props.conversationId,
	});

	// ----------------------------------------
	// Memos
	const sorted = createMemo(() =>
		(subagents.data?.data.subagents ?? []).toSorted(
			(a, b) =>
				Number(isRunBusy(b.latestRun)) - Number(isRunBusy(a.latestRun)) ||
				(b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
		),
	);
	const visible = createMemo(() =>
		showAll() ? sorted() : sorted().slice(0, shownSubagents),
	);

	// ----------------------------------------
	// Render
	return (
		<Show when={sorted().length}>
			<section
				aria-labelledby="agent-chat-subagents-title"
				class="flex flex-col gap-2 border-t border-border pt-4"
			>
				<h4
					id="agent-chat-subagents-title"
					class="flex items-baseline justify-between text-xs text-muted"
				>
					{T()("agent.subagent.title")}
					<span class="tabular-nums">{sorted().length}</span>
				</h4>
				<ul class="flex flex-col gap-0.5">
					<For each={visible()}>
						{(subagent) => (
							<li>
								<SubagentRow subagent={subagent} />
							</li>
						)}
					</For>
				</ul>
				<Show when={sorted().length > shownSubagents}>
					<button
						type="button"
						class="self-start rounded-sm text-2xs text-muted transition-colors hover:text-body focus-ring"
						aria-expanded={showAll()}
						onClick={() => setShowAll((value) => !value)}
					>
						{showAll()
							? T()("common.show_less")
							: T()("agent.tool.group.show", {
									count: sorted().length - shownSubagents,
								})}
					</button>
				</Show>
			</section>
		</Show>
	);
};

/** A sub-agent's chat, with its agent and how its latest run is going beneath its title. */
const SubagentRow: Component<{
	subagent: AgentSubagent;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const status = createMemo(() => {
		const run = props.subagent.latestRun;
		return run
			? getAgentRunDisplay(run.status, run.outcome, run.waitingFor)
			: undefined;
	});

	// ----------------------------------------
	// Render
	return (
		<A
			href={`/admin/agent/chats/${props.subagent.id}`}
			class="-mx-1.5 flex min-w-0 items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-card-hover focus-ring"
		>
			<span
				aria-hidden="true"
				class="flex h-9 w-7 shrink-0 items-center justify-center rounded-sm border border-border bg-input text-muted"
			>
				<TbOutlineSubtask
					size={10}
					class={classnames({
						"animate-pulse": isRunBusy(props.subagent.latestRun),
					})}
				/>
			</span>
			<span class="flex min-w-0 grow flex-col">
				<span class="truncate text-xs text-title">{props.subagent.title}</span>
				<span class="truncate text-2xs leading-4 text-muted">
					{getAgentName(props.subagent.agentKey)}
					<Show when={status()}>
						{(status) => (
							<>
								{" · "}
								<span
									class={classnames({
										"text-warning": props.subagent.pending !== null,
									})}
								>
									{props.subagent.pending !== null
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
