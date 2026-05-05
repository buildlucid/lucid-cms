import type { Collection, DocumentVersionType } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";
import { Checkbox, SelectMultiple, Textarea } from "@/components/Groups/Form";
import type { SelectMultipleValueT } from "@/components/Groups/Form/SelectMultiple";
import { Confirmation } from "@/components/Groups/Modal";
import Pill from "@/components/Partials/Pill";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

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
		) => void | Promise<void>;
		onCancel: () => void;
	};
}> = (props) => {
	// ----------------------------------
	// State / Hooks
	const [comment, setComment] = createSignal("");
	const [assignees, setAssignees] = createSignal<SelectMultipleValueT[]>([]);
	const [autoAccept, setAutoAccept] = createSignal(false);
	const [validationError, setValidationError] = createSignal<string>();

	const reviewers = api.publishRequests.useGetReviewers({
		queryParams: {
			collectionKey: props.collectionKey,
			target: () => props.target() ?? undefined,
		},
		enabled: () => props.state.open && props.target() !== null,
	});

	// ----------------------------------
	// Memos
	const reviewerOptions = createMemo<SelectMultipleValueT[]>(() =>
		(reviewers.data?.data ?? []).map((reviewer) => ({
			value: reviewer.id,
			label: helpers.formatUserName(reviewer, "username"),
		})),
	);
	const requireComment = createMemo(
		() =>
			props.collection()?.config.publishRequests?.requireRequestComment !==
			false,
	);
	const requireDecisionComment = createMemo(
		() =>
			props.collection()?.config.publishRequests?.requireDecisionComment ===
			true,
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
		const publishRequests = props.collection()?.config.publishRequests;
		if (!environment || publishRequests?.allowSelfApproval !== true) {
			return false;
		}

		return userStore.get.hasPermission([environment.permissions.review]).all;
	});
	const error = createMemo(
		() => validationError() || reviewers.error?.message || props.error,
	);

	// ----------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;
		props.target();
		setComment("");
		setAssignees([]);
		setAutoAccept(false);
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
				description: T()("publish_request_modal_description", {
					environment: props.environmentLabel() ?? "",
				}),
				error: error(),
			}}
			callbacks={{
				onConfirm: async () => {
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
						autoAccept() &&
						requireDecisionComment() &&
						comment().trim().length === 0
					) {
						setValidationError(T()("publish_request_comment_required"));
						return;
					}
					await props.callbacks.onConfirm(
						target,
						comment().trim() || undefined,
						assignees().map((assignee) => Number(assignee.value)),
						autoAccept(),
					);
				},
				onCancel: props.callbacks.onCancel,
			}}
		>
			<div class="flex flex-col gap-4 pb-2">
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
				<SelectMultiple
					id="publish-request-reviewers"
					name="publish-request-reviewers"
					values={assignees()}
					onChange={setAssignees}
					options={reviewerOptions()}
					disabled={reviewers.isFetching || autoAccept()}
					copy={{
						label: T()("reviewers"),
						placeholder: T()("select_reviewers"),
					}}
					noMargin={true}
				/>
				<Show when={canAutoAccept()}>
					<Checkbox
						id="publish-request-auto-accept"
						name="publish-request-auto-accept"
						value={autoAccept()}
						onChange={(value) => {
							setAutoAccept(value);
							setValidationError(undefined);
							if (value) setAssignees([]);
						}}
						copy={{
							label: T()("publish_request_auto_accept_label"),
							describedBy: T()("publish_request_auto_accept_description"),
						}}
						noMargin={true}
					/>
				</Show>
				<Show when={assignees().length > 0}>
					<div class="flex flex-wrap gap-1.5">
						<For each={assignees()}>
							{(assignee) => <Pill theme="outline">{assignee.label}</Pill>}
						</For>
					</div>
				</Show>
				<p class="text-xs text-body">
					{T()("publish_request_replacement_warning")}
				</p>
			</div>
		</Confirmation>
	);
};

export default CreatePublishRequest;
