import type {
	DocumentWorkflow,
	DocumentWorkflowAssignee,
} from "@lucidcms/types";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type { DocumentWorkflowDetailedQueryResponse } from "../repositories/document-workflows.js";
import formatter, { mediaFormatter } from "./index.js";
import type { MediaPosterPropsT } from "./media.js";

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
	collection: CollectionBuilder;
	stageKey?: string | null;
}) => {
	const workflow = props.collection.getData.workflow;
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
	collection: CollectionBuilder;
	host: string;
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
				user: {
					id: assignee.user_id,
					email: assignee.email ?? null,
					username: assignee.username ?? null,
					firstName: assignee.first_name ?? null,
					lastName: assignee.last_name ?? null,
					profilePicture: mediaFormatter.formatProfilePicture({
						poster: assignee.profile_picture?.[0],
						host: props.host,
					}),
				},
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
	collection: CollectionBuilder;
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

const formatAssigneeUsers = (props: {
	users: Array<{
		id: number;
		email: string | null;
		username: string | null;
		firstName: string | null;
		lastName: string | null;
		profile_picture?: MediaPosterPropsT[];
	}>;
	host: string;
}): Array<DocumentWorkflowAssignee["user"]> =>
	props.users.map((user) => ({
		id: user.id,
		email: user.email,
		username: user.username,
		firstName: user.firstName,
		lastName: user.lastName,
		profilePicture: mediaFormatter.formatProfilePicture({
			poster: user.profile_picture?.[0],
			host: props.host,
		}),
	}));

export default {
	formatAssigneeUsers,
	formatSingle,
	formatSummary,
	getEffectiveStage,
};
