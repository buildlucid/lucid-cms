import type { AiUsage } from "@types";
import type { Component } from "solid-js";
import type { TableTheme } from "@/components/Table/Table";
import { TableCell } from "@/components/TableCell/TableCell";
import TableDateCell from "@/components/TableDateCell/TableDateCell";
import TablePillCell from "@/components/TablePillCell/TablePillCell";
import { TableRow } from "@/components/TableRow/TableRow";
import TableTextCell from "@/components/TableTextCell/TableTextCell";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";
import formatAiCost from "@/utils/format-ai-cost";
import formatDuration from "@/utils/format-duration";
import AiUsageUsageCol from "./parts/AiUsageUsageCol";

interface AiUsageRowProps extends TableRowProps {
	aiUsage: AiUsage;
	include: boolean[];
	theme?: TableTheme;
}

const AiUsageTableRow: Component<AiUsageRowProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<TableRow
			index={props.index}
			selected={props.selected}
			options={props.options}
			callbacks={props.callbacks}
			theme={props.theme}
		>
			<TablePillCell
				text={
					props.aiUsage.status === "success"
						? T()("common.status.success")
						: T()("common.status.pending")
				}
				theme={
					props.aiUsage.status === "success" ? "primary-opaque" : "outline"
				}
				options={{ include: props.include[0] }}
			/>
			<TableTextCell
				text={props.aiUsage.feature.label || props.aiUsage.feature.key}
				options={{ include: props.include[1], maxLines: 1 }}
			/>
			<AiUsageUsageCol
				aiUsage={props.aiUsage}
				options={{ include: props.include[2] }}
			/>
			<TableTextCell
				text={formatAiCost(props.aiUsage.cost ?? undefined)}
				options={{ include: props.include[3] }}
			/>
			<TableCell options={{ include: props.include[4] }}>
				{props.aiUsage.user ? (
					<UserDisplay
						user={props.aiUsage.user}
						mode="short"
						size="x-small"
						nameFormat="simple"
					/>
				) : (
					<span class="text-sm text-body">{T()("common.none")}</span>
				)}
			</TableCell>
			<TableTextCell
				text={formatDuration(props.aiUsage.durationMs)}
				options={{ include: props.include[5] }}
			/>
			<TableDateCell
				date={props.aiUsage.createdAt}
				includeTime={true}
				options={{ include: props.include[6] }}
			/>
		</TableRow>
	);
};

export default AiUsageTableRow;
