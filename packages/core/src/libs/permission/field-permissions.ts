import type {
	FieldPermission,
	FieldPermissionAction,
	FieldPermissions,
	GeneratedFieldPermissions,
} from "./types.js";

/** Actions a field or brick can opt in to. */
export const fieldPermissionActions = ["read", "update"] as const;

/** Where a generated permission applies: a collection's own field, a brick, or a field inside a brick. */
export type FieldPermissionTarget =
	| { collection: string; brick?: string; field: string }
	| { collection: string; brick: string; field?: undefined };

/** Builds a generated field or brick permission, eg. `documents:page:fields:seo:read` or `documents:page:bricks:banner:fields:cta:update`. */
export const getFieldPermission = <TAction extends FieldPermissionAction>(
	target: FieldPermissionTarget,
	action: TAction,
): FieldPermission<TAction> => {
	if (target.field === undefined) {
		return `documents:${target.collection}:bricks:${target.brick}:${action}`;
	}

	return target.brick === undefined
		? `documents:${target.collection}:fields:${target.field}:${action}`
		: `documents:${target.collection}:bricks:${target.brick}:fields:${target.field}:${action}`;
};

/** Resolves the generated permissions a field or brick opts in to, or undefined when it doesn't restrict access. */
export const resolveFieldPermissions = (
	target: FieldPermissionTarget,
	permissions: FieldPermissions | undefined,
): GeneratedFieldPermissions | undefined => {
	if (permissions?.read !== true && permissions?.update !== true) {
		return undefined;
	}

	return {
		...(permissions.read === true && {
			read: getFieldPermission(target, "read"),
		}),
		...(permissions.update === true && {
			update: getFieldPermission(target, "update"),
		}),
	};
};
