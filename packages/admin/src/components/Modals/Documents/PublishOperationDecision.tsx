import type { Collection, PublishOperation } from "@types";
import type { Accessor, Component } from "solid-js";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import { Select, Textarea } from "@/components/Groups/Form";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";
import T from "@/translations";
import {
	getDefaultTimezone,
	getScheduledAt,
	type ReleaseTiming,
} from "@/utils/release-schedule";
import ReleaseScheduleFields from "./ReleaseScheduleFields";

export type PublishOperationDecisionAction = "approve" | "reject" | "cancel";

const getDecisionTitle = (action?: PublishOperationDecisionAction) => {
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

const getDecisionDescription = (action?: PublishOperationDecisionAction) => {
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

const getDecisionConfirm = (action?: PublishOperationDecisionAction) => {
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

const PublishOperationDecision: Component<{
	collection: Accessor<Collection | undefined>;
	operation: Accessor<PublishOperation | undefined>;
	action: Accessor<PublishOperationDecisionAction | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onSuccess?: () => void;
		onClose?: () => void;
	};
}> = (props) => {
	// ----------------------------------
	// State / Hooks
	const [decisionComment, setDecisionComment] = createSignal("");
	const [scheduleEnabled, setScheduleEnabled] = createSignal(false);
	const [scheduleDate, setScheduleDate] = createSignal("");
	const [scheduleTime, setScheduleTime] = createSignal("");
	const [scheduleTimezone, setScheduleTimezone] = createSignal(
		getDefaultTimezone(),
	);
	const [validationError, setValidationError] = createSignal<string>();

	// ----------------------------------
	// Queries
	const decision = api.publishOperations.useDecision({
		onSuccess: () => {
			resetState();
			props.state.setOpen(false);
			props.callbacks?.onSuccess?.();
		},
	});

	// ----------------------------------
	// Memos
	const schedulingSupported = createMemo(
		() => props.collection()?.capabilities.scheduling === true,
	);
	const requireDecisionComment = createMemo(
		() =>
			props.collection()?.review?.comments.decision === "required" &&
			props.action() !== "cancel",
	);
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
		() => validationError() || decision.errors()?.message,
	);

	// ----------------------------------
	// Functions
	const resetSchedule = () => {
		setScheduleEnabled(false);
		setScheduleDate("");
		setScheduleTime("");
		setScheduleTimezone(getDefaultTimezone());
	};
	const resetState = () => {
		setDecisionComment("");
		resetSchedule();
		setValidationError(undefined);
		decision.reset();
	};
	const prefillSchedule = () => {
		const operation = props.operation();
		if (operation?.scheduledAt) {
			const scheduledAt = new Date(operation.scheduledAt);
			setScheduleEnabled(true);
			setScheduleDate(scheduledAt.toISOString().slice(0, 10));
			setScheduleTime(scheduledAt.toISOString().slice(11, 16));
			setScheduleTimezone(operation.scheduledTimezone ?? getDefaultTimezone());
			return;
		}

		resetSchedule();
	};
	const updateReleaseTiming = (value: ReleaseTiming) => {
		setScheduleEnabled(value === "scheduled");
		setValidationError(undefined);
	};
	const close = () => {
		props.state.setOpen(false);
		resetState();
		props.callbacks?.onClose?.();
	};
	const submitDecision = async () => {
		const action = props.action();
		const operation = props.operation();
		if (!action || !operation) return;
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
			id: operation.id,
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

	// ----------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;
		setDecisionComment("");
		setValidationError(undefined);
		prefillSchedule();
	});

	// ----------------------------------
	// Render
	return (
		<Confirmation
			theme={props.action() === "reject" ? "danger" : "primary"}
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: decision.action.isPending,
				isError: !!error(),
			}}
			copy={{
				title: getDecisionTitle(props.action()),
				description: getDecisionDescription(props.action()),
				confirm: getDecisionConfirm(props.action()),
				error: error(),
			}}
			callbacks={{
				onConfirm: submitDecision,
				onCancel: close,
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
				<Show when={props.action() === "approve" && schedulingSupported()}>
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
	);
};

export default PublishOperationDecision;
