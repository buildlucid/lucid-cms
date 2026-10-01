import type { BooleanInt } from "../../libs/db/types.js";
import formatter from "../../libs/formatters/helpers.js";
import { Permissions } from "../../libs/permission/definitions.js";
import hasAccess from "../../libs/permission/has-access.js";
import type { LucidUser } from "../../types/hono.js";
import type { MediaOwnership } from "../../types/response.js";

export type MediaActor =
	/** An admin user. User-owned media is personal to its owner, and `media:read-all` lets others view and delete it. */
	| { type: "user"; user: LucidUser }
	/** The content API and MCP clients, which only reach library media. */
	| { type: "content" }
	/** Trusted server code, such as profile pictures and the toolkit, which manages user-owned and system media itself. */
	| { type: "internal" };

export type MediaAction = "read" | "update" | "delete";

export type MediaListAccess =
	| { type: "all" }
	| { type: "owner"; userId: number }
	| { type: "library" };

type MediaOwnershipRow = {
	owner_user_id: number | null;
	is_system: BooleanInt;
};

export const getMediaOwnership = (media: MediaOwnershipRow): MediaOwnership => {
	if (media.owner_user_id !== null) {
		return { type: "user", userId: media.owner_user_id };
	}
	if (formatter.formatBoolean(media.is_system)) return { type: "system" };
	return { type: "library" };
};

const canReadAll = (user: LucidUser) =>
	hasAccess({ user, requiredPermissions: [Permissions.MediaReadAll] });

/**
 * Whether an actor can act on media given who it belongs to. Route permissions
 * still apply on top. Owners can do anything with their own media, holders of
 * `media:read-all` can view and delete everyone's, and system media is only
 * ever changed through the record that manages it.
 */
export const canAccessMedia = ({
	actor,
	ownership,
	action,
}: {
	actor: MediaActor;
	ownership: MediaOwnership;
	action: MediaAction;
}): boolean => {
	if (actor.type === "internal" || ownership.type === "library") return true;
	if (actor.type === "content") return false;
	if (ownership.type === "system") {
		return action === "read" && canReadAll(actor.user);
	}

	return (
		ownership.userId === actor.user.id ||
		(action !== "update" && canReadAll(actor.user))
	);
};

export const getMediaListAccess = (actor: MediaActor): MediaListAccess => {
	switch (actor.type) {
		case "internal":
			return { type: "all" };
		case "content":
			return { type: "library" };
		case "user":
			return canReadAll(actor.user)
				? { type: "all" }
				: { type: "owner", userId: actor.user.id };
	}
};
