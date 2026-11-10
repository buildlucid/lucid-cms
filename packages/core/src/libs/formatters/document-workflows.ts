import type { DocumentWorkflow } from "@lucidcms/types";
import type CollectionDefinition from "../collection/definitions/collection/index.js";
import type { DocumentWorkflowDetailedQueryResponse } from "../repositories/document-workflows.js";
import formatter from "./helpers.js";
import type { MediaFormatterOptions } from "./media.js";

type DocumentWorkflowFormatInput = {
	id?: number | null;
	collection_key?: string | null;
	document_id?: number | null;
	stage_key?: string | null;
	created_by?: number | null;
	created_at?: string | Date | null;
	updated_by?: number | null;
	updated_at?: string | Date | null;
	assignees?: DocumentWorkflowDetailedQueryResponse["assignees"];
};

const getEffectiveStage = (props: {
	collection: CollectionDefinition;
	stageKey?: string | null;
}) => {
	const workflow = props.collection.getData.publishing.workflow;
	if (!workflow) return null;

	if (
		props.stageKey &&
		workflow.stages.some((stage) => stage.key === props.stageKey)
	) {
		return props.stageKey;
	}

	return workflow.initial;
};

const formatSingle = (props: {
	workflow?: DocumentWorkflowFormatInput | null;
	collection: CollectionDefinition;
	mediaOptions: MediaFormatterOptions;
}): DocumentWorkflow | null => {
	const stage = getEffectiveStage({
		collection: props.collection,
		stageKey: props.workflow?.stage_key,
	});
	if (!stage) return null;

	return {
		stage,
		assignees:
			props.workflow?.assignees?.map((assignee) => ({
				id: assignee.id,
				userId: assignee.user_id,
				assignedBy: assignee.assigned_by,
				assignedAt: formatter.formatDate(assignee.assigned_at),
			})) ?? [],
		createdAt: formatter.formatDate(props.workflow?.created_at),
		updatedAt: formatter.formatDate(props.workflow?.updated_at),
		updatedBy: props.workflow?.updated_by ?? null,
	};
};

const formatSummary = (props: {
	stageKey?: string | null;
	collection: CollectionDefinition;
}): DocumentWorkflow | null => {
	const stage = getEffectiveStage({
		collection: props.collection,
		stageKey: props.stageKey,
	});
	if (!stage) return null;

	return {
		stage,
		assignees: [],
		createdAt: null,
		updatedAt: null,
		updatedBy: null,
	};
};

export default {
	formatSingle,
	formatSummary,
	getEffectiveStage,
};
