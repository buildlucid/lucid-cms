import type { PublishOperation } from "../../types/response.js";
import type { PublishOperationDetailedQueryResponse } from "../repositories/document-publish-operations.js";
import formatter from "./index.js";

const formatUser = (params: {
	id: number | null | undefined;
	email?: string | null;
	username?: string | null;
	firstName?: string | null;
	lastName?: string | null;
}): PublishOperation["requestedBy"] => {
	if (!params.id) return null;
	return {
		id: params.id,
		email: params.email ?? null,
		username: params.username ?? null,
		firstName: params.firstName ?? null,
		lastName: params.lastName ?? null,
	};
};

type FormatSingleProps = {
	operation: PublishOperationDetailedQueryResponse;
	latestContentId?: string | null;
	permissions?: PublishOperation["permissions"];
};

const formatSingle = (props: FormatSingleProps): PublishOperation => ({
	id: props.operation.id,
	collectionKey: props.operation.collection_key,
	documentId: props.operation.document_id,
	target: props.operation.target,
	operationType: props.operation.operation_type,
	status: props.operation.status,
	sourceVersionId: props.operation.source_version_id,
	sourceContentId: props.operation.source_content_id,
	snapshotVersionId: props.operation.snapshot_version_id,
	isOutdated:
		props.latestContentId !== undefined &&
		props.latestContentId !== null &&
		props.latestContentId !== props.operation.source_content_id,
	requestedBy: formatUser({
		id: props.operation.requested_by,
		email: props.operation.requested_by_email,
		username: props.operation.requested_by_username,
		firstName: props.operation.requested_by_first_name,
		lastName: props.operation.requested_by_last_name,
	}),
	requestComment: props.operation.request_comment,
	decidedBy: formatUser({
		id: props.operation.decided_by,
		email: props.operation.decided_by_email,
		username: props.operation.decided_by_username,
		firstName: props.operation.decided_by_first_name,
		lastName: props.operation.decided_by_last_name,
	}),
	decisionComment: props.operation.decision_comment,
	decidedAt: formatter.formatDate(props.operation.decided_at),
	createdAt: formatter.formatDate(props.operation.created_at),
	updatedAt: formatter.formatDate(props.operation.updated_at),
	permissions: props.permissions ?? {
		review: false,
	},
	assignees: (props.operation.assignees ?? []).map((assignee) => ({
		id: assignee.id,
		user: {
			id: assignee.user_id,
			email: assignee.email ?? null,
			username: assignee.username ?? null,
			firstName: assignee.first_name ?? null,
			lastName: assignee.last_name ?? null,
		},
		assignedBy: assignee.assigned_by,
		assignedAt: formatter.formatDate(assignee.assigned_at),
	})),
	events: (props.operation.events ?? []).map((event) => ({
		id: event.id,
		type: event.event_type,
		userId: event.user_id,
		comment: event.comment,
		metadata: event.metadata,
		createdAt: formatter.formatDate(event.created_at),
	})),
});

const formatMultiple = (props: {
	operations: FormatSingleProps[];
}): PublishOperation[] =>
	props.operations.map((operation) => formatSingle(operation));

export default {
	formatMultiple,
	formatSingle,
};
