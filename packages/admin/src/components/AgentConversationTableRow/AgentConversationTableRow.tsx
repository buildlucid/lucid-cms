import type { AgentConversation } from "@types";
import { type Component, Show } from "solid-js";
import AgentRunStatus from "@/components/AgentRunStatus/AgentRunStatus";
import Table from "@/components/Table/Table";
import T from "@/translations";
import { getAgentName } from "@/utils/agent-access";
import { aiUsageSessionHref, canViewAiUsage } from "@/utils/ai-usage";

/** One conversation in the history table. Clicking the row opens the chat. */
const AgentConversationTableRow: Component<{
	index: number;
	conversation: AgentConversation;
	onRename: () => void;
	onDelete: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			actions={[
				{
					label: T()("common.open"),
					type: "link",
					icon: "eye",
					href: `/lucid/agent/chats/${props.conversation.id}`,
				},
				{
					label: T()("ai.usage.view"),
					type: "link",
					icon: "chart",
					href: aiUsageSessionHref({
						type: "agent",
						id: props.conversation.id,
					}),
					show: canViewAiUsage(),
				},
				{
					label: T()("common.rename"),
					type: "button",
					icon: "pen",
					onClick: props.onRename,
					excludeFromRowClick: true,
				},
				{
					label: T()("common.delete"),
					type: "button",
					icon: "trash",
					variant: "danger",
					onClick: props.onDelete,
					excludeFromRowClick: true,
				},
			]}
		>
			<Table.Text
				column="title"
				text={props.conversation.title}
				href={`/lucid/agent/chats/${props.conversation.id}`}
				minWidth={320}
				maxLines={1}
			/>
			<Table.Cell column="status" minWidth={140}>
				<Show
					when={props.conversation.latestRun}
					fallback={<span class="text-sm text-muted">-</span>}
				>
					{(run) => (
						<AgentRunStatus
							status={run().status}
							outcome={run().outcome}
							size="sm"
						/>
					)}
				</Show>
			</Table.Cell>
			<Table.Text
				column="agentKey"
				text={getAgentName(props.conversation.agentKey)}
				minWidth={160}
				maxLines={1}
			/>
			<Table.Text
				column="type"
				text={T()(
					props.conversation.routineId
						? "agent.routine.run"
						: "agent.history.type.chat",
				)}
				minWidth={140}
			/>
			<Table.Date
				column="updatedAt"
				date={props.conversation.updatedAt}
				includeTime={true}
			/>
			<Table.Date
				column="createdAt"
				date={props.conversation.createdAt}
				includeTime={true}
			/>
		</Table.Row>
	);
};

export default AgentConversationTableRow;
