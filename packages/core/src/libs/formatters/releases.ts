import canEditDocument from "../../services/releases/helpers/can-edit-document.js";
import countOpenComments from "../../services/releases/helpers/count-open-comments.js";
import getTargetReview from "../../services/releases/helpers/get-target-review.js";
import type {
	ReleaseRecord,
	ReleaseState,
} from "../../services/releases/types.js";
import type { LucidUser } from "../../types/hono.js";
import type {
	Release,
	ReleaseBlocker,
	ReleaseDocument,
	ReleaseEvent,
	ReleasePermissions,
	ReleaseSummary,
	ReleaseUser,
} from "../../types/response.js";
import type { LucidReleaseEvents } from "../db/tables/index.js";
import type { Select } from "../db/types.js";
import type { ReleaseSummaryQueryResponse } from "../repositories/releases.js";
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
}): Map<number, ReleaseUser> =>
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
	event: Select<LucidReleaseEvents>;
	replies: Select<LucidReleaseEvents>[];
	users: Map<number, ReleaseUser>;
}): ReleaseEvent | null => {
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
				releaseDocumentId: metadata.releaseDocumentId ?? null,
				target: metadata.target ?? null,
			};
		}
		case "target_published": {
			if (
				metadata.releaseDocumentId === undefined ||
				metadata.target === undefined
			) {
				return null;
			}
			return {
				...base,
				type: "target_published",
				target: metadata.target,
				releaseDocumentId: metadata.releaseDocumentId,
				sourceReleaseId: metadata.sourceReleaseId ?? null,
			};
		}
		case "target_reviewed":
		case "target_unreviewed":
		case "target_added":
		case "target_removed": {
			if (
				metadata.releaseDocumentId === undefined ||
				metadata.target === undefined
			) {
				return null;
			}
			return {
				...base,
				type: props.event.type,
				target: metadata.target,
				releaseDocumentId: metadata.releaseDocumentId,
			};
		}
		case "workflow_updated": {
			if (
				metadata.releaseDocumentId === undefined ||
				metadata.stage === undefined
			) {
				return null;
			}
			return {
				...base,
				type: "workflow_updated",
				stage: metadata.stage,
				releaseDocumentId: metadata.releaseDocumentId,
			};
		}
		case "proposal_edited": {
			if (metadata.releaseDocumentId === undefined) return null;
			return {
				...base,
				type: "proposal_edited",
				releaseDocumentId: metadata.releaseDocumentId,
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
		case "released":
		case "closed":
		case "reopened":
			return { ...base, type: props.event.type };
	}
};

const formatSingle = (props: {
	release: ReleaseRecord;
	state: ReleaseState;
	blockers: ReleaseBlocker[];
	permissions: ReleasePermissions;
	user: LucidUser;
	users: Map<number, ReleaseUser>;
}): Release => {
	const userOrNull = (id: number | null) =>
		id === null ? null : (props.users.get(id) ?? null);
	const approved = props.release.approved_revision === props.release.revision;
	const repliesByParent = Map.groupBy(
		props.release.events.filter((event) => event.parent_id !== null),
		(event) => event.parent_id,
	);

	return {
		id: props.release.id,
		type: props.release.type,
		title: props.release.title,
		description: props.release.description,
		status: props.release.status,
		approved,
		revision: props.release.revision,
		executionJobId: props.release.execution_job_id,
		createdBy: userOrNull(props.release.created_by),
		approvedBy: userOrNull(props.release.approved_by),
		approvedAt: formatter.formatDate(props.release.approved_at),
		scheduledAt: formatter.formatDate(props.release.scheduled_at),
		scheduledTimezone: props.release.scheduled_timezone,
		failure: props.release.failure,
		failureReleaseDocumentId: props.release.failure_release_document_id,
		failureTarget: props.release.failure_target,
		releasedAt: formatter.formatDate(props.release.released_at),
		createdAt: formatter.formatDate(props.release.created_at),
		updatedAt: formatter.formatDate(props.release.updated_at),
		reviewers: props.release.reviewers.flatMap((reviewer) => {
			const user = props.users.get(reviewer.user_id);
			return user ? [user] : [];
		}),
		documents: props.release.documents.map((document): ReleaseDocument => {
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
							props.release.status === "open" &&
							state?.release?.contentId !== current?.contentId,
						...getTargetReview({
							target,
							releaseDocumentId: document.id,
							events: props.release.events,
							currentVersionId: current?.id ?? null,
						}),
						reviewedBy: userOrNull(target.reviewed_by),
						reviewedAt: formatter.formatDate(target.reviewed_at),
					};
				}),
				blockers: props.blockers.filter(
					(blocker) => blocker.releaseDocumentId === document.id,
				),
				permissions: {
					edit: canEditDocument({
						release: props.release,
						collectionKey: document.collection_key,
						user: props.user,
					}),
				},
			};
		}),
		events: props.release.events.flatMap((event) => {
			if (event.parent_id !== null) return [];
			const formatted = formatEvent({
				event,
				replies: repliesByParent.get(event.id) ?? [],
				users: props.users,
			});
			return formatted ? [formatted] : [];
		}),
		blockers: props.blockers,
		openComments: countOpenComments({ events: props.release.events }),
		permissions: props.permissions,
	};
};

const formatSummary = (props: {
	release: ReleaseSummaryQueryResponse;
	permissions: ReleasePermissions;
	users: Map<number, ReleaseUser>;
}): ReleaseSummary => ({
	id: props.release.id,
	type: props.release.type,
	title: props.release.title,
	status: props.release.status,
	approved: props.release.approved_revision === props.release.revision,
	createdBy:
		props.release.created_by === null
			? null
			: (props.users.get(props.release.created_by) ?? null),
	reviewers: props.release.reviewers.flatMap((reviewer) => {
		const user = props.users.get(reviewer.user_id);
		return user ? [user] : [];
	}),
	scheduledAt: formatter.formatDate(props.release.scheduled_at),
	scheduledTimezone: props.release.scheduled_timezone,
	failure: props.release.failure,
	releasedAt: formatter.formatDate(props.release.released_at),
	createdAt: formatter.formatDate(props.release.created_at),
	updatedAt: formatter.formatDate(props.release.updated_at),
	documents: props.release.documents.map((document) => ({
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
