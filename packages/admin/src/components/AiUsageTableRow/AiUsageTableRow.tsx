import type { AiUsage } from "@types";
import type { Component } from "solid-js";
import Table from "@/components/Table/Table";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import T from "@/translations";
import formatAiCost from "@/utils/format-ai-cost";
import formatDuration from "@/utils/format-duration";
import AiUsageUsageCell from "./parts/AiUsageUsageCell";

interface AiUsageRowProps {
	index: number;
	aiUsage: AiUsage;
}

const AiUsageTableRow: Component<AiUsageRowProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Table.Row index={props.index}>
			<Table.Pill
				column="status"
				text={
					props.aiUsage.status === "success"
						? T()("common.status.success")
						: T()("common.status.pending")
				}
				variant={
					props.aiUsage.status === "success" ? "primary-subtle" : "outline"
				}
			/>
			<Table.Text
				column="feature"
				text={props.aiUsage.feature.label || props.aiUsage.feature.key}
				maxLines={1}
			/>
			<AiUsageUsageCell column="usage" aiUsage={props.aiUsage} />
			<Table.Text
				column="cost"
				text={formatAiCost(props.aiUsage.cost ?? undefined)}
			/>
			<Table.Cell column="user">
				{props.aiUsage.user ? (
					<UserDisplay
						user={props.aiUsage.user}
						variant="horizontal"
						size="xs"
						nameFormat="simple"
					/>
				) : (
					<span class="text-sm text-body">{T()("common.none")}</span>
				)}
			</Table.Cell>
			<Table.Text
				column="durationMs"
				text={formatDuration(props.aiUsage.durationMs)}
			/>
			<Table.Date
				column="createdAt"
				date={props.aiUsage.createdAt}
				includeTime={true}
			/>
		</Table.Row>
	);
};

export default AiUsageTableRow;
