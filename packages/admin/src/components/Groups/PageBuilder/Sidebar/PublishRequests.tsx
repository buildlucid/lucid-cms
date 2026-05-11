import type { Collection, PublishOperation } from "@types";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import ReleaseScheduleFields from "@/components/Modals/Documents/ReleaseScheduleFields";
import Button from "@/components/Partials/Button";
import DateText from "@/components/Partials/DateText";
import Link from "@/components/Partials/Link";
import Pill from "@/components/Partials/Pill";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getDefaultTimezone, getScheduledAt } from "@/utils/release-schedule";
import { getDocumentRoute } from "@/utils/route-helpers";
import { formatTargetName } from "./helpers";

export const PublishRequests: Component<{
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
}> = (props) => {
	// ----------------------------------
	// State
	const [selectedOperation, setSelectedOperation] =
		createSignal<PublishOperation>();
	const [scheduleEnabled, setScheduleEnabled] = createSignal(false);
	const [scheduleDate, setScheduleDate] = createSignal("");
	const [scheduleTime, setScheduleTime] = createSignal("");
	const [scheduleTimezone, setScheduleTimezone] = createSignal(
		getDefaultTimezone(),
	);
	const [validationError, setValidationError] = createSignal<string>();

	// ----------------------------------
	// Queries
	const pendingRequests = api.publishOperations.useGetMultiple({
		queryParams: {
			filters: {
				status: () => "pending",
				operationType: () => "request",
				collectionKey: props.collectionKey,
				documentId: props.documentId,
			},
			perPage: 5,
		},
		enabled: () =>
			(props.collection()?.config.review?.requiredFor?.length ?? 0) > 0 &&
			props.documentId() !== undefined,
	});
	const scheduledRequests = api.publishOperations.useGetMultiple({
		queryParams: {
			filters: {
				status: () => "approved",
				executionStatus: () => "scheduled",
				collectionKey: props.collectionKey,
				documentId: props.documentId,
			},
			perPage: 5,
		},
		enabled: () =>
			props.collection()?.capabilities.scheduling === true &&
			props.documentId() !== undefined,
	});
	const reschedule = api.publishOperations.useReschedule({
		onSuccess: () => {
			setSelectedOperation(undefined);
			resetSchedule();
			setValidationError(undefined);
		},
	});

	// ----------------------------------
	// Memos
	const reviewEnabled = createMemo(
		() => (props.collection()?.config.review?.requiredFor?.length ?? 0) > 0,
	);
	const schedulingEnabled = createMemo(
		() => props.collection()?.capabilities.scheduling === true,
	);
	const sectionEnabled = createMemo(
		() => reviewEnabled() || schedulingEnabled(),
	);
	const rows = createMemo(() =>
		[
			...(pendingRequests.data?.data ?? []),
			...(scheduledRequests.data?.data ?? []),
		].sort((a, b) => {
			const aTime = a.scheduledAt ?? a.createdAt ?? "";
			const bTime = b.scheduledAt ?? b.createdAt ?? "";
			return aTime.localeCompare(bTime);
		}),
	);
	const isLoading = createMemo(
		() => pendingRequests.isLoading || scheduledRequests.isLoading,
	);
	const error = createMemo(
		() => validationError() || reschedule.errors()?.message,
	);

	// ----------------------------------
	// Functions
	const resetSchedule = () => {
		setScheduleEnabled(false);
		setScheduleDate("");
		setScheduleTime("");
		setScheduleTimezone(getDefaultTimezone());
	};
	const openSchedule = (operation: PublishOperation) => {
		setSelectedOperation(operation);
		setValidationError(undefined);
		reschedule.reset();

		if (operation.scheduledAt) {
			const scheduledAt = new Date(operation.scheduledAt);
			setScheduleEnabled(true);
			setScheduleDate(scheduledAt.toISOString().slice(0, 10));
			setScheduleTime(scheduledAt.toISOString().slice(11, 16));
			setScheduleTimezone(operation.scheduledTimezone ?? getDefaultTimezone());
			return;
		}

		resetSchedule();
	};

	// ----------------------------------
	// Render
	return (
		<Show when={sectionEnabled()}>
			<section class="mt-6 pt-5 border-t border-border">
				<div class="flex items-center justify-between gap-3 mb-3">
					<h3 class="text-sm font-semibold text-title">
						{T()("pending_publish_requests")}
					</h3>
				</div>
				<Switch>
					<Match when={isLoading()}>
						<div class="flex flex-col gap-2">
							<span class="skeleton h-24 rounded-md" />
							<span class="skeleton h-24 rounded-md" />
						</div>
					</Match>
					<Match when={rows().length === 0}>
						<div class="rounded-md border border-border bg-card-base p-3">
							<p class="text-sm text-body">
								{T()("no_pending_publish_requests")}
							</p>
						</div>
					</Match>
					<Match when={true}>
						<div class="flex flex-col gap-2">
							<For each={rows()}>
								{(request: PublishOperation) => (
									<div class="rounded-md border border-border bg-card-base p-3">
										<div class="flex flex-wrap items-center gap-2">
											<h4 class="text-sm font-semibold text-title">
												#{request.id}
											</h4>
											<Pill theme="warning-opaque">
												{request.status === "pending"
													? T()("pending")
													: T()("scheduled")}
											</Pill>
											<Show when={request.isOutdated}>
												<Pill theme="warning-opaque">{T()("out_of_sync")}</Pill>
											</Show>
											<Show
												when={
													request.status === "pending" &&
													!request.permissions.review
												}
											>
												<Pill theme="outline">{T()("locked")}</Pill>
											</Show>
										</div>
										<div class="mt-2 flex flex-col gap-1 text-xs text-body">
											<span>
												{T()("target")}:{" "}
												<span class="text-title">
													{formatTargetName({
														collection: props.collection(),
														target: request.target,
													})}
												</span>
											</span>
											<span>
												{T()("requested_by")}:{" "}
												<span class="text-title">
													{request.requestedBy
														? helpers.formatUserName(
																{
																	username:
																		request.requestedBy.username ??
																		request.requestedBy.email ??
																		T()("unknown"),
																	firstName: request.requestedBy.firstName,
																	lastName: request.requestedBy.lastName,
																},
																"username",
															)
														: "-"}
												</span>
											</span>
											<span>
												{T()("requested_at")}:{" "}
												<DateText date={request.createdAt} class="text-xs" />
											</span>
											<Show when={request.scheduledAt}>
												<span>
													{T()("scheduled_for")}:{" "}
													<DateText
														date={request.scheduledAt}
														class="text-xs"
													/>
												</span>
											</Show>
											<Show when={request.scheduledTimezone}>
												<span>
													{T()("scheduled_timezone")}:{" "}
													<span class="text-title">
														{request.scheduledTimezone}
													</span>
												</span>
											</Show>
										</div>
										<div class="mt-3 flex flex-col gap-2">
											<Show when={request.permissions.reschedule}>
												<Button
													type="button"
													theme="border-outline"
													size="small"
													classes="w-full"
													onClick={() => openSchedule(request)}
												>
													{request.scheduledAt
														? T()("reschedule_release")
														: T()("schedule_release")}
												</Button>
											</Show>
											<Show when={request.operationType === "request"}>
												<Link
													href={`/lucid/collections/${request.collectionKey}/${request.documentId}/release-requests/${request.id}`}
													theme="border-outline"
													size="small"
													classes="w-full"
												>
													{T()("open_request")}
												</Link>
											</Show>
											<Link
												href={getDocumentRoute("edit", {
													collectionKey: request.collectionKey,
													documentId: request.documentId,
													status: "snapshot",
													versionId: request.snapshotVersionId,
												})}
												theme="secondary"
												size="small"
												classes="w-full"
											>
												{T()("view_snapshot")}
											</Link>
										</div>
									</div>
								)}
							</For>
						</div>
					</Match>
				</Switch>
			</section>
			<Confirmation
				theme="primary"
				state={{
					open: selectedOperation() !== undefined,
					setOpen: (open) => {
						if (!open) setSelectedOperation(undefined);
					},
					isLoading: reschedule.action.isPending,
					isError: !!error(),
				}}
				copy={{
					title: T()("reschedule_release"),
					confirm: T()("update_schedule"),
					error: error(),
				}}
				callbacks={{
					onConfirm: async () => {
						const operation = selectedOperation();
						if (!operation) return;

						const scheduledAt = scheduleEnabled()
							? getScheduledAt({
									date: scheduleDate(),
									time: scheduleTime(),
									timezone: scheduleTimezone(),
								})
							: null;
						if (scheduleEnabled() && !scheduledAt) {
							setValidationError(T()("schedule_release_required"));
							return;
						}

						await reschedule.action.mutateAsync({
							id: operation.id,
							body: {
								scheduledAt,
								scheduledTimezone: scheduledAt ? scheduleTimezone() : null,
							},
						});
					},
					onCancel: () => {
						setSelectedOperation(undefined);
						resetSchedule();
						setValidationError(undefined);
						reschedule.reset();
					},
				}}
			>
				<div class="pb-4">
					<ReleaseScheduleFields
						enabled={scheduleEnabled()}
						setEnabled={setScheduleEnabled}
						date={scheduleDate()}
						setDate={setScheduleDate}
						time={scheduleTime()}
						setTime={setScheduleTime}
						timezone={scheduleTimezone()}
						setTimezone={setScheduleTimezone}
						onChange={() => setValidationError(undefined)}
					/>
				</div>
			</Confirmation>
		</Show>
	);
};
