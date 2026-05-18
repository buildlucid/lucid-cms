import type { PublishOperation, PublishOperationReviewer } from "@types";
import type { Accessor, Component } from "solid-js";
import { createEffect, createMemo, createSignal } from "solid-js";
import { SelectMultiple } from "@/components/Groups/Form";
import type { SelectMultipleValueT } from "@/components/Groups/Form/SelectMultiple";
import { Confirmation } from "@/components/Groups/Modal";
import UserSelectOption from "@/components/Partials/UserSelectOption";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";

type ReviewerOption = SelectMultipleValueT & {
	user: PublishOperationReviewer;
};

const PublishOperationReviewers: Component<{
	operation: Accessor<PublishOperation | undefined>;
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
	const [assignees, setAssignees] = createSignal<ReviewerOption[]>([]);
	const [validationError, setValidationError] = createSignal<string>();

	// ----------------------------------
	// Queries & Mutations
	const reviewers = api.publishOperations.useGetReviewers({
		queryParams: {
			collectionKey: () => props.operation()?.collectionKey,
			target: () => props.operation()?.target,
		},
		enabled: () => props.state.open && props.operation() !== undefined,
	});
	const updateReviewers = api.publishOperations.useUpdateReviewers({
		onSuccess: () => {
			props.state.setOpen(false);
			resetState();
			props.callbacks?.onSuccess?.();
		},
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
	const error = createMemo(
		() =>
			validationError() ||
			reviewers.error?.message ||
			updateReviewers.errors()?.message,
	);

	// ----------------------------------
	// Functions
	const resetState = () => {
		setAssignees([]);
		setValidationError(undefined);
		updateReviewers.reset();
	};
	const close = () => {
		props.state.setOpen(false);
		resetState();
		props.callbacks?.onClose?.();
	};
	const submitReviewers = async () => {
		const operation = props.operation();
		if (!operation) return;

		await updateReviewers.action.mutateAsync({
			id: operation.id,
			body: {
				assigneeIds: assignees().map((assignee) => Number(assignee.value)),
			},
		});
	};

	// ----------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;
		const operation = props.operation();
		if (!operation) return;

		setValidationError(undefined);
		setAssignees(
			operation.assignees.map((assignee) => ({
				value: assignee.user.id,
				label:
					helpers.formatUserName(assignee.user, "simple") || T()("unknown"),
				user: {
					id: assignee.user.id,
					email: assignee.user.email ?? "",
					username: assignee.user.username ?? "",
					firstName: assignee.user.firstName,
					lastName: assignee.user.lastName,
					profilePicture: assignee.user.profilePicture,
				},
			})),
		);
	});

	// ----------------------------------
	// Render
	return (
		<Confirmation
			theme="primary"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: updateReviewers.action.isPending,
				isError: !!error(),
			}}
			copy={{
				title: T()("update_reviewers"),
				description: T()("update_reviewers_description"),
				confirm: T()("update_reviewers"),
				error: error(),
			}}
			callbacks={{
				onConfirm: submitReviewers,
				onCancel: close,
			}}
		>
			<div class="pb-4 md:pb-6">
				<SelectMultiple<ReviewerOption>
					id="publish-operation-reviewers"
					name="publish-operation-reviewers"
					values={assignees()}
					onChange={(values) => {
						setAssignees(values);
						setValidationError(undefined);
					}}
					options={reviewerOptions()}
					disabled={reviewers.isFetching || updateReviewers.action.isPending}
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
			</div>
		</Confirmation>
	);
};

export default PublishOperationReviewers;
