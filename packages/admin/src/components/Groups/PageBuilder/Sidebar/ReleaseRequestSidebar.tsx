import type { Collection, PublishOperation } from "@types";
import {
	FaSolidCircleInfo,
	FaSolidClock,
	FaSolidPaperPlane,
	FaSolidTriangleExclamation,
	FaSolidUserCheck,
} from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";
import { Select, Textarea } from "@/components/Groups/Form";
import { Confirmation } from "@/components/Groups/Modal";
import PublishOperationReviewers from "@/components/Modals/Documents/PublishOperationReviewers";
import ReleaseScheduleFields from "@/components/Modals/Documents/ReleaseScheduleFields";
import Button from "@/components/Partials/Button";
import DateText from "@/components/Partials/DateText";
import Pill from "@/components/Partials/Pill";
import UserDisplay from "@/components/Partials/UserDisplay";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";
import {
	formatPublishOperationUser,
	getPublishOperationExecutionStatusLabel,
	getPublishOperationStatusLabel,
} from "@/utils/publish-operations";
import {
	getDefaultTimezone,
	getScheduledAt,
	type ReleaseTiming,
} from "@/utils/release-schedule";
import { formatTargetName } from "./helpers";
import ReleaseRequestCommentBlock from "./Partials/ReleaseRequestCommentBlock";
import ReleaseRequestDetailRow from "./Partials/ReleaseRequestDetailRow";
import SidebarSection from "./Partials/SidebarSection";

type PublishOperationUser = PublishOperation["requestedBy"];
type DecisionAction = "approve" | "reject" | "cancel";

const getDecisionTitle = (action?: DecisionAction) => {
	switch (action) {
		case "approve":
			return T()("publish.requests.review.approve.title");
		case "reject":
			return T()("publish.requests.review.reject.title");
		case "cancel":
			return T()("publish.requests.review.cancel.title");
		default:
			return T()("common.confirm");
	}
};

const getDecisionDescription = (action?: DecisionAction) => {
	switch (action) {
		case "approve":
			return T()("publish.requests.review.approve.description");
		case "reject":
			return T()("publish.requests.review.reject.description");
		case "cancel":
			return T()("publish.requests.review.cancel.description");
		default:
			return T()("publish.requests.decision.comment.placeholder");
	}
};

const getDecisionConfirm = (action?: DecisionAction) => {
	switch (action) {
		case "approve":
			return T()("common.approve");
		case "reject":
			return T()("common.reject");
		case "cancel":
			return T()("common.cancel");
		default:
			return T()("common.confirm");
	}
};

const PublishOperationUserDetailValue: Component<{
	user: PublishOperationUser;
}> = (props) => (
	<Show when={props.user} fallback="-">
		{(user) => (
			<UserDisplay
				user={{
					username:
						helpers.formatUserName(user(), "simple") ||
						T()("media.types.unknown"),
					firstName: user().firstName,
					lastName: user().lastName,
					profilePicture: user().profilePicture,
				}}
				mode="short"
				size="x-small"
			/>
		)}
	</Show>
);

export const ReleaseRequestSidebar: Component<{
	collection: Accessor<Collection | undefined>;
	releaseRequest: Accessor<PublishOperation | undefined>;
}> = (props) => {
	// ----------------------------------
	// State
	const [decisionOpen, setDecisionOpen] = createSignal(false);
	const [decisionAction, setDecisionAction] = createSignal<DecisionAction>();
	const [decisionComment, setDecisionComment] = createSignal("");
	const [rescheduleOpen, setRescheduleOpen] = createSignal(false);
	const [reviewersOpen, setReviewersOpen] = createSignal(false);
	const [scheduleEnabled, setScheduleEnabled] = createSignal(false);
	const [scheduleDate, setScheduleDate] = createSignal("");
	const [scheduleTime, setScheduleTime] = createSignal("");
	const [scheduleTimezone, setScheduleTimezone] = createSignal(
		getDefaultTimezone(),
	);
	const [validationError, setValidationError] = createSignal<string>();

	const decision = api.publishOperations.useDecision({
		onSuccess: () => {
			setDecisionOpen(false);
			setDecisionAction(undefined);
			setDecisionComment("");
			resetSchedule();
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
	const request = createMemo(() => props.releaseRequest());
	const schedulingSupported = createMemo(
		() => props.collection()?.capabilities.scheduling === true,
	);
	const requireDecisionComment = createMemo(
		() =>
			props.collection()?.config.review?.comments.decision === "required" &&
			decisionAction() !== "cancel",
	);
	const canReviewRequest = createMemo(
		() => request()?.permissions.review === true,
	);
	const canCancelRequest = createMemo(
		() => request()?.permissions.cancel === true,
	);
	const canUpdateReviewers = createMemo(
		() =>
			request()?.status === "pending" &&
			request()?.permissions.updateReviewers === true,
	);
	const requestHasSchedule = createMemo(() => Boolean(request()?.scheduledAt));
	const targetLabel = createMemo(() => {
		const publishRequest = request();
		if (!publishRequest) return "-";

		return formatTargetName({
			collection: props.collection(),
			target: publishRequest.target,
		});
	});
	const statusLabel = createMemo(() => {
		const publishRequest = request();
		if (!publishRequest) return T()("common.loading");

		if (publishRequest.status === "pending")
			return T()("common.status.awaiting.approval");
		return getPublishOperationStatusLabel(publishRequest.status);
	});
	const executionStatusLabel = createMemo(() => {
		const publishRequest = request();
		if (!publishRequest) return undefined;
		if (publishRequest.executionStatus === "awaiting_approval") {
			return undefined;
		}

		return getPublishOperationExecutionStatusLabel(
			publishRequest.executionStatus,
		);
	});
	const releaseTimingOptions = createMemo(() => [
		{
			value: "now",
			label: T()("documents.release.environment.publish.confirm"),
		},
		{
			value: "scheduled",
			label: T()("documents.release.schedule.action"),
		},
	]);
	const error = createMemo(
		() =>
			validationError() ||
			decision.errors()?.message ||
			reschedule.errors()?.message ||
			retry.errors()?.message,
	);
	const showActions = createMemo(() => {
		const publishRequest = request();
		if (!publishRequest) return false;

		return (
			(publishRequest.status === "pending" && canReviewRequest()) ||
			canCancelRequest() ||
			publishRequest.permissions.reschedule ||
			publishRequest.permissions.retry
		);
	});

	// ----------------------------------
	// Effects
	createEffect(() => {
		const publishRequest = request();
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

		resetSchedule();
	});

	// ----------------------------------
	// Functions
	const resetSchedule = () => {
		setScheduleEnabled(false);
		setScheduleDate("");
		setScheduleTime("");
		setScheduleTimezone(getDefaultTimezone());
	};
	const prefillSchedule = () => {
		const publishRequest = request();
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
	const updateReleaseTiming = (value: ReleaseTiming) => {
		setScheduleEnabled(value === "scheduled");
		setValidationError(undefined);
	};
	const openDecision = (action: DecisionAction) => {
		setDecisionAction(action);
		setDecisionComment("");
		setValidationError(undefined);
		prefillSchedule();
		setDecisionOpen(true);
	};
	const openReschedule = () => {
		if (request()?.scheduledAt) {
			prefillSchedule();
		} else {
			resetSchedule();
		}
		setValidationError(undefined);
		reschedule.reset();
		setRescheduleOpen(true);
	};
	const submitDecision = async () => {
		const action = decisionAction();
		const publishRequest = request();
		if (!action || !publishRequest) return;
		if (requireDecisionComment() && decisionComment().trim().length === 0) {
			setValidationError(T()("publish.requests.validation.comment.required"));
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
			setValidationError(T()("documents.release.schedule.validation.required"));
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
							scheduledTimezone: scheduledAt ? scheduleTimezone() : null,
						}
					: {}),
			},
		});
	};
	const saveReschedule = async () => {
		const publishRequest = request();
		if (!publishRequest) return;

		const scheduledAt = getScheduledAt({
			date: scheduleDate(),
			time: scheduleTime(),
			timezone: scheduleTimezone(),
		});
		if (!scheduledAt) {
			setValidationError(T()("documents.release.schedule.validation.required"));
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
		const publishRequest = request();
		if (!publishRequest) return;

		await reschedule.action.mutateAsync({
			id: publishRequest.id,
			body: {
				scheduledAt: null,
				scheduledTimezone: null,
			},
		});
	};

	// ----------------------------------
	// Render
	return (
		<>
			<aside class="w-full xl:w-80 shrink-0 sticky bg-card-base p-4 md:p-5 flex-col flex gap-5 rounded-t-xl xl:rounded-tl-none border-t xl:border-t-0 xl:border-l border-border">
				<div class="flex flex-col gap-3">
					<div class="flex items-start justify-between gap-3">
						<h2 class="min-w-0 text-base font-semibold text-title">
							{request()
								? T()("routes.publish.requests.detail.title", {
										id: request()?.id,
									})
								: T()("publish.requests.detail.request.details")}
						</h2>
						<Show when={request()?.isOutdated}>
							<Pill
								theme="warning-opaque"
								tooltip={T()("publish.requests.snapshot.outdated")}
								class="shrink-0 items-center gap-1.5"
							>
								<FaSolidTriangleExclamation size={10} />
								{T()("common.status.out.of.sync")}
							</Pill>
						</Show>
					</div>

					<div class="grid gap-1.5 text-sm">
						<div class="flex items-center justify-between gap-3">
							<span class="text-body">{T()("common.status")}</span>
							<span class="text-title">{statusLabel()}</span>
						</div>
						<Show when={executionStatusLabel()}>
							{(label) => (
								<div class="flex items-center justify-between gap-3">
									<span class="text-body">
										{T()("common.execution.status")}
									</span>
									<span class="text-title">{label()}</span>
								</div>
							)}
						</Show>
					</div>

					<dl class="grid grid-cols-2 gap-3 border-y border-border py-3 text-xs">
						<div class="min-w-0">
							<dt class="text-body">{T()("common.target")}</dt>
							<dd class="mt-1 truncate font-medium text-title">
								{targetLabel()}
							</dd>
						</div>
						<div class="min-w-0">
							<dt class="text-body">{T()("common.snapshot")}</dt>
							<dd class="mt-1 truncate font-medium text-title">
								#{request()?.snapshotVersionId ?? "-"}
							</dd>
						</div>
					</dl>
				</div>

				<Show when={showActions()}>
					<div class="grid gap-2">
						<Show when={request()?.status === "pending" && canReviewRequest()}>
							<div class="grid grid-cols-2 gap-2">
								<Button
									type="button"
									theme="primary"
									size="small"
									onClick={() => openDecision("approve")}
								>
									{T()("common.approve")}
								</Button>
								<Button
									type="button"
									theme="danger-outline"
									size="small"
									onClick={() => openDecision("reject")}
								>
									{T()("common.reject")}
								</Button>
							</div>
						</Show>
						<div class="grid grid-cols-2 gap-2">
							<Show when={canCancelRequest()}>
								<Button
									type="button"
									theme="border-outline"
									size="small"
									onClick={() => openDecision("cancel")}
								>
									{T()("common.cancel")}
								</Button>
							</Show>
							<Show when={request()?.permissions.reschedule}>
								<Button
									type="button"
									theme="border-outline"
									size="small"
									onClick={openReschedule}
								>
									{requestHasSchedule()
										? T()("common.reschedule.release")
										: T()("common.schedule")}
								</Button>
							</Show>
							<Show when={request()?.permissions.retry}>
								<Button
									type="button"
									theme="primary"
									size="small"
									loading={retry.action.isPending}
									onClick={() => {
										const publishRequest = request();
										if (!publishRequest) return;
										void retry.action.mutateAsync({
											id: publishRequest.id,
										});
									}}
								>
									{T()("common.retry.release")}
								</Button>
							</Show>
						</div>
					</div>
				</Show>

				<SidebarSection
					title={T()("publish.requests.detail.request.details")}
					icon={<FaSolidCircleInfo size={14} />}
					storageKey="lucid:release-request-sidebar:details-open"
				>
					<div class="rounded-md border border-border bg-card-base p-3">
						<dl class="grid gap-2 text-xs">
							<ReleaseRequestDetailRow label={T()("common.requested.by")}>
								<PublishOperationUserDetailValue
									user={request()?.requestedBy ?? null}
								/>
							</ReleaseRequestDetailRow>
							<Show when={request()?.createdAt}>
								<ReleaseRequestDetailRow label={T()("common.requested.at")}>
									<DateText date={request()?.createdAt} class="text-xs" />
								</ReleaseRequestDetailRow>
							</Show>
							<Show when={request()?.decidedBy}>
								<ReleaseRequestDetailRow label={T()("common.decided.by")}>
									<PublishOperationUserDetailValue
										user={request()?.decidedBy ?? null}
									/>
								</ReleaseRequestDetailRow>
							</Show>
							<Show when={request()?.decidedAt}>
								<ReleaseRequestDetailRow label={T()("common.updated.at")}>
									<DateText date={request()?.decidedAt} class="text-xs" />
								</ReleaseRequestDetailRow>
							</Show>
						</dl>
					</div>
				</SidebarSection>

				<Show
					when={
						request()?.scheduledAt ||
						request()?.executedAt ||
						request()?.failedAt ||
						request()?.executionErrorMessage
					}
				>
					<SidebarSection
						title={T()("common.execution.status")}
						icon={<FaSolidClock size={14} />}
						storageKey="lucid:release-request-sidebar:execution-open"
					>
						<div class="rounded-md border border-border bg-card-base p-3">
							<dl class="grid gap-2 text-xs">
								<Show when={request()?.scheduledAt}>
									<ReleaseRequestDetailRow label={T()("common.scheduled.for")}>
										<DateText date={request()?.scheduledAt} class="text-xs" />
									</ReleaseRequestDetailRow>
								</Show>
								<Show when={request()?.scheduledTimezone}>
									<ReleaseRequestDetailRow
										label={T()("common.scheduled.timezone")}
										value={request()?.scheduledTimezone}
									/>
								</Show>
								<Show when={request()?.executedAt}>
									<ReleaseRequestDetailRow label={T()("common.executed.at")}>
										<DateText date={request()?.executedAt} class="text-xs" />
									</ReleaseRequestDetailRow>
								</Show>
								<Show when={request()?.failedAt}>
									<ReleaseRequestDetailRow label={T()("common.failed.at")}>
										<DateText date={request()?.failedAt} class="text-xs" />
									</ReleaseRequestDetailRow>
								</Show>
								<Show when={request()?.executionErrorMessage}>
									<ReleaseRequestDetailRow
										label={T()("common.execution.error")}
									>
										<span class="whitespace-pre-wrap">
											{request()?.executionErrorMessage}
										</span>
									</ReleaseRequestDetailRow>
								</Show>
							</dl>
						</div>
					</SidebarSection>
				</Show>

				<Show
					when={(request()?.assignees.length ?? 0) > 0 || canUpdateReviewers()}
				>
					<SidebarSection
						title={T()("common.reviewers")}
						icon={<FaSolidUserCheck size={14} />}
						storageKey="lucid:release-request-sidebar:reviewers-open"
						meta={request()?.assignees.length}
					>
						<div class="grid gap-2">
							<div class="overflow-hidden rounded-md border border-border bg-card-base">
								<Show
									when={(request()?.assignees.length ?? 0) > 0}
									fallback={
										<div class="px-3 py-2 text-sm text-body">
											{T()("common.none")}
										</div>
									}
								>
									<For each={request()?.assignees ?? []}>
										{(assignee) => (
											<div class="flex min-w-0 items-center gap-2 border-b border-border px-3 py-2 text-sm text-title last:border-b-0">
												<UserDisplay
													user={{
														username:
															assignee.user.username ??
															assignee.user.email ??
															T()("media.types.unknown"),
														firstName: assignee.user.firstName,
														lastName: assignee.user.lastName,
														profilePicture: assignee.user.profilePicture,
													}}
													mode="icon"
													size="x-small"
												/>
												<span class="min-w-0 truncate">
													{helpers.formatUserName(assignee.user, "simple") ||
														formatPublishOperationUser(assignee.user)}
												</span>
											</div>
										)}
									</For>
								</Show>
							</div>
							<Show when={canUpdateReviewers()}>
								<Button
									type="button"
									theme="border-outline"
									size="small"
									onClick={() => setReviewersOpen(true)}
								>
									{T()("actions.update.reviewers")}
								</Button>
							</Show>
						</div>
					</SidebarSection>
				</Show>

				<Show when={request()?.requestComment || request()?.decisionComment}>
					<SidebarSection
						title={T()("common.comment")}
						icon={<FaSolidPaperPlane size={14} />}
						storageKey="lucid:release-request-sidebar:comments-open"
					>
						<div class="grid gap-2">
							<ReleaseRequestCommentBlock
								label={T()("common.comment")}
								value={request()?.requestComment ?? null}
							/>
							<ReleaseRequestCommentBlock
								label={T()("common.decision.comment")}
								value={request()?.decisionComment ?? null}
							/>
						</div>
					</SidebarSection>
				</Show>
			</aside>

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
					confirm: getDecisionConfirm(decisionAction()),
					error: error(),
				}}
				callbacks={{
					onConfirm: submitDecision,
					onCancel: () => {
						setDecisionOpen(false);
						setDecisionAction(undefined);
						setDecisionComment("");
						resetSchedule();
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
							label: T()("common.comment"),
							placeholder: T()("publish.requests.decision.comment.placeholder"),
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
									label: T()("documents.release.timing"),
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
					title: requestHasSchedule()
						? T()("common.reschedule.release")
						: T()("documents.release.schedule.action"),
					description: T()("modals.common.schedule.release.description"),
					confirm: T()("actions.update.schedule"),
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
								{T()("common.cancel")}
							</Button>
							<Show when={requestHasSchedule()}>
								<Button
									theme="danger-outline"
									size="medium"
									type="button"
									loading={reschedule.action.isPending}
									onClick={removeSchedule}
								>
									{T()("documents.release.schedule.remove")}
								</Button>
							</Show>
							<Button
								theme="primary"
								size="medium"
								type="button"
								loading={reschedule.action.isPending}
								onClick={saveReschedule}
							>
								{requestHasSchedule()
									? T()("actions.update.schedule")
									: T()("documents.release.schedule.action")}
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
			<PublishOperationReviewers
				operation={request}
				state={{
					open: reviewersOpen(),
					setOpen: setReviewersOpen,
				}}
			/>
		</>
	);
};
