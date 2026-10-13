import type {
	RequestRecord,
	RequestState,
} from "../../services/requests/types.js";
import type {
	AgentActor,
	RequestBlocker,
	RequestDetails,
	RequestDocument,
	RequestEvent,
	RequestPermissions,
	RequestSummary,
	UserDisplay,
} from "../../types/response.js";
import type { LucidRequestEvents } from "../db/tables/index.js";
import type { Select } from "../db/types.js";
import type { RequestSummaryQueryResponse } from "../repositories/requests.js";
import formatter from "./helpers.js";

/**
 * Formats one activity entry. Entries missing the details their type needs
 * are left out. Comments carry their replies, which aren't entries themselves.
 */
const formatEvent = (props: {
	event: Select<LucidRequestEvents>;
	replies: Select<LucidRequestEvents>[];
	users: Map<number, UserDisplay>;
	agents: Map<string, AgentActor>;
}): RequestEvent | null => {
	const userOrNull = (id: number | null) =>
		id === null ? null : (props.users.get(id) ?? null);
	const agentOrNull = (runId: string | null) =>
		runId === null ? null : (props.agents.get(runId) ?? null);
	const base = {
		id: props.event.id,
		actor: userOrNull(props.event.user_id),
		actorAgent: agentOrNull(props.event.agent_run_id),
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
				resolvedByAgent: agentOrNull(props.event.resolved_by_run_id),
				replies: props.replies.flatMap((reply) =>
					reply.body
						? [
								{
									id: reply.id,
									actor: userOrNull(reply.user_id),
									actorAgent: agentOrNull(reply.agent_run_id),
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
		case "target_published":
		case "target_unpublished": {
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
				sourceRequestId: metadata.sourceRequestId ?? null,
			};
		}
		case "target_acknowledged":
		case "target_unacknowledged":
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
		case "approval_withdrawn":
		case "completed":
		case "closed":
		case "reopened":
			return { ...base, type: props.event.type };
	}
};

/** Formats request documents and activity with service-provided access, acknowledgements and review tokens. */
const formatSingle = (props: {
	request: RequestRecord;
	state: RequestState;
	blockers: RequestBlocker[];
	permissions: RequestPermissions;
	requiredApprovals: number;
	/** Request documents the viewer can edit. */
	editableDocumentIds: Set<number>;
	/** Each target's acknowledgement, by request target ID. */
	acknowledgements: Map<
		number,
		{ changedSinceCreation: boolean; acknowledged: boolean }
	>;
	openComments: number;
	reviewToken: string;
	users: Map<number, UserDisplay>;
	agents: Map<string, AgentActor>;
}): RequestDetails => {
	const userOrNull = (id: number | null) =>
		id === null ? null : (props.users.get(id) ?? null);
	const agentOrNull = (runId: string | null) =>
		runId === null ? null : (props.agents.get(runId) ?? null);
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
		createdByAgent: agentOrNull(props.request.created_by_run_id),
		approvals: props.request.approvals.map((approval) => ({
			user: userOrNull(approval.user_id),
			approvedAt: formatter.formatDate(approval.approved_at),
		})),
		requiredApprovals: props.requiredApprovals,
		scheduledAt: formatter.formatDate(props.request.scheduled_at),
		scheduledTimezone: props.request.scheduled_timezone,
		failure:
			props.request.failure === null
				? null
				: {
						message: props.request.failure,
						requestDocumentId: props.request.failure_request_document_id,
						target: props.request.failure_target,
					},
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
				deleted: state?.deleted ?? null,
				source: document.source,
				versionId: document.source_version_id,
				contentId: state?.source?.contentId ?? null,
				approvedVersionId: approved ? document.approved_version_id : null,
				workflowStage: state?.workflowStage ?? null,
				targets: document.targets.map((target) => {
					const current = state?.versions.get(target.target);
					const acknowledgement = props.acknowledgements.get(target.id);
					return {
						target: target.target,
						versionId: current?.id ?? null,
						changed:
							props.request.status === "open" &&
							state?.content?.contentId !== current?.contentId,
						changedSinceCreation:
							acknowledgement?.changedSinceCreation ?? false,
						acknowledged: acknowledgement?.acknowledged ?? false,
						acknowledgedBy: userOrNull(target.acknowledged_by),
						acknowledgedByAgent: agentOrNull(target.acknowledged_by_run_id),
						acknowledgedAt: formatter.formatDate(target.acknowledged_at),
					};
				}),
				blockers: props.blockers.filter(
					(blocker) => blocker.requestDocumentId === document.id,
				),
				permissions: {
					edit: props.editableDocumentIds.has(document.id),
				},
			};
		}),
		events: props.request.events.flatMap((event) => {
			if (event.parent_id !== null) return [];
			const formatted = formatEvent({
				event,
				replies: repliesByParent.get(event.id) ?? [],
				users: props.users,
				agents: props.agents,
			});
			return formatted ? [formatted] : [];
		}),
		blockers: props.blockers,
		openComments: props.openComments,
		reviewToken: props.reviewToken,
		permissions: props.permissions,
	};
};

const formatSummary = (props: {
	request: RequestSummaryQueryResponse;
	permissions: RequestPermissions;
	users: Map<number, UserDisplay>;
	agents: Map<string, AgentActor>;
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
	createdByAgent:
		props.request.created_by_run_id === null
			? null
			: (props.agents.get(props.request.created_by_run_id) ?? null),
	reviewers: props.request.reviewers.flatMap((reviewer) => {
		const user = props.users.get(reviewer.user_id);
		return user ? [user] : [];
	}),
	scheduledAt: formatter.formatDate(props.request.scheduled_at),
	scheduledTimezone: props.request.scheduled_timezone,
	failure:
		props.request.failure === null
			? null
			: {
					message: props.request.failure,
					requestDocumentId: props.request.failure_request_document_id,
					target: props.request.failure_target,
				},
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
	formatEvent,
	formatSingle,
	formatSummary,
};
