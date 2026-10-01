import type {
	AgentReferenceInput,
	MediaOwnership,
} from "../../types/response.js";
import { getCollectionPermission } from "../permission/collection-permissions.js";
import { Permissions } from "../permission/definitions.js";
import hasPermission, {
	type PermissionGrant,
} from "../permission/has-permission.js";

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

/**
 * Whether a principal can link or read a resource in a chat. Personal media is
 * only ever available to its owner, even with `media:read-all`, and system media
 * never is. Without a grant the principal is the system, which reads every other
 * resource.
 */
export const canReadReference = (props: {
	reference: AgentReferenceInput;
	/** The media's ownership. Missing ownership is treated as library media. */
	ownership?: MediaOwnership;
	userId: number | null;
	grant?: PermissionGrant;
}) => {
	if (props.reference.type === "media" && props.ownership) {
		if (props.ownership.type === "system") return false;
		if (props.ownership.type === "user") {
			return props.ownership.userId === props.userId;
		}
	}

	return (
		props.grant === undefined ||
		hasPermission(props.grant, referenceReadPermission(props.reference))
	);
};
