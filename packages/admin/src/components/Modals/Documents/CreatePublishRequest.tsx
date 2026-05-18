import type {
	Collection,
	DocumentVersionType,
	PublishOperationReviewer,
} from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import {
	CheckboxButton,
	Label,
	Select,
	SelectMultiple,
	Textarea,
} from "@/components/Groups/Form";
import type { SelectMultipleValueT } from "@/components/Groups/Form/SelectMultiple";
import { Confirmation } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import UserSelectOption from "@/components/Partials/UserSelectOption";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import {
	getDefaultTimezone,
	getScheduledAt,
	type ReleaseTiming,
} from "@/utils/release-schedule";
import ReleaseScheduleFields from "./ReleaseScheduleFields";

type ReviewerOption = SelectMultipleValueT & {
	user: PublishOperationReviewer;
};

const CreatePublishRequest: Component<{
	target: Accessor<Exclude<DocumentVersionType, "revision"> | null>;
	environmentLabel: Accessor<string>;
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	loading?: boolean;
	error?: string;
	callbacks: {
		onConfirm: (
			target: Exclude<DocumentVersionType, "revision">,
			comment?: string,
			assigneeIds?: number[],
			autoAccept?: boolean,
			scheduledAt?: string,
			scheduledTimezone?: string,
		) => void | Promise<void>;
		onCancel: () => void;
	};
}> = (props) => {
	// ----------------------------------
	// State / Hooks
	const [comment, setComment] = createSignal("");
	const [assignees, setAssignees] = createSignal<ReviewerOption[]>([]);
	const [autoAccept, setAutoAccept] = createSignal(false);
	const [releaseTiming, setReleaseTiming] = createSignal<ReleaseTiming>("now");
	const [scheduleDate, setScheduleDate] = createSignal("");
	const [scheduleTime, setScheduleTime] = createSignal("");
	const [scheduleTimezone, setScheduleTimezone] = createSignal(
		getDefaultTimezone(),
	);
	const [validationError, setValidationError] = createSignal<string>();

	const reviewers = api.publishOperations.useGetReviewers({
		queryParams: {
			collectionKey: props.collectionKey,
			target: () => props.target() ?? undefined,
		},
		enabled: () => props.state.open && props.target() !== null,
	});

	// ----------------------------------
	// Memos
	const reviewerOptions = createMemo<ReviewerOption[]>(() =>
		(reviewers.data?.data ?? []).map((reviewer) => ({
			value: reviewer.id,
			label: helpers.formatUserName(reviewer, "simple") || T()("unknown"),
			user: reviewer,
		})),
	);
	const releaseTimingOptions = createMemo(() => [
		{
			value: "now",
			label: T()("request_now"),
		},
		{
			value: "scheduled",
			label: T()("schedule_request"),
		},
	]);
	const requireComment = createMemo(
		() => props.collection()?.config.review?.comments.request === "required",
	);
	const requireDecisionComment = createMemo(
		() => props.collection()?.config.review?.comments.decision === "required",
	);
	const targetEnvironment = createMemo(() =>
		props
			.collection()
			?.config.environments.find(
				(environment) => environment.key === props.target(),
			),
	);
	const canAutoAccept = createMemo(() => {
		const environment = targetEnvironment();
		const publishReview = props.collection()?.config.review;
		if (!environment || publishReview?.allowSelfApproval !== true) {
			return false;
		}

		return userStore.get.hasPermission([environment.permissions.review]).all;
	});
	const canSchedule = createMemo(
		() => props.collection()?.capabilities.scheduling === true,
	);
	const scheduleSelected = createMemo(
		() => canSchedule() && releaseTiming() === "scheduled",
	);
	const error = createMemo(
		() => validationError() || reviewers.error?.message || props.error,
	);

	// ----------------------------------
	// Functions
	const updateReleaseTiming = (value: ReleaseTiming) => {
		setReleaseTiming(value);
		setValidationError(undefined);
	};
	const submitRequest = async (autoAccept: boolean) => {
		const target = props.target();
		if (!target) {
			setValidationError(T()("publish_request_missing_target"));
			return;
		}
		if (requireComment() && comment().trim().length === 0) {
			setValidationError(T()("publish_request_comment_required"));
			return;
		}
		if (
			autoAccept &&
			requireDecisionComment() &&
			comment().trim().length === 0
		) {
			setValidationError(T()("publish_request_comment_required"));
			return;
		}

		const scheduledAt = scheduleSelected()
			? getScheduledAt({
					date: scheduleDate(),
					time: scheduleTime(),
					timezone: scheduleTimezone(),
				})
			: undefined;
		if (scheduleSelected() && !scheduledAt) {
			setValidationError(T()("schedule_release_required"));
			return;
		}

		await props.callbacks.onConfirm(
			target,
			comment().trim() || undefined,
			autoAccept ? [] : assignees().map((assignee) => Number(assignee.value)),
			autoAccept,
			scheduledAt ?? undefined,
			scheduledAt ? scheduleTimezone() : undefined,
		);
	};
	const updateAutoAccept = (value: boolean) => {
		setAutoAccept(value);
		setValidationError(undefined);
		if (value) setAssignees([]);
	};

	// ----------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;
		props.target();
		setComment("");
		setAssignees([]);
		setAutoAccept(false);
		setReleaseTiming("now");
		setScheduleDate("");
		setScheduleTime("");
		setScheduleTimezone(getDefaultTimezone());
		setValidationError(undefined);
	});

	createEffect(() => {
		if (canAutoAccept()) return;
		setAutoAccept(false);
	});

	// ----------------------------------
	// Render
	return (
		<Confirmation
			theme="primary"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: props.loading,
				isError: !!error(),
			}}
			copy={{
				title: T()("publish_request_modal_title", {
					environment: props.environmentLabel() ?? "",
				}),
				description: `${T()("publish_request_modal_description", {
					environment: props.environmentLabel() ?? "",
				})} ${T()("publish_request_replacement_warning")}`,
				error: error(),
				confirm: T()("publish_request_publish_confirm"),
			}}
			callbacks={{
				onConfirm: () => submitRequest(autoAccept()),
				onCancel: props.callbacks.onCancel,
			}}
			slots={{
				actions: (
					<>
						<Button
							theme="border-outline"
							size="medium"
							type="button"
							disabled={props.loading}
							onClick={props.callbacks.onCancel}
						>
							{T()("cancel")}
						</Button>
						<Button
							theme="primary"
							size="medium"
							type="button"
							loading={props.loading}
							onClick={() => submitRequest(autoAccept())}
						>
							{autoAccept()
								? scheduleSelected()
									? T()("approve_and_schedule")
									: T()("approve_and_release")
								: scheduleSelected()
									? T()("publish_request_schedule_confirm")
									: T()("publish_request_publish_confirm")}
						</Button>
					</>
				),
			}}
		>
			<div class="flex flex-col gap-5 pb-4 md:pb-6">
				<Textarea
					id="publish-request-comment"
					name="publish-request-comment"
					value={comment()}
					onChange={(value) => {
						setComment(value);
						setValidationError(undefined);
					}}
					required={
						requireComment() || (autoAccept() && requireDecisionComment())
					}
					rows={4}
					copy={{
						label: T()("comment"),
						placeholder: T()("publish_request_comment_placeholder"),
					}}
					noMargin={true}
				/>
				<Show when={!autoAccept()}>
					<SelectMultiple
						id="publish-request-reviewers"
						name="publish-request-reviewers"
						values={assignees()}
						onChange={setAssignees}
						options={reviewerOptions()}
						disabled={reviewers.isFetching}
						copy={{
							label: T()("reviewers"),
							placeholder: T()("select_reviewers"),
						}}
						triggerClasses="items-start gap-2 p-2"
						selectedValuesContainerClasses="gap-0"
						selectedValueClasses="group w-full rounded-none first:rounded-t-md last:rounded-b-md border-x border-t last:border-b border-border bg-card-base hover:bg-card-hover text-title px-2 py-1.5"
						renderValue={(props) => (
							<UserSelectOption
								user={props.value.user}
								label={props.value.label}
								removeValue={props.removeValue}
							/>
						)}
						renderOption={(props) => (
							<UserSelectOption
								user={props.option.user}
								label={props.option.label}
							/>
						)}
						noMargin={true}
					/>
				</Show>
				<Show when={canSchedule()}>
					<div class="grid gap-3">
						<Select
							id="publish-request-release-timing"
							name="publish-request-release-timing"
							value={releaseTiming()}
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
						<Show when={scheduleSelected()}>
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
				<Show when={canAutoAccept()}>
					<div>
						<Label
							id="publish-request-auto-accept"
							label={T()("approval")}
							theme="basic"
							hideOptionalText={true}
						/>
						<CheckboxButton
							id="publish-request-auto-accept"
							name="publish-request-auto-accept"
							value={autoAccept()}
							onChange={updateAutoAccept}
							copy={{
								label: T()("publish_request_auto_accept_label"),
								describedBy: T()("publish_request_auto_accept_description"),
							}}
							theme="secondary"
						/>
					</div>
				</Show>
			</div>
		</Confirmation>
	);
};

export default CreatePublishRequest;
