import type {
	FieldPermission,
	FieldPermissionAction,
	FieldPermissions,
	GeneratedFieldPermissions,
} from "./types.js";

/** The `update` setting for values nobody's permissions change: only code acting as the system does. */
export const systemOnly = "system";

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
	const read =
		permissions?.read === true ? getFieldPermission(target, "read") : undefined;
	const update =
		permissions?.update === systemOnly
			? systemOnly
			: permissions?.update === true
				? getFieldPermission(target, "update")
				: undefined;
	if (read === undefined && update === undefined) return undefined;

	return {
		...(read !== undefined && { read }),
		...(update !== undefined && { update }),
	};
};
