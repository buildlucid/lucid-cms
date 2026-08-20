import { A } from "@solidjs/router";
import type { Collection, PublishOperation } from "@types";
import classNames from "classnames";
import {
	FaSolidArrowUpRightFromSquare,
	FaSolidCalendar,
	FaSolidEye,
	FaSolidLock,
} from "solid-icons/fa";
import { type Accessor, type Component, createMemo, Show } from "solid-js";
import DateText from "@/components/Partials/DateText";
import T from "@/translations";
import helpers from "@/utils/helpers";
import {
	getPublishOperationExecutionStatusDotClass,
	getPublishOperationExecutionStatusLabel,
	getPublishOperationStatusDotClass,
} from "@/utils/publish-operations";
import { getDocumentRoute } from "@/utils/route-helpers";
import { formatTargetName } from "../helpers";

const iconActionClasses =
	"inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-input-base/60 text-icon-base transition-colors hover:bg-card-hover hover:text-title focus:outline-hidden focus-visible:ring-1 ring-inset ring-primary-base";
const disabledActionClasses =
	"inline-flex size-8 shrink-0 cursor-not-allowed items-center justify-center rounded-md border border-border bg-input-base/30 text-icon-faded opacity-60";

const PublishRequestRow: Component<{
	collection: Accessor<Collection | undefined>;
	request: PublishOperation;
	onSchedule: (_operation: PublishOperation) => void;
}> = (props) => {
	// ----------------------------------
	// Memos
	const isPendingRequest = createMemo(() => props.request.status === "pending");
	const statusLabel = createMemo(() =>
		isPendingRequest()
			? T()("common.status.pending")
			: getPublishOperationExecutionStatusLabel(props.request.executionStatus),
	);
	const statusDotClass = createMemo(() =>
		isPendingRequest()
			? getPublishOperationStatusDotClass(props.request.status)
			: getPublishOperationExecutionStatusDotClass(
					props.request.executionStatus,
				),
	);
	const metadataDate = createMemo(() => {
		if (isPendingRequest()) return props.request.createdAt;
		if (props.request.executionStatus === "failed") {
			return (
				props.request.failedAt ??
				props.request.scheduledAt ??
				props.request.createdAt
			);
		}
		return props.request.scheduledAt ?? props.request.createdAt;
	});

	// ----------------------------------
	// Render
	return (
		<article class="group border-b border-border bg-card-base transition-colors last:border-b-0 hover:bg-card-hover/60">
			<div class="flex items-center gap-3 px-3 py-2.5">
				<div class="min-w-0 flex-1">
					<div class="flex min-w-0 items-center gap-2">
						<span
							class={classNames(
								"size-2.5 shrink-0 rounded-full border",
								statusDotClass(),
							)}
							title={statusLabel()}
						/>
						<h4 class="truncate text-sm font-medium text-title">
							{formatTargetName({
								collection: props.collection(),
								target: props.request.target,
							})}
							<span class="sr-only">, {statusLabel()}</span>
						</h4>
					</div>

					<div class="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-unfocused">
						<Show when={isPendingRequest()}>
							<span class="truncate">
								{helpers.formatUserName(props.request.requestedBy, "simple") ||
									"-"}
							</span>
							<span aria-hidden="true">·</span>
						</Show>
						<DateText
							date={metadataDate()}
							includeTime={!isPendingRequest()}
							class="text-[11px] text-unfocused"
						/>
						<Show when={!isPendingRequest() && props.request.scheduledTimezone}>
							<span aria-hidden="true">·</span>
							<span class="truncate">{props.request.scheduledTimezone}</span>
						</Show>
						<Show
							when={isPendingRequest() && !props.request.permissions.review}
						>
							<span aria-hidden="true">·</span>
							<span class="inline-flex shrink-0 items-center gap-1 text-body">
								<FaSolidLock size={9} />
								{T()("common.status.locked")}
							</span>
						</Show>
					</div>
				</div>

				<div class="flex shrink-0 gap-1">
					<Show
						when={props.request.permissions.reschedule}
						fallback={
							<span
								title={T()("documents.release.schedule.unavailable")}
								aria-disabled="true"
								class={disabledActionClasses}
							>
								<FaSolidCalendar size={11} />
							</span>
						}
					>
						<button
							type="button"
							title={
								props.request.scheduledAt
									? T()("common.reschedule.release")
									: T()("documents.release.schedule.action")
							}
							aria-label={
								props.request.scheduledAt
									? T()("common.reschedule.release")
									: T()("documents.release.schedule.action")
							}
							class={iconActionClasses}
							onClick={() => props.onSchedule(props.request)}
						>
							<FaSolidCalendar size={12} />
						</button>
					</Show>
					<Show when={props.request.operationType === "request"}>
						<A
							href={`/lucid/collections/${props.request.collectionKey}/${props.request.documentId}/release-requests/${props.request.id}`}
							title={T()("common.open.request")}
							aria-label={T()("common.open.request")}
							class={iconActionClasses}
						>
							<FaSolidArrowUpRightFromSquare size={11} />
						</A>
					</Show>
					<Show when={props.request.operationType !== "request"}>
						<A
							href={getDocumentRoute("edit", {
								collectionKey: props.request.collectionKey,
								documentId: props.request.documentId,
								version: "snapshot",
								versionId: props.request.snapshotVersionId,
							})}
							title={T()("actions.view.snapshot")}
							aria-label={T()("actions.view.snapshot")}
							class={iconActionClasses}
						>
							<FaSolidEye size={12} />
						</A>
					</Show>
				</div>
			</div>
		</article>
	);
};

export default PublishRequestRow;
