import { useQueryClient } from "@tanstack/solid-query";
import type { AgentInteractionAction, AgentSubagent } from "@types";
import { type Component, createMemo, For, Show } from "solid-js";
import AgentWidget from "@/components/AgentWidget/AgentWidget";
import type { AgentWidgetSubmitResult } from "@/components/AgentWidget/types";
import api from "@/services/api";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import { getAgentName } from "@/utils/agent-access";

/** Confirmations a chat's sub-agents wait on, answered from the chat that started them. */
const AgentSubagentConfirmations: Component<{
	conversationId: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const queryClient = useQueryClient();

	// ----------------------------------------
	// Queries & Mutations
	const subagents = api.agent.useGetSubagents({
		id: () => props.conversationId,
	});

	// ----------------------------------------
	// Memos
	//* a sub-agent's chat lists its siblings, whose confirmations belong to the chat that started them
	const waiting = createMemo(() => {
		const family = subagents.data?.data;
		return family?.parent.id === props.conversationId
			? family.subagents.filter((subagent) => subagent.pending)
			: [];
	});

	// ----------------------------------------
	// Functions
	const respond = async (
		subagent: AgentSubagent,
		interactionId: string,
		response: Record<string, unknown>,
		action: AgentInteractionAction = "submit",
	): Promise<AgentWidgetSubmitResult> => {
		const runId = subagent.latestRun?.id;
		if (!runId) return { error: T()("agent.interaction.failed") };
		try {
			return await api.agent.respondToRun({
				runId,
				interactionId,
				response,
				action,
			});
		} catch {
			return { error: T()("agent.interaction.failed") };
		} finally {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: queryKeys.agent.subagents(props.conversationId),
				}),
				//* answering resolves the sub-agent's "input needed" notification
				queryClient.invalidateQueries({
					queryKey: queryKeys.notifications.summary(),
				}),
			]);
		}
	};

	// ----------------------------------------
	// Render
	return (
		<For each={waiting()}>
			{(subagent) => (
				<Show when={subagent.pending}>
					{(pending) => (
						<section class="flex flex-col gap-1.5 motion-safe:animate-rise-in">
							<h3 class="text-xs text-muted">
								{T()("agent.subagent.confirmations.label", {
									agent: getAgentName(subagent.agentKey),
								})}
							</h3>
							<AgentWidget
								widget={pending()}
								view="composer"
								onRespond={(interactionId, response, action) =>
									respond(subagent, interactionId, response, action)
								}
							/>
						</section>
					)}
				</Show>
			)}
		</For>
	);
};

export default AgentSubagentConfirmations;
