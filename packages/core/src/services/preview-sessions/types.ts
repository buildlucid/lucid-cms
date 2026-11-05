import type {
	DocumentVersionType,
	LucidPreviewSessions,
} from "../../libs/db/tables/index.js";
import type { Select } from "../../libs/db/types.js";

export type PreviewSessionRecord = Pick<
	Select<LucidPreviewSessions>,
	| "id"
	| "entry_collection_key"
	| "entry_document_id"
	| "entry_version_type"
	| "mode"
	| "entry_version_id"
	| "expires_at"
	| "created_by"
>;

export type ResolvedPreviewSession = PreviewSessionRecord;

type PreviewSessionDocumentEntry = {
	/** Finds the session's unsaved draft for reads of its entry document. */
	sessionId: number;
	entry: {
		collectionKey: string;
		documentId: number;
	};
};

export type PreviewSessionPerspectiveTarget = PreviewSessionDocumentEntry & {
	mode: "navigable";
	versionType: DocumentVersionType;
	versionId?: number;
};

export type PreviewSessionScopedEntryTarget = PreviewSessionDocumentEntry & {
	mode: "scoped";
	target: "entry";
	entry: {
		collectionKey: string;
		documentId: number;
		versionType: DocumentVersionType;
		versionId?: number;
	};
};

export type PreviewSessionScopedAuxiliaryTarget =
	PreviewSessionDocumentEntry & {
		mode: "scoped";
		target: "auxiliary";
		versionType: DocumentVersionType;
		versionId?: number;
	};

export type PreviewSessionCollectionTarget =
	| PreviewSessionPerspectiveTarget
	| PreviewSessionScopedAuxiliaryTarget;

export type PreviewSessionDocumentTarget =
	| PreviewSessionCollectionTarget
	| PreviewSessionScopedEntryTarget;
