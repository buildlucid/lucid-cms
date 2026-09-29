import type { AiUsageRecord } from "@types";
import { type Component, Show } from "solid-js";
import Pill from "@/components/Pill/Pill";
import Table from "@/components/Table/Table";
import T from "@/translations";
import {
	formatAiCredits,
	formatAiUsageMeasure,
	getAiUsageFeatureLabel,
} from "@/utils/ai-usage";
import formatDuration from "@/utils/format-duration";
import spawnToast from "@/utils/spawn-toast";

const AiUsageRecordTableRow: Component<{
	index: number;
	record: AiUsageRecord;
}> = (props) => {
	// ----------------------------------------
	// Functions
	const copyRequestId = async () => {
		await navigator.clipboard.writeText(props.record.requestId);
		spawnToast({
			title: T()("toasts.common.copy.to.clipboard.title"),
			status: "success",
		});
	};

	// ----------------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			actions={[
				{
					label: T()("ai.usage.request.id.copy"),
					type: "button",
					icon: "copy",
					onClick: () => void copyRequestId(),
					excludeFromRowClick: true,
				},
			]}
		>
			<Table.Cell column="request" minWidth={200}>
				<div class="flex min-w-0 flex-col gap-0.5">
					<div class="flex items-center gap-2">
						<span class="truncate text-sm text-title">
							{getAiUsageFeatureLabel(props.record.feature.key)}
						</span>
						<Show when={props.record.status !== "success"}>
							<Pill
								variant={
									props.record.status === "failed" ? "danger-subtle" : "outline"
								}
								size="xs"
							>
								{T()(`common.status.${props.record.status}`)}
							</Pill>
						</Show>
					</div>
					<Show when={props.record.errorMessage}>
						{(message) => (
							<span class="line-clamp-1 text-xs text-muted" title={message()}>
								{message()}
							</span>
						)}
					</Show>
				</div>
			</Table.Cell>
			<Table.Text
				column="usage"
				text={formatAiUsageMeasure(props.record.usage)}
				maxLines={1}
			/>
			<Table.Text
				column="model"
				text={
					props.record.usage?.kind === "model" ? props.record.usage.model : "-"
				}
				maxLines={1}
			/>
			<Table.Text
				column="credits"
				text={formatAiCredits(props.record.credits)}
			/>
			<Table.Text
				column="duration"
				text={formatDuration(props.record.durationMs)}
			/>
			<Table.Date
				column="createdAt"
				date={props.record.createdAt}
				includeTime={true}
			/>
		</Table.Row>
	);
};

export default AiUsageRecordTableRow;
