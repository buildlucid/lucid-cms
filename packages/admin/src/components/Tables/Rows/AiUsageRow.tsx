import type { AiUsage } from "@types";
import type { Component } from "solid-js";
import type { TableTheme } from "@/components/Groups/Table/Table";
import { Td } from "@/components/Groups/Table/Td";
import { Tr } from "@/components/Groups/Table/Tr";
import UserDisplay from "@/components/Partials/UserDisplay";
import AiUsageUsageCol from "@/components/Tables/Columns/AiUsageUsageCol";
import DateCol from "@/components/Tables/Columns/DateCol";
import PillCol from "@/components/Tables/Columns/PillCol";
import TextCol from "@/components/Tables/Columns/TextCol";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";
import { formatAiUsageDuration } from "@/utils/ai-usage";
import formatAiCost from "@/utils/format-ai-cost";

interface AiUsageRowProps extends TableRowProps {
	aiUsage: AiUsage;
	include: boolean[];
	theme?: TableTheme;
}

const AiUsageRow: Component<AiUsageRowProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Tr
			index={props.index}
			selected={props.selected}
			options={props.options}
			callbacks={props.callbacks}
			theme={props.theme}
		>
			<PillCol
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
			<TextCol
				text={props.aiUsage.feature.label || props.aiUsage.feature.key}
				options={{ include: props.include[1], maxLines: 1 }}
			/>
			<AiUsageUsageCol
				aiUsage={props.aiUsage}
				options={{ include: props.include[2] }}
			/>
			<TextCol
				text={formatAiCost(props.aiUsage.cost ?? undefined)}
				options={{ include: props.include[3] }}
			/>
			<Td options={{ include: props.include[4] }}>
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
			</Td>
			<TextCol
				text={formatAiUsageDuration(props.aiUsage.durationMs)}
				options={{ include: props.include[5] }}
			/>
			<DateCol
				date={props.aiUsage.createdAt}
				includeTime={true}
				options={{ include: props.include[6] }}
			/>
		</Tr>
	);
};

export default AiUsageRow;
