import canEditDocument from "../../services/requests/helpers/can-edit-document.js";
import countOpenComments from "../../services/requests/helpers/count-open-comments.js";
import getTargetReview from "../../services/requests/helpers/get-target-review.js";
import type {
	RequestRecord,
	RequestState,
} from "../../services/requests/types.js";
import type { LucidUser } from "../../types/hono.js";
import type {
	RequestBlocker,
	RequestDetail,
	RequestDocument,
	RequestEvent,
	RequestPermissions,
	RequestSummary,
	RequestUser,
} from "../../types/response.js";
import type { LucidRequestEvents } from "../db/tables/index.js";
import type { Select } from "../db/types.js";
import type { RequestSummaryQueryResponse } from "../repositories/requests.js";
import formatter from "./helpers.js";
import type { MediaFormatterOptions, MediaPosterPropsT } from "./media.js";
import mediaFormatter from "./media.js";

type UserPropT = {
	id: number;
	email: string | null;
	username: string | null;
	first_name: string | null;
	last_name: string | null;
	profile_picture?: MediaPosterPropsT[];
};

const formatUsers = (props: {
	users: UserPropT[];
	mediaOptions: MediaFormatterOptions;
}): Map<number, RequestUser> =>
	new Map(
		props.users.map((user) => [
			user.id,
			{
				id: user.id,
				email: user.email,
				username: user.username,
				firstName: user.first_name,
				lastName: user.last_name,
				profilePicture: mediaFormatter.formatMediaImagePreview({
					poster: user.profile_picture?.[0],
					options: props.mediaOptions,
				}),
			},
		]),
	);

/**
 * Formats one activity entry. Entries missing the details their type needs
 * are left out. Comments carry their replies, which aren't entries themselves.
 */
const formatEvent = (props: {
	event: Select<LucidRequestEvents>;
	replies: Select<LucidRequestEvents>[];
	users: Map<number, RequestUser>;
}): RequestEvent | null => {
	const userOrNull = (id: number | null) =>
		id === null ? null : (props.users.get(id) ?? null);
	const base = {
		id: props.event.id,
		user: userOrNull(props.event.user_id),
		createdAt: formatter.formatDate(props.event.created_at),
		updatedAt: formatter.formatDate(props.event.updated_at),
	};
	const metadata = props.event.metadata ?? {};

	switch (props.event.type) {
		case "comment": {
			if (!props.event.body) return null;
			return {
				...base,
				type: "comment",
				body: props.event.body,
				resolution: props.event.resolution,
				resolvedBy: userOrNull(props.event.resolved_by),
				replies: props.replies.flatMap((reply) =>
					reply.body
						? [
								{
									id: reply.id,
									user: userOrNull(reply.user_id),
									body: reply.body,
									createdAt: formatter.formatDate(reply.created_at),
									updatedAt: formatter.formatDate(reply.updated_at),
								},
							]
						: [],
				),
			};
		}
		case "approved":
			return { ...base, type: "approved", body: props.event.body };
		case "schedule_updated":
			return {
				...base,
				type: "schedule_updated",
				scheduledAt: metadata.scheduledAt ?? null,
				scheduledTimezone: metadata.scheduledTimezone ?? null,
			};
		case "failed": {
			if (metadata.message === undefined) return null;
			return {
				...base,
				type: "failed",
				message: metadata.message,
				requestDocumentId: metadata.requestDocumentId ?? null,
				target: metadata.target ?? null,
			};
		}
		case "target_published": {
			if (
				metadata.requestDocumentId === undefined ||
				metadata.target === undefined
			) {
				return null;
			}
			return {
				...base,
				type: "target_published",
				target: metadata.target,
				requestDocumentId: metadata.requestDocumentId,
				sourceRequestId: metadata.sourceRequestId ?? null,
			};
		}
		case "target_reviewed":
		case "target_unreviewed":
		case "target_added":
		case "target_removed": {
			if (
				metadata.requestDocumentId === undefined ||
				metadata.target === undefined
			) {
				return null;
			}
			return {
				...base,
				type: props.event.type,
				target: metadata.target,
				requestDocumentId: metadata.requestDocumentId,
			};
		}
		case "workflow_updated": {
			if (
				metadata.requestDocumentId === undefined ||
				metadata.stage === undefined
			) {
				return null;
			}
			return {
				...base,
				type: "workflow_updated",
				stage: metadata.stage,
				requestDocumentId: metadata.requestDocumentId,
			};
		}
		case "proposal_edited": {
			if (metadata.requestDocumentId === undefined) return null;
			return {
				...base,
				type: "proposal_edited",
				requestDocumentId: metadata.requestDocumentId,
			};
		}
		case "document_added":
		case "document_removed": {
			if (
				metadata.collectionKey === undefined ||
				metadata.documentId === undefined
			) {
				return null;
			}
			return {
				...base,
				type: props.event.type,
				collectionKey: metadata.collectionKey,
				documentId: metadata.documentId,
			};
		}
		case "reviewer_added":
		case "reviewer_removed": {
			if (metadata.userId === undefined) return null;
			return {
				...base,
				type: props.event.type,
				reviewer: userOrNull(metadata.userId),
			};
		}
		case "approval_dismissed":
		case "completed":
		case "closed":
		case "reopened":
			return { ...base, type: props.event.type };
	}
};

const formatSingle = (props: {
	request: RequestRecord;
	state: RequestState;
	blockers: RequestBlocker[];
	permissions: RequestPermissions;
	requiredApprovals: number;
	user: LucidUser;
	users: Map<number, RequestUser>;
}): RequestDetail => {
	const userOrNull = (id: number | null) =>
		id === null ? null : (props.users.get(id) ?? null);
	const approved = props.request.approved_revision === props.request.revision;
	const repliesByParent = Map.groupBy(
		props.request.events.filter((event) => event.parent_id !== null),
		(event) => event.parent_id,
	);

	return {
		id: props.request.id,
		type: props.request.type,
		title: props.request.title,
		description: props.request.description,
		status: props.request.status,
		approved,
		revision: props.request.revision,
		executionJobId: props.request.execution_job_id,
		createdBy: userOrNull(props.request.created_by),
		approvals: props.request.approvals.map((approval) => ({
			user: userOrNull(approval.user_id),
			approvedAt: formatter.formatDate(approval.approved_at),
		})),
		requiredApprovals: props.requiredApprovals,
		scheduledAt: formatter.formatDate(props.request.scheduled_at),
		scheduledTimezone: props.request.scheduled_timezone,
		failure: props.request.failure,
		failureRequestDocumentId: props.request.failure_request_document_id,
		failureTarget: props.request.failure_target,
		completedAt: formatter.formatDate(props.request.completed_at),
		createdAt: formatter.formatDate(props.request.created_at),
		updatedAt: formatter.formatDate(props.request.updated_at),
		reviewers: props.request.reviewers.flatMap((reviewer) => {
			const user = props.users.get(reviewer.user_id);
			return user ? [user] : [];
		}),
		documents: props.request.documents.map((document): RequestDocument => {
			const state = props.state.get(document.id);
			return {
				id: document.id,
				collectionKey: document.collection_key,
				documentId: document.document_id,
				documentLabel: state?.label ?? null,
				source: document.source,
				versionId: document.source_version_id,
				contentId: state?.source?.contentId ?? null,
				approvedVersionId: approved ? document.approved_version_id : null,
				workflowStage: state?.workflowStage ?? null,
				targets: document.targets.map((target) => {
					const current = state?.versions.get(target.target);
					return {
						target: target.target,
						versionId: current?.id ?? null,
						changed:
							props.request.status === "open" &&
							state?.request?.contentId !== current?.contentId,
						...getTargetReview({
							target,
							requestDocumentId: document.id,
							events: props.request.events,
							currentVersionId: current?.id ?? null,
						}),
						reviewedBy: userOrNull(target.reviewed_by),
						reviewedAt: formatter.formatDate(target.reviewed_at),
					};
				}),
				blockers: props.blockers.filter(
					(blocker) => blocker.requestDocumentId === document.id,
				),
				permissions: {
					edit: canEditDocument({
						request: props.request,
						collectionKey: document.collection_key,
						user: props.user,
					}),
				},
			};
		}),
		events: props.request.events.flatMap((event) => {
			if (event.parent_id !== null) return [];
			const formatted = formatEvent({
				event,
				replies: repliesByParent.get(event.id) ?? [],
				users: props.users,
			});
			return formatted ? [formatted] : [];
		}),
		blockers: props.blockers,
		openComments: countOpenComments({ events: props.request.events }),
		permissions: props.permissions,
	};
};

const formatSummary = (props: {
	request: RequestSummaryQueryResponse;
	permissions: RequestPermissions;
	users: Map<number, RequestUser>;
}): RequestSummary => ({
	id: props.request.id,
	type: props.request.type,
	title: props.request.title,
	status: props.request.status,
	approved: props.request.approved_revision === props.request.revision,
	createdBy:
		props.request.created_by === null
			? null
			: (props.users.get(props.request.created_by) ?? null),
	reviewers: props.request.reviewers.flatMap((reviewer) => {
		const user = props.users.get(reviewer.user_id);
		return user ? [user] : [];
	}),
	scheduledAt: formatter.formatDate(props.request.scheduled_at),
	scheduledTimezone: props.request.scheduled_timezone,
	failure: props.request.failure,
	completedAt: formatter.formatDate(props.request.completed_at),
	createdAt: formatter.formatDate(props.request.created_at),
	updatedAt: formatter.formatDate(props.request.updated_at),
	documents: props.request.documents.map((document) => ({
		id: document.id,
		collectionKey: document.collection_key,
		documentId: document.document_id,
		source: document.source,
		versionId: document.source_version_id,
		targets: document.targets.map((target) => target.target),
	})),
	permissions: props.permissions,
});

export default {
	formatUsers,
	formatEvent,
	formatSingle,
	formatSummary,
};
