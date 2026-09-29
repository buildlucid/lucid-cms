import type { AgentReferenceInput } from "../../types/response.js";
import { copy } from "../i18n/index.js";
import { getCollectionPermission } from "../permission/collection-permissions.js";
import { Permissions } from "../permission/definitions.js";

/** Identifies a linked resource, including a pinned document version. */
export const referenceKey = (reference: AgentReferenceInput) =>
	reference.type === "media"
		? `media:${reference.mediaId}`
		: `document:${reference.collectionKey}:${reference.documentId}:${reference.versionId ?? "latest"}`;

/** The permission needed to read a referenced resource. */
export const referenceReadPermission = (reference: AgentReferenceInput) =>
	reference.type === "media"
		? Permissions.MediaRead
		: getCollectionPermission(reference.collectionKey, "read");

/** The error for a referenced resource that no longer exists. */
export const referenceNotFoundError = (reference: AgentReferenceInput) => ({
	type: "basic" as const,
	status: 404,
	message:
		reference.type === "media"
			? copy("server:core.media.not.found.message")
			: copy("server:core.documents.not.found.message"),
});
