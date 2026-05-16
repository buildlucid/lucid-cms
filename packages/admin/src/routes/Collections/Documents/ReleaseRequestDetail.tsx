import { A, useParams } from "@solidjs/router";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSXElement,
	Match,
	Show,
	Switch,
} from "solid-js";
import { Select, Textarea } from "@/components/Groups/Form";
import { Confirmation } from "@/components/Groups/Modal";
import { HeaderBar } from "@/components/Groups/PageBuilder";
import ReleaseScheduleFields from "@/components/Modals/Documents/ReleaseScheduleFields";
import Button from "@/components/Partials/Button";
import DateText from "@/components/Partials/DateText";
import Link from "@/components/Partials/Link";
import Pill from "@/components/Partials/Pill";
import { useDocumentState } from "@/hooks/document/useDocumentState";
import { useDocumentUIState } from "@/hooks/document/useDocumentUIState";
import api from "@/services/api";
import T from "@/translations";
import {
	formatPublishOperationUser,
	getPublishOperationExecutionStatusLabel,
	getPublishOperationExecutionStatusTheme,
	getPublishOperationStatusLabel,
	getPublishOperationStatusTheme,
} from "@/utils/publish-operations";
import {
	getDefaultTimezone,
	getScheduledAt,
	type ReleaseTiming,
} from "@/utils/release-schedule";
import { getDocumentRoute } from "@/utils/route-helpers";
import ReleaseRequestPreviewPlaceholder from "../../ReleaseRequests/PreviewPlaceholder";

type DecisionAction = "approve" | "reject" | "cancel";

const getDecisionTitle = (action?: DecisionAction) => {
	switch (action) {
		case "approve":
			return T()("approve_release_request");
		case "reject":
			return T()("reject_release_request");
		case "cancel":
			return T()("cancel_release_request");
		default:
			return T()("confirm");
	}
};

const getDecisionDescription = (action?: DecisionAction) => {
	switch (action) {
		case "approve":
			return T()("approve_release_request_description");
		case "reject":
			return T()("reject_release_request_description");
		case "cancel":
			return T()("cancel_release_request_description");
		default:
			return T()("decision_comment_placeholder");
	}
};

const CollectionsDocumentsReleaseRequestDetailRoute: Component = () => {
	// ----------------------------------
	// State / Hooks
	const params = useParams();
	const versionType = createMemo((): "latest" => "latest");
	const versionId = createMemo(() => undefined);
	const requestId = createMemo(() =>
		Number.parseInt(params.releaseRequestId ?? "", 10),
	);
	const [decisionOpen, setDecisionOpen] = createSignal(false);
	const [decisionAction, setDecisionAction] = createSignal<DecisionAction>();
	const [decisionComment, setDecisionComment] = createSignal("");
	const [rescheduleOpen, setRescheduleOpen] = createSignal(false);
	const [scheduleEnabled, setScheduleEnabled] = createSignal(false);
	const [scheduleDate, setScheduleDate] = createSignal("");
	const [scheduleTime, setScheduleTime] = createSignal("");
	const [scheduleTimezone, setScheduleTimezone] = createSignal(
		getDefaultTimezone(),
	);
	const [validationError, setValidationError] = createSignal<string>();

	const state = useDocumentState({
		mode: "edit",
		version: versionType,
		versionId,
	});
	const uiState = useDocumentUIState({
		collectionQuery: state.collectionQuery,
		collection: state.collection,
		documentQuery: state.documentQuery,
		document: state.document,
		mode: "history",
		version: versionType,
		versionId,
	});
	const request = api.publishOperations.useGetSingle({
		queryParams: {
			location: {
				id: () => requestId(),
			},
		},
		enabled: () => Number.isFinite(requestId()),
	});
	const decision = api.publishOperations.useDecision({
		onSuccess: () => {
			setDecisionOpen(false);
			setDecisionAction(undefined);
			setDecisionComment("");
			setScheduleEnabled(false);
			setScheduleDate("");
			setScheduleTime("");
			setScheduleTimezone(getDefaultTimezone());
			setValidationError(undefined);
		},
	});
	const reschedule = api.publishOperations.useReschedule({
		onSuccess: () => {
			setRescheduleOpen(false);
			resetSchedule();
			setValidationError(undefined);
		},
	});
	const retry = api.publishOperations.useRetry();

	// ----------------------------------
	// Memos
	const data = createMemo(() => request.data?.data);
	const schedulingSupported = createMemo(
		() => state.collection()?.capabilities.scheduling === true,
	);
	const requireDecisionComment = createMemo(
		() =>
			state.collection()?.config.review?.comments.decision === "required" &&
			decisionAction() !== "cancel",
	);
	const error = createMemo(
		() =>
			validationError() ||
			decision.errors()?.message ||
			reschedule.errors()?.message ||
			retry.errors()?.message,
	);
	const canReviewRequest = createMemo(
		() => data()?.permissions.review === true,
	);
	const canCancelRequest = createMemo(
		() => data()?.permissions.cancel === true,
	);
	const publishRequestHasSchedule = createMemo(() =>
		Boolean(data()?.scheduledAt),
	);
	const releaseTimingOptions = createMemo(() => [
		{
			value: "now",
			label: T()("release_environment_publish_confirm"),
		},
		{
			value: "scheduled",
			label: T()("schedule_release"),
		},
	]);

	// ----------------------------------
	// Effects
	createEffect(() => {
		const publishRequest = data();
		if (
			!decisionOpen() ||
			decisionAction() !== "approve" ||
			!publishRequest ||
			!schedulingSupported()
		) {
			return;
		}

		if (publishRequest.scheduledAt) {
			const scheduledAt = new Date(publishRequest.scheduledAt);
			setScheduleEnabled(true);
			setScheduleDate(scheduledAt.toISOString().slice(0, 10));
			setScheduleTime(scheduledAt.toISOString().slice(11, 16));
			setScheduleTimezone(
				publishRequest.scheduledTimezone ?? getDefaultTimezone(),
			);
			return;
		}

		setScheduleEnabled(false);
		setScheduleDate("");
		setScheduleTime("");
		setScheduleTimezone(getDefaultTimezone());
	});

	// ----------------------------------
	// Functions
	const openDecision = (action: DecisionAction) => {
		setDecisionAction(action);
		setDecisionComment("");
		setValidationError(undefined);
		prefillSchedule();
		setDecisionOpen(true);
	};
	const resetSchedule = () => {
		setScheduleEnabled(false);
		setScheduleDate("");
		setScheduleTime("");
		setScheduleTimezone(getDefaultTimezone());
	};
	const updateScheduleEnabled = (enabled: boolean) => {
		setScheduleEnabled(enabled);
		setValidationError(undefined);
	};
	const updateReleaseTiming = (value: ReleaseTiming) => {
		updateScheduleEnabled(value === "scheduled");
	};
	const prefillSchedule = () => {
		const publishRequest = data();
		if (publishRequest?.scheduledAt) {
			const scheduledAt = new Date(publishRequest.scheduledAt);
			setScheduleEnabled(true);
			setScheduleDate(scheduledAt.toISOString().slice(0, 10));
			setScheduleTime(scheduledAt.toISOString().slice(11, 16));
			setScheduleTimezone(
				publishRequest.scheduledTimezone ?? getDefaultTimezone(),
			);
			return;
		}

		resetSchedule();
	};
	const openReschedule = () => {
		const publishRequest = data();
		if (publishRequest?.scheduledAt) {
			prefillSchedule();
		} else {
			resetSchedule();
		}
		setValidationError(undefined);
		reschedule.reset();
		setRescheduleOpen(true);
	};
	const saveReschedule = async () => {
		const publishRequest = data();
		if (!publishRequest) return;

		const scheduledAt = getScheduledAt({
			date: scheduleDate(),
			time: scheduleTime(),
			timezone: scheduleTimezone(),
		});
		if (!scheduledAt) {
			setValidationError(T()("schedule_release_required"));
			return;
		}

		await reschedule.action.mutateAsync({
			id: publishRequest.id,
			body: {
				scheduledAt,
				scheduledTimezone: scheduleTimezone(),
			},
		});
	};
	const removeSchedule = async () => {
		const publishRequest = data();
		if (!publishRequest) return;

		await reschedule.action.mutateAsync({
			id: publishRequest.id,
			body: {
				scheduledAt: null,
				scheduledTimezone: null,
			},
		});
	};
	const listRoute = createMemo(
		() =>
			`/lucid/collections/${state.collectionKey()}/${state.documentId()}/release-requests`,
	);
	const snapshotRoute = createMemo(() => {
		const publishRequest = data();
		if (!publishRequest) return "#";

		return getDocumentRoute("edit", {
			collectionKey: publishRequest.collectionKey,
			documentId: publishRequest.documentId,
			status: "snapshot",
			versionId: publishRequest.snapshotVersionId,
		});
	});

	// ----------------------------------
	// Render
	return (
		<>
			<Switch>
				<Match when={uiState.isLoading() || request.isLoading}>
					<div class="-mt-4 relative bg-background-base rounded-b-xl border border-border h-36">
						<span class="absolute inset-4 bg-background-hover z-5 skeleton" />
					</div>
					<div class="mt-2 bg-background-base rounded-t-xl border border-border grow overflow-hidden relative">
						<div class="absolute top-4 left-4 bottom-4 right-4 flex flex-col z-10">
							<span class="h-62 w-full skeleton block mb-4" />
							<span class="h-full w-full skeleton block" />
						</div>
					</div>
				</Match>
				<Match when={uiState.isSuccess() && data()}>
					{(publishRequest) => (
						<>
							<HeaderBar
								mode={undefined}
								version={versionType}
								versionId={versionId}
								state={{
									collection: state.collection,
									collectionKey: state.collectionKey,
									collectionName: state.collectionName,
									collectionSingularName: state.collectionSingularName,
									documentID: state.documentId,
									document: state.document,
									ui: uiState,
									showRevisionNavigation: () => true,
								}}
								actions={{}}
							/>
							<div class="mt-2 bg-background-base rounded-t-xl border border-border grow p-4 md:p-6">
								<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
									<div>
										<h2 class="text-base font-semibold text-title">
											{T()("publish_request_detail_route_title", {
												id: publishRequest().id,
											})}
										</h2>
										<p class="mt-1 text-sm text-body">
											{T()("publish_request_detail_route_description", {
												collection: state.collectionName(),
												documentId: publishRequest().documentId,
												target: publishRequest().target,
											})}
										</p>
									</div>
									<A
										href={listRoute()}
										class="text-sm text-primary-base hover:text-primary-hover transition-colors"
									>
										{T()("publish_requests")}
									</A>
								</div>
								<div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
									<section class="border border-border rounded-md bg-card-base overflow-hidden">
										<div class="p-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
											<div class="flex flex-wrap items-center gap-2">
												<h2 class="text-base font-semibold text-title">
													{T()("preview")}
												</h2>
												<Pill
													theme={getPublishOperationStatusTheme(
														publishRequest().status,
													)}
												>
													{getPublishOperationStatusLabel(
														publishRequest().status,
													)}
												</Pill>
												<Show when={publishRequest().isOutdated}>
													<Pill theme="warning-opaque">
														{T()("out_of_sync")}
													</Pill>
												</Show>
												<Show when={!publishRequest().permissions.review}>
													<Pill theme="outline">{T()("locked")}</Pill>
												</Show>
											</div>
											<Link href={snapshotRoute()} theme="primary" size="small">
												{T()("view_snapshot")}
											</Link>
										</div>
										<div class="p-4">
											<p class="text-sm text-body mb-3">
												{publishRequest().isOutdated
													? T()("snapshot_outdated")
													: T()("snapshot_current")}
											</p>
											<ReleaseRequestPreviewPlaceholder />
										</div>
									</section>
									<aside class="border border-border rounded-md bg-card-base h-max">
										<div class="p-4 border-b border-border">
											<h2 class="text-base font-semibold text-title">
												{T()("request_details")}
											</h2>
										</div>
										<div class="p-4 flex flex-col gap-3 text-sm">
											<DetailRow label={T()("status")}>
												<Pill
													theme={getPublishOperationStatusTheme(
														publishRequest().status,
													)}
												>
													{getPublishOperationStatusLabel(
														publishRequest().status,
													)}
												</Pill>
											</DetailRow>
											<DetailRow label={T()("execution_status")}>
												<Pill
													theme={getPublishOperationExecutionStatusTheme(
														publishRequest().executionStatus,
													)}
												>
													{getPublishOperationExecutionStatusLabel(
														publishRequest().executionStatus,
													)}
												</Pill>
											</DetailRow>
											<DetailRow label={T()("target")}>
												{publishRequest().target}
											</DetailRow>
											<Show when={publishRequest().scheduledAt}>
												<DetailRow label={T()("scheduled_for")}>
													<DateText date={publishRequest().scheduledAt} />
												</DetailRow>
											</Show>
											<Show when={publishRequest().scheduledTimezone}>
												<DetailRow label={T()("scheduled_timezone")}>
													{publishRequest().scheduledTimezone}
												</DetailRow>
											</Show>
											<Show when={publishRequest().executedAt}>
												<DetailRow label={T()("executed_at")}>
													<DateText date={publishRequest().executedAt} />
												</DetailRow>
											</Show>
											<Show when={publishRequest().failedAt}>
												<DetailRow label={T()("failed_at")}>
													<DateText date={publishRequest().failedAt} />
												</DetailRow>
											</Show>
											<Show when={publishRequest().executionErrorMessage}>
												<DetailRow label={T()("execution_error")}>
													<span class="whitespace-pre-wrap">
														{publishRequest().executionErrorMessage}
													</span>
												</DetailRow>
											</Show>
											<DetailRow label={T()("requested_by")}>
												{formatPublishOperationUser(
													publishRequest().requestedBy,
												)}
											</DetailRow>
											<DetailRow label={T()("requested_at")}>
												<DateText date={publishRequest().createdAt} />
											</DetailRow>
											<Show when={publishRequest().decidedBy}>
												<DetailRow label={T()("decided_by")}>
													{formatPublishOperationUser(
														publishRequest().decidedBy,
													)}
												</DetailRow>
											</Show>
											<Show when={publishRequest().decidedAt}>
												<DetailRow label={T()("updated_at")}>
													<DateText date={publishRequest().decidedAt} />
												</DetailRow>
											</Show>
											<Show when={publishRequest().requestComment}>
												<DetailRow label={T()("comment")}>
													<span class="whitespace-pre-wrap">
														{publishRequest().requestComment}
													</span>
												</DetailRow>
											</Show>
											<Show when={publishRequest().decisionComment}>
												<DetailRow label={T()("decision_comment")}>
													<span class="whitespace-pre-wrap">
														{publishRequest().decisionComment}
													</span>
												</DetailRow>
											</Show>
											<Show when={publishRequest().assignees.length > 0}>
												<DetailRow label={T()("reviewers")}>
													<div class="flex flex-wrap gap-1">
														<For each={publishRequest().assignees}>
															{(assignee) => (
																<Pill theme="outline">
																	{formatPublishOperationUser(assignee.user)}
																</Pill>
															)}
														</For>
													</div>
												</DetailRow>
											</Show>
										</div>
										<Show
											when={
												canReviewRequest() ||
												canCancelRequest() ||
												publishRequest().permissions.reschedule ||
												publishRequest().permissions.retry
											}
										>
											<div class="p-4 border-t border-border flex flex-wrap gap-2">
												<Show
													when={
														publishRequest().status === "pending" &&
														canReviewRequest()
													}
												>
													<Button
														type="button"
														theme="primary"
														size="small"
														onClick={() => openDecision("approve")}
													>
														{T()("approve")}
													</Button>
													<Button
														type="button"
														theme="danger-outline"
														size="small"
														onClick={() => openDecision("reject")}
													>
														{T()("reject")}
													</Button>
												</Show>
												<Show when={canCancelRequest()}>
													<Button
														type="button"
														theme="border-outline"
														size="small"
														onClick={() => openDecision("cancel")}
													>
														{T()("cancel")}
													</Button>
												</Show>
												<Show when={publishRequest().permissions.reschedule}>
													<Button
														type="button"
														theme="border-outline"
														size="small"
														onClick={openReschedule}
													>
														{T()("reschedule_release")}
													</Button>
												</Show>
												<Show when={publishRequest().permissions.retry}>
													<Button
														type="button"
														theme="primary"
														size="small"
														loading={retry.action.isPending}
														onClick={() =>
															retry.action.mutateAsync({
																id: publishRequest().id,
															})
														}
													>
														{T()("retry_release")}
													</Button>
												</Show>
											</div>
										</Show>
									</aside>
								</div>
							</div>
						</>
					)}
				</Match>
			</Switch>
			<Confirmation
				theme={decisionAction() === "reject" ? "danger" : "primary"}
				state={{
					open: decisionOpen(),
					setOpen: setDecisionOpen,
					isLoading: decision.action.isPending,
					isError: !!error(),
				}}
				copy={{
					title: getDecisionTitle(decisionAction()),
					description: getDecisionDescription(decisionAction()),
					error: error(),
				}}
				callbacks={{
					onConfirm: async () => {
						const action = decisionAction();
						const publishRequest = data();
						if (!action || !publishRequest) return;
						if (
							requireDecisionComment() &&
							decisionComment().trim().length === 0
						) {
							setValidationError(T()("publish_request_comment_required"));
							return;
						}
						const scheduledAt =
							action === "approve" && scheduleEnabled()
								? getScheduledAt({
										date: scheduleDate(),
										time: scheduleTime(),
										timezone: scheduleTimezone(),
									})
								: null;
						if (action === "approve" && scheduleEnabled() && !scheduledAt) {
							setValidationError(T()("schedule_release_required"));
							return;
						}
						await decision.action.mutateAsync({
							id: publishRequest.id,
							action,
							body: {
								comment: decisionComment().trim() || undefined,
								...(action === "approve" && schedulingSupported()
									? {
											scheduledAt,
											scheduledTimezone: scheduledAt
												? scheduleTimezone()
												: null,
										}
									: {}),
							},
						});
					},
					onCancel: () => {
						setDecisionOpen(false);
						setDecisionAction(undefined);
						setDecisionComment("");
						setScheduleEnabled(false);
						setScheduleDate("");
						setScheduleTime("");
						setScheduleTimezone(getDefaultTimezone());
						setValidationError(undefined);
						decision.reset();
					},
				}}
			>
				<div class="grid gap-4 pb-4 md:pb-6">
					<Textarea
						id="document-publish-request-decision-comment"
						name="document-publish-request-decision-comment"
						value={decisionComment()}
						onChange={(value) => {
							setDecisionComment(value);
							setValidationError(undefined);
						}}
						required={requireDecisionComment()}
						rows={4}
						copy={{
							label: T()("comment"),
							placeholder: T()("decision_comment_placeholder"),
						}}
						noMargin={true}
					/>
					<Show when={decisionAction() === "approve" && schedulingSupported()}>
						<div class="grid gap-3">
							<Select
								id="release-request-decision-timing"
								name="release-request-decision-timing"
								value={scheduleEnabled() ? "scheduled" : "now"}
								onChange={(value) => {
									if (value === "now" || value === "scheduled") {
										updateReleaseTiming(value);
									}
								}}
								options={releaseTimingOptions()}
								copy={{
									label: T()("release_timing"),
								}}
								noClear={true}
								hideOptionalText={true}
								noMargin={true}
							/>
							<Show when={scheduleEnabled()}>
								<div class="mt-1">
									<ReleaseScheduleFields
										date={scheduleDate()}
										setDate={setScheduleDate}
										time={scheduleTime()}
										setTime={setScheduleTime}
										timezone={scheduleTimezone()}
										setTimezone={setScheduleTimezone}
										onChange={() => setValidationError(undefined)}
									/>
								</div>
							</Show>
						</div>
					</Show>
				</div>
			</Confirmation>
			<Confirmation
				theme="primary"
				state={{
					open: rescheduleOpen(),
					setOpen: setRescheduleOpen,
					isLoading: reschedule.action.isPending,
					isError: !!error(),
				}}
				copy={{
					title: publishRequestHasSchedule()
						? T()("reschedule_release")
						: T()("schedule_release"),
					description: T()("schedule_release_modal_description"),
					confirm: T()("update_schedule"),
					error: error(),
				}}
				callbacks={{
					onConfirm: saveReschedule,
					onCancel: () => {
						setRescheduleOpen(false);
						resetSchedule();
						setValidationError(undefined);
						reschedule.reset();
					},
				}}
				slots={{
					actions: (
						<>
							<Button
								theme="border-outline"
								size="medium"
								type="button"
								disabled={reschedule.action.isPending}
								onClick={() => {
									setRescheduleOpen(false);
									resetSchedule();
									setValidationError(undefined);
									reschedule.reset();
								}}
							>
								{T()("cancel")}
							</Button>
							<Show when={publishRequestHasSchedule()}>
								<Button
									theme="danger-outline"
									size="medium"
									type="button"
									loading={reschedule.action.isPending}
									onClick={removeSchedule}
								>
									{T()("remove_schedule")}
								</Button>
							</Show>
							<Button
								theme="primary"
								size="medium"
								type="button"
								loading={reschedule.action.isPending}
								onClick={saveReschedule}
							>
								{publishRequestHasSchedule()
									? T()("update_schedule")
									: T()("schedule_release")}
							</Button>
						</>
					),
				}}
			>
				<div class="grid gap-3 pb-4 md:pb-6">
					<ReleaseScheduleFields
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
		</>
	);
};

const DetailRow: Component<{
	label: string;
	children: JSXElement;
}> = (props) => (
	<div class="flex flex-col gap-1">
		<span class="text-xs text-body">{props.label}</span>
		<div class="text-sm text-title">{props.children}</div>
	</div>
);

export default CollectionsDocumentsReleaseRequestDetailRoute;
