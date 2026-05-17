import { A } from "@solidjs/router";
import type { Collection, PublishOperation } from "@types";
import {
	FaSolidArrowUpRightFromSquare,
	FaSolidCalendar,
	FaSolidEye,
	FaSolidLock,
	FaSolidTriangleExclamation,
} from "solid-icons/fa";
import { type Accessor, type Component, Show } from "solid-js";
import DateText from "@/components/Partials/DateText";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getPublishOperationExecutionStatusLabel } from "@/utils/publish-operations";
import { getDocumentRoute } from "@/utils/route-helpers";
import { formatTargetName } from "../helpers";

const iconActionClasses =
	"inline-flex h-8 w-full min-w-0 items-center justify-center gap-1.5 px-2 text-center text-xs font-medium leading-none text-body transition-colors hover:bg-card-hover hover:text-title focus:outline-hidden focus-visible:ring-1 ring-inset ring-primary-base";
const disabledActionClasses =
	"inline-flex h-8 w-full min-w-0 cursor-not-allowed items-center justify-center gap-1.5 px-2 text-center text-xs font-medium leading-none text-body/45";

const PublishRequestRow: Component<{
	collection: Accessor<Collection | undefined>;
	request: PublishOperation;
	onSchedule: (_operation: PublishOperation) => void;
}> = (props) => {
	// ----------------------------------
	// Memos
	const statusLabel = () =>
		props.request.status === "pending"
			? T()("pending")
			: getPublishOperationExecutionStatusLabel(props.request.executionStatus);

	// ----------------------------------
	// Render
	return (
		<article class="group border-b border-border bg-card-base px-3 py-3 transition-colors last:border-b-0 hover:bg-card-hover/60">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<h4 class="truncate text-sm font-medium text-title">
						{formatTargetName({
							collection: props.collection(),
							target: props.request.target,
						})}
					</h4>
				</div>

				<div class="flex shrink-0 flex-col items-end gap-1">
					<Show when={props.request.isOutdated}>
						<span
							title={T()("snapshot_outdated")}
							class="inline-flex items-center gap-1 rounded-full bg-warning-base/10 px-2 py-0.5 text-xs font-medium text-warning-base"
						>
							<FaSolidTriangleExclamation size={10} />
							{T()("out_of_sync")}
						</span>
					</Show>
					<Show
						when={
							props.request.status === "pending" &&
							!props.request.permissions.review
						}
					>
						<span class="inline-flex items-center gap-1 rounded-full bg-input-base px-2 py-0.5 text-xs font-medium text-body">
							<FaSolidLock size={10} />
							{T()("locked")}
						</span>
					</Show>
				</div>
			</div>

			<dl class="mt-2 grid gap-1 text-xs">
				<div class="flex items-center justify-between gap-2">
					<dt class="text-body">{statusLabel()}</dt>
					<dd class="min-w-0 truncate text-right text-title">
						{T()("requested_by")}{" "}
						{helpers.formatUserName(props.request.requestedBy, "simple") || "-"}
					</dd>
				</div>
				<div class="flex items-center justify-between gap-2">
					<dt class="text-body">{T()("requested_at")}</dt>
					<dd class="min-w-0 text-right text-title">
						<DateText date={props.request.createdAt} class="text-xs" />
					</dd>
				</div>
				<Show when={props.request.scheduledAt}>
					<div class="flex items-center justify-between gap-2">
						<dt class="text-body">{T()("scheduled_for")}</dt>
						<dd class="min-w-0 text-right text-title">
							<DateText date={props.request.scheduledAt} class="text-xs" />
						</dd>
					</div>
				</Show>
				<Show when={props.request.scheduledTimezone}>
					<div class="flex items-center justify-between gap-2">
						<dt class="text-body">{T()("scheduled_timezone")}</dt>
						<dd class="min-w-0 truncate text-right text-title">
							{props.request.scheduledTimezone}
						</dd>
					</div>
				</Show>
			</dl>

			<div class="relative mt-3 grid grid-cols-2 divide-x divide-border overflow-hidden rounded-full bg-input-base/60 after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:ring-1 after:ring-inset after:ring-border after:content-['']">
				<Show
					when={props.request.permissions.reschedule}
					fallback={
						<span
							title={T()("schedule_unavailable")}
							aria-disabled="true"
							class={disabledActionClasses}
						>
							<FaSolidCalendar size={11} />
							<span class="truncate leading-none">{T()("schedule")}</span>
						</span>
					}
				>
					<button
						type="button"
						title={
							props.request.scheduledAt
								? T()("reschedule_release")
								: T()("schedule_release")
						}
						class={iconActionClasses}
						onClick={() => props.onSchedule(props.request)}
					>
						<FaSolidCalendar size={11} />
						<span class="truncate leading-none">{T()("schedule")}</span>
					</button>
				</Show>
				<Show when={props.request.operationType === "request"}>
					<A
						href={`/lucid/collections/${props.request.collectionKey}/${props.request.documentId}/release-requests/${props.request.id}`}
						title={T()("open_request")}
						class={iconActionClasses}
					>
						<FaSolidArrowUpRightFromSquare size={10} />
						<span class="truncate leading-none">{T()("request")}</span>
					</A>
				</Show>
				<Show when={props.request.operationType !== "request"}>
					<A
						href={getDocumentRoute("edit", {
							collectionKey: props.request.collectionKey,
							documentId: props.request.documentId,
							status: "snapshot",
							versionId: props.request.snapshotVersionId,
						})}
						title={T()("view_snapshot")}
						class={iconActionClasses}
					>
						<FaSolidEye size={11} />
						<span class="truncate leading-none">{T()("view")}</span>
					</A>
				</Show>
			</div>
		</article>
	);
};

export default PublishRequestRow;
