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
export const referenceKey = (reference: AgentReferenceInput) => {
	switch (reference.type) {
		case "media":
			return `media:${reference.mediaId}`;
		case "document":
			return `document:${reference.collectionKey}:${reference.documentId}:${reference.versionId ?? "latest"}`;
		case "request":
			return `request:${reference.requestId}`;
	}
};

/** Returns read permissions for a reference, including every collection in a request. */
export const referenceReadPermissions = (
	reference: AgentReferenceInput,
	requestCollections: readonly string[] = [],
) => {
	switch (reference.type) {
		case "media":
			return [Permissions.MediaRead];
		case "document":
			return [getCollectionPermission(reference.collectionKey, "read")];
		case "request":
			return [
				Permissions.RequestsRead,
				...requestCollections.map((key) =>
					getCollectionPermission(key, "read"),
				),
			];
	}
};

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
	/** The request's collections, for request references. */
	requestCollections?: readonly string[];
	userId: number | null;
	grant?: PermissionGrant;
}) => {
	if (props.reference.type === "media" && props.ownership) {
		if (props.ownership.type === "system") return false;
		if (props.ownership.type === "user") {
			return props.ownership.userId === props.userId;
		}
	}

	const { grant } = props;
	return (
		grant === undefined ||
		referenceReadPermissions(props.reference, props.requestCollections).every(
			(permission) => hasPermission(grant, permission),
		)
	);
};
