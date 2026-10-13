import type { AgentActor } from "../agent/types.js";
import type { RichTextJSON } from "../documents/types.js";
import type { JobStatus } from "../jobs/types.js";
import type { UserDisplay } from "../users/types.js";

/** Identifies a durable request attempt accepted by Lucid. */
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

/** Create requests prepare one document; publish and unpublish requests add or remove environment content, while delete requests bin existing documents. */
export type RequestType = "create" | "publish" | "unpublish" | "delete";

/** A document to include in a new or existing request. */
export type RequestDocumentInput = {
	collectionKey: string;
	documentId: number;
	/** Fixed publish-request source, either latest or a configured environment. */
	source?: string;
	/** Publish environments or latest for a latest source, unpublish environments, or no targets for delete requests. */
	targets?: string[];
};

export type RequestTarget = {
	target: string;
	/** The version currently on the target. Null when the target has no content. */
	versionId: number | null;
	/** Whether someone else changed what the target holds after the request was created. */
	changedSinceCreation: boolean;
	/** Whether the target's current version has been acknowledged. */
	acknowledged: boolean;
	acknowledgedBy: UserDisplay | null;
	/** The agent that acknowledged it, for acknowledgedBy or the system. */
	acknowledgedByAgent: AgentActor | null;
	acknowledgedAt: string | null;
	/** Whether completing would change what the target holds. */
	changed: boolean;
};

export type RequestBlockerCode =
	| "collection_unavailable"
	| "migration_required"
	| "collection_locked"
	| "document_deleted"
	| "document_permanently_deleted"
	| "source_missing"
	| "no_targets"
	| "target_unavailable"
	| "workflow"
	| "prerequisite"
	| "acknowledge_required"
	| "target_changed"
	| "scheduling_unavailable"
	| "comments_open"
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
	/** The person who acted, or the person an agent acted for. */
	actor: UserDisplay | null;
	/** The agent that acted, for actor or for the system when actor is null. */
	actorAgent: AgentActor | null;
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
				resolvedBy: UserDisplay | null;
				resolvedByAgent: AgentActor | null;
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
				type: "target_published" | "target_unpublished";
				requestDocumentId: number;
				target: string;
				/** The request that made the change. Null for a direct change. */
				sourceRequestId: number | null;
		  }
		| {
				type:
					| "target_acknowledged"
					| "target_unacknowledged"
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
				reviewer: UserDisplay | null;
		  }
		| {
				/** Dismissed means changes reset approval; withdrawn means the approver took theirs back. */
				type:
					| "approval_dismissed"
					| "approval_withdrawn"
					| "completed"
					| "closed"
					| "reopened";
		  }
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
	complete: boolean;
	/** Reopen a closed request. */
	reopen: boolean;
};

export type RequestDetails = {
	id: number;
	type: RequestType;
	title: string;
	description: RichTextJSON | null;
	status: RequestStatus;
	approved: boolean;
	revision: number;
	/** The current request attempt, retained until the request plan changes. */
	executionJobId: string | null;
	createdBy: UserDisplay | null;
	/** The agent that opened it, for createdBy or the system. */
	createdByAgent: AgentActor | null;
	/** Approvals of the current revision. */
	approvals: RequestApproval[];
	/** Approvals the request needs, the highest its collections ask for. */
	requiredApprovals: number;
	scheduledAt: string | null;
	scheduledTimezone: string | null;
	/** Why the last request attempt failed. Cleared on the next attempt. */
	failure: RequestFailure | null;
	completedAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	reviewers: UserDisplay[];
	documents: RequestDocument[];
	events: RequestEvent[];
	blockers: RequestBlocker[];
	/** Comments still waiting to be resolved or closed. These stop approval. */
	openComments: number;
	/** Fingerprints the revision, content and targets as read. Acknowledgements and approvals made with it are rejected once any of them change. */
	reviewToken: string;
	permissions: RequestPermissions;
};

/** Why a request attempt failed, and where. */
export type RequestFailure = {
	message: string;
	/** The RequestDocument.id whose request attempt failed. */
	requestDocumentId: number | null;
	target: string | null;
};

export type RequestApproval = {
	user: UserDisplay | null;
	approvedAt: string | null;
};

export type RequestDocument = {
	id: number;
	collectionKey: string;
	documentId: number;
	documentLabel: string | null;
	/** In the bin, where it can be restored, or permanently deleted. */
	deleted: "bin" | "permanent" | null;
	/** Fixed starting source: latest for a proposal, or an environment for a snapshot. Null for unpublish and delete requests, which capture no content. */
	source: string | null;
	/** The request's own proposal, which can be edited, or its read-only snapshot. Proposals are removed once completed. */
	versionId: number | null;
	/** The content ID of `versionId`, used to check nothing changed before aligning it. */
	contentId: string | null;
	/** The frozen snapshot that will be, or was, published. Null until approved, and for unpublish and delete requests. */
	approvedVersionId: number | null;
	workflowStage: string | null;
	targets: RequestTarget[];
	blockers: RequestBlocker[];
	permissions: { edit: boolean };
};

export type RequestSummary = Pick<
	RequestDetails,
	| "id"
	| "type"
	| "title"
	| "status"
	| "approved"
	| "createdBy"
	| "createdByAgent"
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
