import type { RichTextJSON } from "../documents/types.js";
import type { JobStatus } from "../jobs/types.js";
import type { ProfilePicture } from "../media/types.js";

/** Identifies a durable publication attempt accepted by Lucid. */
export type ReleaseExecutionReceipt = { jobId: string };

/** Small polling response; null when the attempt was invalidated or retained job history expired. */
export type ReleaseExecution = {
	jobId: string;
	status: JobStatus;
	runAt: string | null;
	error: string | null;
};

/** Open releases can still change. Released and closed releases are read only. */
export type ReleaseStatus = "open" | "released" | "closed";

export type ReleaseUser = {
	id: number;
	email: string | null;
	username: string | null;
	firstName: string | null;
	lastName: string | null;
	profilePicture: ProfilePicture | null;
};

/** An environment explicitly selected for publication. */
export type ReleaseTarget = {
	target: string;
	/** The version currently on the target. Null when nothing has been published there. */
	versionId: number | null;
	/** Whether someone else published to the target after the release was created. */
	changedSinceCreation: boolean;
	/** Whether the target's current version has been acknowledged. */
	reviewed: boolean;
	reviewedBy: ReleaseUser | null;
	reviewedAt: string | null;
	/** Whether releasing would change what the target holds. */
	changed: boolean;
};

export type ReleaseBlockerCode =
	| "collection_unavailable"
	| "migration_required"
	| "collection_locked"
	| "document_deleted"
	| "source_missing"
	| "no_targets"
	| "target_unavailable"
	| "workflow"
	| "prerequisite"
	| "review_required"
	| "target_changed"
	| "scheduling_unavailable"
	| "check";

/** Something that stops a release from being approved or released. */
export type ReleaseBlocker = {
	code: ReleaseBlockerCode;
	releaseDocumentId?: number;
	target?: string;
	/** The target that must be released first, for prerequisite blockers. */
	required?: string;
	/** Explains a blocker reported by a release check hook. */
	message?: string;
};

type ReleaseEventBase = {
	id: number;
	user: ReleaseUser | null;
	createdAt: string | null;
	updatedAt: string | null;
};

export type ReleaseEvent = ReleaseEventBase &
	(
		| {
				type: "comment";
				body: RichTextJSON;
				/** How the comment was dealt with. Null while it is open. */
				resolution: ReleaseCommentResolution | null;
				resolvedBy: ReleaseUser | null;
		  }
		| { type: "approved"; body: RichTextJSON | null }
		| {
				type: "schedule_updated";
				scheduledAt: string | null;
				scheduledTimezone: string | null;
		  }
		| {
				type: "failed";
				message: string;
				releaseDocumentId: number | null;
				target: string | null;
		  }
		| {
				type: "target_published";
				releaseDocumentId: number;
				target: string;
				/** The release that published it. Null for a direct publish. */
				sourceReleaseId: number | null;
		  }
		| {
				type:
					| "target_reviewed"
					| "target_unreviewed"
					| "target_added"
					| "target_removed";
				releaseDocumentId: number;
				target: string;
		  }
		| { type: "workflow_updated"; releaseDocumentId: number; stage: string }
		| { type: "proposal_edited"; releaseDocumentId: number }
		| {
				type: "document_added" | "document_removed";
				collectionKey: string;
				documentId: number;
		  }
		| {
				type: "reviewer_added" | "reviewer_removed";
				/** Null once the user is deleted. */
				reviewer: ReleaseUser | null;
		  }
		| { type: "approval_dismissed" | "released" | "closed" | "reopened" }
	);

export type ReleaseEventType = ReleaseEvent["type"];

export type ReleaseCommentResolution = "resolved" | "closed";

export type ReleasePermissions = {
	/** Edit proposal content, title, targets and reviewers. */
	edit: boolean;
	/** Approve, or withdraw an approval. */
	approve: boolean;
	/** Release now, or set a schedule. */
	release: boolean;
	/** Reopen a closed release. */
	reopen: boolean;
};

export type Release = {
	id: number;
	title: string;
	description: RichTextJSON | null;
	status: ReleaseStatus;
	approved: boolean;
	revision: number;
	/** The current publication attempt, retained until the release plan changes. */
	executionJobId: string | null;
	createdBy: ReleaseUser | null;
	approvedBy: ReleaseUser | null;
	approvedAt: string | null;
	scheduledAt: string | null;
	scheduledTimezone: string | null;
	/** Why the last release attempt failed. Cleared on the next attempt. */
	failure: string | null;
	/** The ReleaseDocument.id whose publication failed. */
	failureReleaseDocumentId: number | null;
	failureTarget: string | null;
	releasedAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	reviewers: ReleaseUser[];
	documents: ReleaseDocument[];
	events: ReleaseEvent[];
	blockers: ReleaseBlocker[];
	/** Comments from other people still waiting to be resolved or closed. */
	openComments: number;
	permissions: ReleasePermissions;
};

/** Each document has independent captured content, destinations and checks. */
export type ReleaseDocument = {
	id: number;
	collectionKey: string;
	documentId: number;
	documentLabel: string | null;
	/** Fixed starting source: latest for a proposal, or an environment for a snapshot. */
	source: string;
	/** The release's own proposal, which can be edited, or its read-only snapshot. Proposals are removed once released. */
	versionId: number | null;
	/** The content ID of `versionId`, used to check nothing changed before aligning it. */
	contentId: string | null;
	/** The frozen snapshot that will be, or was, published. Null until approved. */
	approvedVersionId: number | null;
	workflowStage: string | null;
	targets: ReleaseTarget[];
	blockers: ReleaseBlocker[];
	permissions: { edit: boolean };
};

export type ReleaseSummary = Pick<
	Release,
	| "id"
	| "title"
	| "status"
	| "approved"
	| "createdBy"
	| "reviewers"
	| "scheduledAt"
	| "scheduledTimezone"
	| "failure"
	| "releasedAt"
	| "createdAt"
	| "updatedAt"
	| "permissions"
> & {
	documents: Array<
		Pick<
			ReleaseDocument,
			"id" | "collectionKey" | "documentId" | "source" | "versionId"
		> & {
			targets: string[];
		}
	>;
};

export type ReleaseOverview = {
	awaitingApproval: number;
	approved: number;
	scheduled: number;
	failed: number;
	assignedToMe: number;
};
