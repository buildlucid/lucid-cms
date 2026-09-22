import type { PublishOperation } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import Table from "@/components/Table/Table";
import T from "@/translations";
import {
	hasPublishOperationContextChanged,
	hasPublishOperationRequirementDrift,
} from "@/utils/publish-operations";

const ReleaseRequestTitleCell: Component<{
	column?: string;
	request: PublishOperation;
	collectionLabel: string;
}> = (props) => {
	// ----------------------------------
	// Memos
	const releaseContextChanged = createMemo(() =>
		hasPublishOperationContextChanged(props.request),
	);
	const releaseContextTooltip = createMemo(() =>
		hasPublishOperationRequirementDrift(props.request)
			? T()("publish.requests.context.changed")
			: T()("publish.requests.snapshot.outdated"),
	);

	// ----------------------------------
	// Render
	return (
		<Table.Cell column={props.column}>
			<div class="min-w-0">
				<div class="flex min-w-0 items-center gap-2">
					<StatusIndicator
						variant={
							releaseContextChanged() ? "warning-subtle" : "success-subtle"
						}
						label={
							releaseContextChanged()
								? releaseContextTooltip()
								: T()("common.status.in.sync")
						}
					/>
					<span class="truncate text-sm font-normal text-title">
						{props.request.documentLabel ||
							`${props.collectionLabel} #${props.request.documentId}`}
					</span>
				</div>
				<div class="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-body">
					<Show when={props.request.documentLabel}>
						<span class="truncate">
							{props.collectionLabel} #{props.request.documentId}
						</span>
					</Show>
					<Show when={props.request.documentLabel}>
						<span class="text-border">/</span>
					</Show>
					<span class="truncate text-xs text-body">
						{T()("documents.release.request")} #{props.request.id}
					</span>
					<span class="text-border">/</span>
					<span class="capitalize text-xs text-body">
						{props.request.target}
					</span>
				</div>
			</div>
		</Table.Cell>
	);
};

export default ReleaseRequestTitleCell;
