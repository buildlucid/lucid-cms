import type { PublishOperation } from "../../types/response.js";
import type { PublishOperationDetailedQueryResponse } from "../repositories/document-publish-operations.js";
import formatter, { mediaFormatter } from "./index.js";
import type { MediaPosterPropsT } from "./media.js";

const formatUser = (params: {
	id: number | null | undefined;
	email?: string | null;
	username?: string | null;
	firstName?: string | null;
	lastName?: string | null;
	profilePicture?: MediaPosterPropsT[];
	host: string;
}): PublishOperation["requestedBy"] => {
	if (!params.id) return null;
	return {
		id: params.id,
		email: params.email ?? null,
		username: params.username ?? null,
		firstName: params.firstName ?? null,
		lastName: params.lastName ?? null,
		profilePicture: mediaFormatter.formatProfilePicture({
			poster: params.profilePicture?.[0],
			host: params.host,
		}),
	};
};

type FormatSingleProps = {
	operation: PublishOperationDetailedQueryResponse;
	documentLabel?: string | null;
	latestContentId?: string | null;
	permissions?: PublishOperation["permissions"];
	host: string;
};

const formatSingle = (props: FormatSingleProps): PublishOperation => ({
	id: props.operation.id,
	collectionKey: props.operation.collection_key,
	documentId: props.operation.document_id,
	documentLabel: props.documentLabel ?? null,
	target: props.operation.target,
	operationType: props.operation.operation_type,
	status: props.operation.status,
	executionStatus: props.operation.execution_status,
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
		profilePicture: props.operation.requested_by_profile_picture,
		host: props.host,
	}),
	requestComment: props.operation.request_comment,
	decidedBy: formatUser({
		id: props.operation.decided_by,
		email: props.operation.decided_by_email,
		username: props.operation.decided_by_username,
		firstName: props.operation.decided_by_first_name,
		lastName: props.operation.decided_by_last_name,
		profilePicture: props.operation.decided_by_profile_picture,
		host: props.host,
	}),
	decisionComment: props.operation.decision_comment,
	decidedAt: formatter.formatDate(props.operation.decided_at),
	scheduledAt: formatter.formatDate(props.operation.scheduled_at),
	scheduledTimezone: props.operation.scheduled_timezone,
	executedAt: formatter.formatDate(props.operation.executed_at),
	failedAt: formatter.formatDate(props.operation.failed_at),
	executionErrorMessage: props.operation.execution_error_message,
	executionErrorData: props.operation.execution_error_data,
	scheduledJobId: props.operation.scheduled_job_id,
	createdAt: formatter.formatDate(props.operation.created_at),
	updatedAt: formatter.formatDate(props.operation.updated_at),
	permissions: props.permissions ?? {
		review: false,
		cancel: false,
		reschedule: false,
		retry: false,
		updateReviewers: false,
	},
	assignees: (props.operation.assignees ?? []).map((assignee) => ({
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
