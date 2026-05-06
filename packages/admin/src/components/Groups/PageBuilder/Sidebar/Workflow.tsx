import type { Collection, InternalCollectionDocument } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import { Select, SelectMultiple } from "@/components/Groups/Form";
import Button from "@/components/Partials/Button";
import Pill from "@/components/Partials/Pill";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import { sameNumericSet } from "@/utils/array-helpers";
import helpers from "@/utils/helpers";
import { formatStageName, getStageColor } from "./helpers";

export const Workflow: Component<{
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	document: Accessor<InternalCollectionDocument | undefined>;
	documentId: Accessor<number | undefined>;
	disabled: Accessor<boolean>;
	mutations: UseDocumentMutations;
}> = (props) => {
	// ----------------------------------
	// State
	const [stage, setStage] = createSignal<string | undefined>();
	const [assignees, setAssignees] = createSignal<
		Array<{ value: string | number; label: string }>
	>([]);

	// ----------------------------------
	// Memos
	const workflowConfig = createMemo(() => props.collection()?.config.workflow);
	const workflow = createMemo(() => props.document()?.workflow);
	const workflowKey = createMemo(() =>
		[
			props.documentId(),
			workflow()?.stage,
			workflow()
				?.assignees.map((assignee) => assignee.user.id)
				.sort((a, b) => a - b)
				.join(","),
			workflow()?.updatedAt,
		].join(":"),
	);
	const currentAssigneeIds = createMemo(
		() => workflow()?.assignees.map((assignee) => assignee.user.id) ?? [],
	);
	const selectedAssigneeIds = createMemo(() =>
		assignees().map((assignee) => Number(assignee.value)),
	);
	const hasUpdatePermission = createMemo(() => {
		const permission = props.collection()?.permissions.update;
		if (!permission) return false;
		return userStore.get.hasPermission([permission]).all;
	});
	const stageOptions = createMemo(
		() =>
			workflowConfig()?.stages.map((stage) => ({
				value: stage.key,
				label:
					helpers.getLocaleValue({
						value: stage.name,
						fallback: stage.key,
					}) || stage.key,
			})) ?? [],
	);
	const assigneeQuery = api.documents.useGetWorkflowAssignees({
		queryParams: {
			location: {
				collectionKey: props.collectionKey,
			},
		},
		enabled: () => Boolean(workflowConfig() && props.documentId()),
	});
	const assigneeOptions = createMemo(
		() =>
			assigneeQuery.data?.data.map((user) => ({
				value: user.id,
				label: helpers.formatUserName(
					{
						username: user.username ?? user.email ?? T()("unknown"),
						firstName: user.firstName,
						lastName: user.lastName,
					},
					"username",
				),
			})) ?? [],
	);
	const stageChanged = createMemo(
		() => stage() !== undefined && stage() !== workflow()?.stage,
	);
	const assigneesChanged = createMemo(
		() => !sameNumericSet(currentAssigneeIds(), selectedAssigneeIds()),
	);
	const hasChanges = createMemo(() => stageChanged() || assigneesChanged());
	const updateDisabled = createMemo(
		() =>
			props.disabled() ||
			!hasUpdatePermission() ||
			!hasChanges() ||
			props.mutations.updateWorkflowMutation.action.isPending ||
			assigneeQuery.isFetching,
	);

	// ----------------------------------
	// Effects
	createEffect(() => {
		workflowKey();
		setStage(workflow()?.stage ?? workflowConfig()?.initial);
		setAssignees(
			workflow()?.assignees.map((assignee) => ({
				value: assignee.user.id,
				label: helpers.formatUserName(
					{
						username:
							assignee.user.username ?? assignee.user.email ?? T()("unknown"),
						firstName: assignee.user.firstName,
						lastName: assignee.user.lastName,
					},
					"username",
				),
			})) ?? [],
		);
	});

	// ----------------------------------
	// Functions
	const updateWorkflow = async () => {
		if (!hasChanges()) return;

		await props.mutations.updateWorkflowAction({
			stage: stageChanged() ? stage() : undefined,
			assigneeIds: assigneesChanged() ? selectedAssigneeIds() : undefined,
		});
	};

	// ----------------------------------
	// Render
	return (
		<Show when={workflowConfig()}>
			<section>
				<div class="flex items-center justify-between gap-3 mb-4">
					<h3 class="text-sm font-semibold text-title">{T()("workflow")}</h3>
					<Show when={workflow()?.stage}>
						<Pill
							theme={getStageColor({
								collection: props.collection(),
								stageKey: workflow()?.stage,
							})}
						>
							{formatStageName({
								collection: props.collection(),
								stageKey: workflow()?.stage,
							})}
						</Pill>
					</Show>
				</div>
				<div class="space-y-3">
					<Select
						id="document-workflow-stage"
						name="document-workflow-stage"
						value={stage()}
						onChange={(value) => setStage(value?.toString())}
						options={stageOptions()}
						copy={{ label: T()("workflow_stage") }}
						noClear={true}
						disabled={props.disabled() || !hasUpdatePermission()}
					/>
					<SelectMultiple
						id="document-workflow-assignees"
						name="document-workflow-assignees"
						values={assignees()}
						onChange={setAssignees}
						options={assigneeOptions()}
						copy={{ label: T()("workflow_assignees") }}
						disabled={props.disabled() || !hasUpdatePermission()}
					/>
					<Show when={props.disabled()}>
						<p class="text-xs text-body">{T()("workflow_unsaved_disabled")}</p>
					</Show>
					<Button
						type="button"
						theme="secondary"
						size="small"
						onClick={updateWorkflow}
						disabled={updateDisabled()}
						loading={props.mutations.updateWorkflowMutation.action.isPending}
						permission={hasUpdatePermission()}
						classes="w-full"
					>
						{T()("workflow_update")}
					</Button>
				</div>
			</section>
		</Show>
	);
};
