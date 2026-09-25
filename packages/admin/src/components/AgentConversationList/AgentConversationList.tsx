import { A } from "@solidjs/router";
import type { AgentConversation } from "@types";
import { FaSolidClock } from "solid-icons/fa";
import { type Component, createSignal, For, Show } from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import AgentRunStatus from "@/components/AgentRunStatus/AgentRunStatus";
import DateText from "@/components/DateText/DateText";
import DeleteAgentConversationModal from "@/components/DeleteAgentConversationModal/DeleteAgentConversationModal";
import RenameAgentConversationModal from "@/components/RenameAgentConversationModal/RenameAgentConversationModal";
import T from "@/translations";

//* a finished chat needs no badge, but a routine run's outcome is worth seeing
const visibleRun = (conversation: AgentConversation) => {
	const run = conversation.latestRun;
	if (!run || conversation.routineId) return run;
	return run.status === "completed" || run.status === "cancelled"
		? undefined
		: run;
};

/** Conversations as rows that open the chat, with rename and delete actions. */
const AgentConversationList: Component<{
	conversations: AgentConversation[];
}> = (props) => {
	// ----------------------------------------
	// State
	const [selected, setSelected] = createSignal<AgentConversation>();
	const [renameOpen, setRenameOpen] = createSignal(false);
	const [deleteOpen, setDeleteOpen] = createSignal(false);

	// ----------------------------------------
	// Render
	return (
		<>
			<ul class="overflow-hidden rounded-md border border-border bg-card">
				<For each={props.conversations}>
					{(conversation) => (
						<li class="group relative flex items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-card-hover">
							<A
								href={`/lucid/agent/chats/${conversation.id}`}
								class="min-w-0 grow after:absolute after:inset-0 focus:outline-hidden focus-visible:after:ring-1 focus-visible:after:ring-inset focus-visible:after:ring-primary"
							>
								<span class="flex items-center gap-2">
									<Show when={conversation.routineId}>
										<FaSolidClock
											class="size-3 shrink-0 text-icon"
											aria-label={T()("agent.routine.run")}
										/>
									</Show>
									<span class="truncate text-sm font-medium text-title">
										{conversation.title}
									</span>
								</span>
								<DateText
									date={conversation.updatedAt}
									includeTime={true}
									class="mt-0.5 block text-xs text-muted"
								/>
							</A>
							<Show when={visibleRun(conversation)}>
								{(run) => (
									<AgentRunStatus
										status={run().status}
										outcome={run().outcome}
									/>
								)}
							</Show>
							<div class="relative z-10">
								<ActionMenu
									actions={[
										{
											label: T()("common.rename"),
											type: "button",
											icon: "pen",
											onClick: () => {
												setSelected(conversation);
												setRenameOpen(true);
											},
										},
										{
											label: T()("common.delete"),
											type: "button",
											icon: "trash",
											variant: "danger",
											onClick: () => {
												setSelected(conversation);
												setDeleteOpen(true);
											},
										},
									]}
								/>
							</div>
						</li>
					)}
				</For>
			</ul>
			<RenameAgentConversationModal
				conversation={selected}
				state={{ open: renameOpen(), setOpen: setRenameOpen }}
			/>
			<DeleteAgentConversationModal
				id={() => selected()?.id}
				state={{ open: deleteOpen(), setOpen: setDeleteOpen }}
			/>
		</>
	);
};

export default AgentConversationList;
