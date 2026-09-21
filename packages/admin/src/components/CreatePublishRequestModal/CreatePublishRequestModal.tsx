import type { RichTextJSON } from "@lucidcms/rich-text";
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
import Button from "@/components/Button/Button";
import Checkbox from "@/components/Checkbox/Checkbox";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import Modal from "@/components/Modal/Modal";
import ReleaseScheduleFields from "@/components/ReleaseScheduleFields/ReleaseScheduleFields";
import RichText from "@/components/RichText/RichText";
import Select from "@/components/Select/Select";
import type { SelectMultipleOption } from "@/components/SelectMultiple/SelectMultiple";
import SelectMultiple from "@/components/SelectMultiple/SelectMultiple";
import UserSelectOption from "@/components/UserSelectOption/UserSelectOption";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import {
	getDefaultTimezone,
	getScheduledAt,
	type ReleaseTiming,
} from "@/utils/release-schedule";
import {
	createEmptyRichTextValue,
	getRichTextPlainText,
} from "@/utils/rich-text";

type ReviewerOption = SelectMultipleOption & {
	user: PublishOperationReviewer;
};

const CreatePublishRequestModal: Component<{
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
			comment?: RichTextJSON,
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
	const [comment, setComment] = createSignal<RichTextJSON>(
		createEmptyRichTextValue(),
	);
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
			label:
				helpers.formatUserName(reviewer, "simple") ||
				T()("media.types.unknown"),
			user: reviewer,
		})),
	);
	const releaseTimingOptions = createMemo(() => [
		{
			value: "now",
			label: T()("common.request.now"),
		},
		{
			value: "scheduled",
			label: T()("common.schedule.request"),
		},
	]);
	const requireComment = createMemo(
		() =>
			props.collection()?.publishing.review?.comments.request === "required",
	);
	const requireDecisionComment = createMemo(
		() =>
			props.collection()?.publishing.review?.comments.decision === "required",
	);
	const commentText = createMemo(() => getRichTextPlainText(comment()));
	const targetEnvironment = createMemo(() =>
		props
			.collection()
			?.publishing.targets.find(
				(environment) => environment.key === props.target(),
			),
	);
	const canAutoAccept = createMemo(() => {
		const environment = targetEnvironment();
		const publishReview = props.collection()?.publishing.review;
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
			setValidationError(T()("publish.requests.validation.target.required"));
			return;
		}
		if (requireComment() && commentText().length === 0) {
			setValidationError(T()("publish.requests.validation.comment.required"));
			return;
		}
		if (autoAccept && requireDecisionComment() && commentText().length === 0) {
			setValidationError(T()("publish.requests.validation.comment.required"));
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
			setValidationError(T()("documents.release.schedule.validation.required"));
			return;
		}

		await props.callbacks.onConfirm(
			target,
			commentText() ? comment() : undefined,
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
		setComment(createEmptyRichTextValue());
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
		<Modal.Root
			role="alertdialog"
			open={props.state.open}
			onOpenChange={(open) => {
				if (open) props.state.setOpen(true);
				else props.callbacks.onCancel();
			}}
		>
			<Modal.Header>
				<Modal.Title>
					{T()("modals.publish.requests.request.title", {
						environment: props.environmentLabel() ?? "",
					})}
				</Modal.Title>
				<Modal.Description>{`${T()(
					"modals.publish.requests.request.description",
					{
						environment: props.environmentLabel() ?? "",
					},
				)} ${T()("publish.requests.replacement.warning")}`}</Modal.Description>
			</Modal.Header>
			<Modal.Body>
				<div class="flex flex-col gap-3">
					<RichText
						name="publish-request-comment"
						id="publish-request-comment"
						value={comment()}
						onChange={(value) => {
							setComment(value);
							setValidationError(undefined);
						}}
						required={
							requireComment() || (autoAccept() && requireDecisionComment())
						}
						label={T()("common.comment")}
						placeholder={T()("publish.requests.comment.placeholder")}
						headings={false}
						underline={false}
						strikethrough={false}
					/>
					<Show when={!autoAccept()}>
						<SelectMultiple
							id="publish-request-reviewers"
							name="publish-request-reviewers"
							values={assignees()}
							onChange={setAssignees}
							options={reviewerOptions()}
							disabled={reviewers.isFetching}
							label={T()("common.reviewers")}
							placeholder={T()("selectors.reviewers")}
							variant="list"
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
								label={T()("documents.release.timing")}
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
							<FormLabel
								id="publish-request-auto-accept"
								label={T()("common.approval")}
								theme="basic"
							/>
							<Checkbox
								variant="button-secondary"
								id="publish-request-auto-accept"
								name="publish-request-auto-accept"
								value={autoAccept()}
								onChange={updateAutoAccept}
								label={T()("publish.requests.auto.accept.label")}
								description={T()("publish.requests.auto.accept.description")}
							/>
						</div>
					</Show>
				</div>
			</Modal.Body>
			<Modal.Footer>
				<ErrorMessage theme="basic" message={error()} />
				<Modal.Actions>
					<Button
						variant="outline"
						size="md"
						type="button"
						disabled={props.loading}
						onClick={props.callbacks.onCancel}
					>
						{T()("common.cancel")}
					</Button>
					<Button
						variant="primary"
						size="md"
						type="button"
						loading={props.loading}
						onClick={() => submitRequest(autoAccept())}
					>
						{autoAccept()
							? scheduleSelected()
								? T()("common.approve.and.schedule")
								: T()("common.approve.and.release")
							: scheduleSelected()
								? T()("publish.requests.schedule.confirm")
								: T()("publish.requests.publish.confirm")}
					</Button>
				</Modal.Actions>
			</Modal.Footer>
		</Modal.Root>
	);
};

export default CreatePublishRequestModal;
