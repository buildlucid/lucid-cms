import type { RichTextJSON } from "../documents/types.js";
import type { JobStatus } from "../jobs/types.js";
import type { ProfilePicture } from "../media/types.js";

/** Identifies a durable publication attempt accepted by Lucid. */
export type RequestExecutionReceipt = { jobId: string };

/** Small polling response; null when the attempt was invalidated or retained job history expired. */
export type RequestExecution = {
	jobId: string;
	status: JobStatus;
	runAt: string | null;
	error: string | null;
};

/** Open requests can still change. Completed and closed requests are read only. */
export type RequestStatus = "open" | "completed" | "closed";

/** Publish requests move existing documents to environments. Create requests request one new document, which only exists once completed. */
export type RequestType = "publish" | "create";

export type RequestUser = {
	id: number;
	email: string | null;
	username: string | null;
	firstName: string | null;
	lastName: string | null;
	profilePicture: ProfilePicture | null;
};

/** An environment explicitly selected for publication. */
export type RequestTarget = {
	target: string;
	/** The version currently on the target. Null when nothing has been published there. */
	versionId: number | null;
	/** Whether someone else published to the target after the request was created. */
	changedSinceCreation: boolean;
	/** Whether the target's current version has been acknowledged. */
	reviewed: boolean;
	reviewedBy: RequestUser | null;
	reviewedAt: string | null;
	/** Whether completing would change what the target holds. */
	changed: boolean;
};

export type RequestBlockerCode =
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

/** Something that stops a request from being approved or completed. */
export type RequestBlocker = {
	code: RequestBlockerCode;
	requestDocumentId?: number;
	target?: string;
	/** The target that must be completed first, for prerequisite blockers. */
	required?: string;
	/** Explains a blocker reported by a request check hook. */
	message?: string;
};

type RequestEventBase = {
	id: number;
	user: RequestUser | null;
	createdAt: string | null;
	updatedAt: string | null;
};

export type RequestEvent = RequestEventBase &
	(
		| {
				type: "comment";
				body: RichTextJSON;
				/** How the comment was dealt with. Null while it is open. */
				resolution: RequestCommentResolution | null;
				resolvedBy: RequestUser | null;
				/** Oldest first. */
				replies: RequestCommentReply[];
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
				requestDocumentId: number | null;
				target: string | null;
		  }
		| {
				type: "target_published";
				requestDocumentId: number;
				target: string;
				/** The request that published it. Null for a direct publish. */
				sourceRequestId: number | null;
		  }
		| {
				type:
					| "target_reviewed"
					| "target_unreviewed"
					| "target_added"
					| "target_removed";
				requestDocumentId: number;
				target: string;
		  }
		| { type: "workflow_updated"; requestDocumentId: number; stage: string }
		| { type: "proposal_edited"; requestDocumentId: number }
		| {
				type: "document_added" | "document_removed";
				collectionKey: string;
				documentId: number;
		  }
		| {
				type: "reviewer_added" | "reviewer_removed";
				/** Null once the user is deleted. */
				reviewer: RequestUser | null;
		  }
		| { type: "approval_dismissed" | "completed" | "closed" | "reopened" }
	);

export type RequestEventType = RequestEvent["type"];

export type RequestCommentResolution = "resolved" | "closed";

/** A reply in a comment's thread. Replies don't change the request or need resolving. */
export type RequestCommentReply = RequestEventBase & { body: RichTextJSON };

export type RequestPermissions = {
	/** Edit proposal content, title, targets and reviewers. */
	edit: boolean;
	/** Approve, or withdraw an approval. */
	approve: boolean;
	/** Complete now, or set a schedule. */
	request: boolean;
	/** Reopen a closed request. */
	reopen: boolean;
};

export type RequestDetail = {
	id: number;
	type: RequestType;
	title: string;
	description: RichTextJSON | null;
	status: RequestStatus;
	approved: boolean;
	revision: number;
	/** The current publication attempt, retained until the request plan changes. */
	executionJobId: string | null;
	createdBy: RequestUser | null;
	approvedBy: RequestUser | null;
	approvedAt: string | null;
	scheduledAt: string | null;
	scheduledTimezone: string | null;
	/** Why the last request attempt failed. Cleared on the next attempt. */
	failure: string | null;
	/** The RequestDocument.id whose publication failed. */
	failureRequestDocumentId: number | null;
	failureTarget: string | null;
	completedAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	reviewers: RequestUser[];
	documents: RequestDocument[];
	events: RequestEvent[];
	blockers: RequestBlocker[];
	/** Comments still waiting to be resolved or closed. These stop approval. */
	openComments: number;
	permissions: RequestPermissions;
};

/** Each document has independent captured content, destinations and checks. */
export type RequestDocument = {
	id: number;
	collectionKey: string;
	documentId: number;
	documentLabel: string | null;
	/** Fixed starting source: latest for a proposal, or an environment for a snapshot. */
	source: string;
	/** The request's own proposal, which can be edited, or its read-only snapshot. Proposals are removed once completed. */
	versionId: number | null;
	/** The content ID of `versionId`, used to check nothing changed before aligning it. */
	contentId: string | null;
	/** The frozen snapshot that will be, or was, published. Null until approved. */
	approvedVersionId: number | null;
	workflowStage: string | null;
	targets: RequestTarget[];
	blockers: RequestBlocker[];
	permissions: { edit: boolean };
};

export type RequestSummary = Pick<
	RequestDetail,
	| "id"
	| "type"
	| "title"
	| "status"
	| "approved"
	| "createdBy"
	| "reviewers"
	| "scheduledAt"
	| "scheduledTimezone"
	| "failure"
	| "completedAt"
	| "createdAt"
	| "updatedAt"
	| "permissions"
> & {
	documents: Array<
		Pick<
			RequestDocument,
			"id" | "collectionKey" | "documentId" | "source" | "versionId"
		> & {
			targets: string[];
		}
	>;
};

/** Open requests of one type, by state. */
export type RequestOverviewCounts = {
	awaitingApproval: number;
	approved: number;
	scheduled: number;
	failed: number;
	assignedToMe: number;
};

export type RequestOverview = Record<RequestType, RequestOverviewCounts>;
