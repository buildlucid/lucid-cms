import type { AgentRun } from "@types";
import type { Component } from "solid-js";
import AgentRunStatus from "@/components/AgentRunStatus/AgentRunStatus";
import Table from "@/components/Table/Table";
import T from "@/translations";
import {
	aiUsageSessionHref,
	canViewAiUsage,
	formatAiCredits,
} from "@/utils/ai-usage";

const AgentRunTableRow: Component<{
	index: number;
	run: AgentRun;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			actions={[
				{
					label: T()("agent.routine.run.open"),
					type: "link",
					icon: "eye",
					href: `/lucid/agent/chats/${props.run.conversationId}`,
				},
				{
					label: T()("ai.usage.view"),
					type: "link",
					icon: "chart",
					href: aiUsageSessionHref({
						type: "agent",
						id: props.run.conversationId,
					}),
					show: canViewAiUsage(),
				},
			]}
		>
			<Table.Cell column="status">
				<AgentRunStatus
					status={props.run.status}
					outcome={props.run.outcome}
					size="sm"
				/>
			</Table.Cell>
			<Table.Text
				column="summary"
				text={
					props.run.summary ??
					props.run.errorMessage ??
					T()("agent.routine.run.no.summary")
				}
				minWidth={420}
				maxLines={1}
			/>
			<Table.Text
				column="credits"
				text={formatAiCredits(props.run.usage.credits)}
				minWidth={100}
			/>
			<Table.Date
				column="createdAt"
				date={props.run.createdAt}
				includeTime={true}
			/>
			<Table.Date
				column="finishedAt"
				date={props.run.finishedAt}
				includeTime={true}
			/>
		</Table.Row>
	);
};

export default AgentRunTableRow;
