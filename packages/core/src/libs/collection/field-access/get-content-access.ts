import { resolveFieldPermissions } from "../../permission/field-permissions.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";
import getFieldAccess from "./get-field-access.js";
import resolveFieldAccess from "./resolve-field-access.js";
import type { BrickAccess, ContentAccess, FieldAccessActor } from "./types.js";

/** Resolves field and brick access for an actor, granting unrestricted access to trusted callers such as hooks and system writes when the actor is omitted. */
const getContentAccess = (
	collection: CollectionBuilder,
	actor: FieldAccessActor | undefined,
): ContentAccess => {
	const fields = getFieldAccess(collection, actor, {
		collection: collection.key,
	});
	const bricks = new Map<string, BrickAccess>(
		collection.brickInstances.map((brick) => {
			const owner = { collection: collection.key, brick: brick.key };
			const access = resolveFieldAccess(
				actor,
				resolveFieldPermissions(owner, brick.config.permissions),
			);
			return [
				brick.key,
				{ access, fields: getFieldAccess(brick, actor, owner, access) },
			];
		}),
	);

	const restricted = [
		...fields.values(),
		...Array.from(bricks.values(), (brick) => [
			brick.access,
			...brick.fields.values(),
		]).flat(),
	].some((access) => access !== "editable");

	return { fields, bricks, restricted };
};

export default getContentAccess;
