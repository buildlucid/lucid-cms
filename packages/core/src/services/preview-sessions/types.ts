import type {
	DocumentVersionType,
	LucidPreviewSessions,
	Select,
} from "../../libs/db/types.js";

export type PreviewSessionRecord = Pick<
	Select<LucidPreviewSessions>,
	| "id"
	| "entry_collection_key"
	| "entry_document_id"
	| "entry_version_type"
	| "mode"
	| "entry_version_id"
	| "expires_at"
>;

export type ResolvedPreviewSession = PreviewSessionRecord;

type PreviewSessionDocumentEntry = {
	entry: {
		collectionKey: string;
		documentId: number;
	};
};

export type PreviewSessionPerspectiveTarget = PreviewSessionDocumentEntry & {
	mode: "perspective";
	versionType: Exclude<DocumentVersionType, "revision">;
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
		versionType: Exclude<DocumentVersionType, "revision">;
	};

export type PreviewSessionCollectionTarget =
	| PreviewSessionPerspectiveTarget
	| PreviewSessionScopedAuxiliaryTarget;

export type PreviewSessionDocumentTarget =
	| PreviewSessionCollectionTarget
	| PreviewSessionScopedEntryTarget;
