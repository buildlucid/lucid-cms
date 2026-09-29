import type { AgentReferenceInput } from "../../types/response.js";

/** Identifies a linked resource, including a pinned document version. */
export const referenceKey = (reference: AgentReferenceInput) =>
	reference.type === "media"
		? `media:${reference.mediaId}`
		: `document:${reference.collectionKey}:${reference.documentId}:${reference.versionId ?? "latest"}`;
