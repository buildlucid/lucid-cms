import { debounce } from "@solid-primitives/scheduled";
import type {
	Collection,
	DocumentWorkflowAssignee,
	InternalCollectionDocument,
} from "@types";
import { FaSolidChartDiagram } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";
import { Select, SelectMultiple } from "@/components/Groups/Form";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import { sameNumericSet } from "@/utils/array-helpers";
import helpers from "@/utils/helpers";
import WorkflowAssigneeOption from "../../../Partials/WorkflowAssigneeOption";
import WorkflowStageOption from "../../../Partials/WorkflowStageOption";
import { getStageColor } from "./helpers";

type AssigneeOption = {
	value: number;
	label: string;
	user: DocumentWorkflowAssignee["user"];
};
type WorkflowUpdateBody = { stage?: string; assigneeIds?: number[] };

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
	const [assignees, setAssignees] = createSignal<Array<AssigneeOption>>([]);

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
					"simple",
				),
				user,
			})) ?? [],
	);
	const updatePending = createMemo(
		() => props.mutations.updateWorkflowMutation.action.isPending,
	);
	const fieldsDisabled = createMemo(
		() => props.disabled() || !hasUpdatePermission() || updatePending(),
	);

	// ----------------------------------
	// Functions
	const syncWorkflowState = () => {
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
					"simple",
				),
				user: assignee.user,
			})) ?? [],
		);
	};
	const getWorkflowStageColor = (stageKey?: string | number) =>
		getStageColor({
			collection: props.collection(),
			stageKey: stageKey?.toString(),
		});
	let pendingWorkflowUpdate: WorkflowUpdateBody = {};
	const hasPendingWorkflowUpdate = () =>
		pendingWorkflowUpdate.stage !== undefined ||
		pendingWorkflowUpdate.assigneeIds !== undefined;
	const clearPendingWorkflowUpdate = (key: keyof WorkflowUpdateBody) => {
		delete pendingWorkflowUpdate[key];
		if (!hasPendingWorkflowUpdate()) debouncedUpdateWorkflow.clear();
	};
	const debouncedUpdateWorkflow = debounce(() => {
		const body = pendingWorkflowUpdate;
		pendingWorkflowUpdate = {};

		if (body.stage === undefined && body.assigneeIds === undefined) return;
		if (updatePending()) {
			pendingWorkflowUpdate = {
				...body,
				...pendingWorkflowUpdate,
			};
			debouncedUpdateWorkflow();
			return;
		}

		void props.mutations.updateWorkflowAction(body).catch(() => {
			syncWorkflowState();
		});
	}, 500);
	const queueWorkflowUpdate = (body: WorkflowUpdateBody) => {
		pendingWorkflowUpdate = {
			...pendingWorkflowUpdate,
			...body,
		};
		debouncedUpdateWorkflow();
	};
	const handleStageChange = (value: string | number | undefined) => {
		const nextStage = value?.toString();
		setStage(nextStage);

		if (nextStage === undefined || nextStage === workflow()?.stage) {
			clearPendingWorkflowUpdate("stage");
			return;
		}

		queueWorkflowUpdate({ stage: nextStage });
	};
	const handleAssigneesChange = (nextAssignees: Array<AssigneeOption>) => {
		setAssignees(nextAssignees);

		const nextAssigneeIds = nextAssignees.map((assignee) =>
			Number(assignee.value),
		);
		if (sameNumericSet(currentAssigneeIds(), nextAssigneeIds)) {
			clearPendingWorkflowUpdate("assigneeIds");
			return;
		}

		queueWorkflowUpdate({ assigneeIds: nextAssigneeIds });
	};

	// ----------------------------------
	// Effects
	createEffect(() => {
		workflowKey();
		pendingWorkflowUpdate = {};
		debouncedUpdateWorkflow.clear();
		syncWorkflowState();
	});

	onCleanup(() => {
		debouncedUpdateWorkflow.clear();
	});

	// ----------------------------------
	// Render
	return (
		<Show when={workflowConfig()}>
			<section>
				<div class="flex items-center gap-2 mb-3">
					<FaSolidChartDiagram class="text-body" size={14} />
					<h3 class="text-base font-medium text-title">{T()("workflow")}</h3>
				</div>
				<div class="relative space-y-3">
					<Show when={updatePending()}>
						<div class="absolute inset-0 z-10 rounded-md bg-card-base/60 animate-pulse" />
					</Show>
					<Select
						id="document-workflow-stage"
						name="document-workflow-stage"
						value={stage()}
						onChange={handleStageChange}
						options={stageOptions()}
						copy={{ label: T()("stage") }}
						noClear={true}
						disabled={fieldsDisabled()}
						hideOptionalText={true}
						renderValue={(props) => (
							<WorkflowStageOption
								label={props.option.label}
								color={getWorkflowStageColor(props.option.value)}
							/>
						)}
						renderOption={(props) => (
							<WorkflowStageOption
								label={props.option.label}
								color={getWorkflowStageColor(props.option.value)}
							/>
						)}
					/>
					<SelectMultiple
						id="document-workflow-assignees"
						name="document-workflow-assignees"
						values={assignees()}
						onChange={handleAssigneesChange}
						options={assigneeOptions()}
						copy={{ label: T()("workflow_assignees") }}
						disabled={fieldsDisabled()}
						hideOptionalText={true}
						triggerClasses="items-start gap-2 p-2"
						selectedValuesContainerClasses="gap-0"
						selectedValueClasses="group w-full rounded-none first:rounded-t-md last:rounded-b-md border-x border-t last:border-b border-border bg-background-base hover:bg-card-hover text-title px-2 py-1.5"
						renderValue={(props) => (
							<WorkflowAssigneeOption
								user={props.value.user}
								label={props.value.label}
								removeValue={props.removeValue}
							/>
						)}
						renderOption={(props) => (
							<WorkflowAssigneeOption
								user={props.option.user}
								label={props.option.label}
							/>
						)}
					/>
				</div>
			</section>
		</Show>
	);
};
