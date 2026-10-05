import type CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import type {
	LucidReleaseDocuments,
	LucidReleaseEvents,
	LucidReleaseReviewers,
	LucidReleases,
	LucidReleaseTargets,
} from "../../libs/db/tables/index.js";
import type { Select } from "../../libs/db/types.js";

/** Documents share approval, scheduling and activity within a release. */
export type ReleaseRecord = Select<LucidReleases> & {
	documents: ReleaseDocumentRecord[];
	reviewers: Select<LucidReleaseReviewers>[];
	events: Select<LucidReleaseEvents>[];
};

export type ReleaseDocumentRecord = Select<LucidReleaseDocuments> & {
	targets: Select<LucidReleaseTargets>[];
};

export type ReleaseVersionState = { id: number; contentId: string };

/** Current document state used to validate and present a release. */
export type ReleaseDocumentState = {
	collection: CollectionBuilder | null;
	migrationRequired: boolean;
	deleted: boolean;
	label: string | null;
	workflowStage: string | null;
	versions: Map<string, ReleaseVersionState>;
	/** The proposal or snapshot captured when the release was created. */
	source: ReleaseVersionState | null;
	/** The approved snapshot, or captured content before approval. */
	release: ReleaseVersionState | null;
};

export type ReleaseState = Map<number, ReleaseDocumentState>;
