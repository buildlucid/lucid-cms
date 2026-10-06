import type CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import type {
	LucidRequestApprovals,
	LucidRequestDocuments,
	LucidRequestEvents,
	LucidRequestReviewers,
	LucidRequests,
	LucidRequestTargets,
} from "../../libs/db/tables/index.js";
import type { Select } from "../../libs/db/types.js";

/** Documents share approval, scheduling and activity within a request. */
export type RequestRecord = Select<LucidRequests> & {
	documents: RequestDocumentRecord[];
	reviewers: Select<LucidRequestReviewers>[];
	/** Approvals of the current revision. */
	approvals: Select<LucidRequestApprovals>[];
	events: Select<LucidRequestEvents>[];
};

export type RequestDocumentRecord = Select<LucidRequestDocuments> & {
	targets: Select<LucidRequestTargets>[];
};

export type RequestVersionState = { id: number; contentId: string };

/** Current document state used to validate and present a request. */
export type RequestDocumentState = {
	collection: CollectionBuilder | null;
	migrationRequired: boolean;
	deleted: boolean;
	label: string | null;
	/** Null when no stage gates the document, eg. snapshots. */
	workflowStage: string | null;
	versions: Map<string, RequestVersionState>;
	/** The proposal or snapshot captured when the request was created. */
	source: RequestVersionState | null;
	/** The approved snapshot, or captured content before approval. */
	request: RequestVersionState | null;
};

export type RequestState = Map<number, RequestDocumentState>;
