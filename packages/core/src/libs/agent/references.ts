import z from "zod";
import type {
	AgentReferenceInput,
	AgentReferenceSource,
	MediaOwnership,
} from "../../types/response.js";
import { getCollectionPermission } from "../permission/collection-permissions.js";
import { Permissions } from "../permission/definitions.js";
import { getDeployPermission } from "../permission/deploy-permissions.js";
import hasPermission, {
	type PermissionGrant,
} from "../permission/has-permission.js";

/** Whether a person attached a resource to a message or a tool linked it, as stored on reference rows. */
export const agentReferenceSourceTypeSchema = z.enum([
	"message",
	"tool",
]) satisfies z.ZodType<AgentReferenceSource["type"]>;

/** Identifies a linked resource, including a pinned document version. */
export const referenceKey = (reference: AgentReferenceInput) => {
	switch (reference.type) {
		case "media":
			return `media:${reference.mediaId}`;
		case "document":
			return `document:${reference.collectionKey}:${reference.documentId}:${reference.versionId ?? "latest"}`;
		case "request":
			return `request:${reference.requestId}`;
		case "deploy":
			return `deploy:${reference.deployKey}`;
	}
};

/** Identifies an attachment: its resource, and the brick or field of a document it points at, if any. */
export const attachmentKey = (reference: AgentReferenceInput) =>
	reference.type === "document" && reference.focus
		? `${referenceKey(reference)}#${reference.focus.brick ?? ""}/${reference.focus.path.join("/")}`
		: referenceKey(reference);

/** Returns read permissions for a reference, including every collection in a request. */
const referenceReadPermissions = (
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
		case "deploy":
			return [getDeployPermission(reference.deployKey, "read")];
	}
};

/**
 * Checks chat reference access. Personal media remains owner-only; system media is excluded.
 * Without a grant, system access applies to other resources.
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
