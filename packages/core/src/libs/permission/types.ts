import type { ResolvedAdminCopy } from "../i18n/types.js";
import type { PermissionGroups, Permissions } from "./definitions.js";

export type StaticPermission = (typeof Permissions)[keyof typeof Permissions];

export type CollectionPermissionAction =
	| "read"
	| "create"
	| "update"
	| "delete"
	| "restore"
	| "publish"
	| "review";

export type CollectionPermission<
	TAction extends CollectionPermissionAction = CollectionPermissionAction,
> = `documents:${string}:${TAction}`;

export type CorePermission = StaticPermission | CollectionPermission;

export type Permission = CorePermission;

export type PermissionGroupKey = keyof typeof PermissionGroups;

export type PermissionDetails = {
	name: ResolvedAdminCopy;
	description?: ResolvedAdminCopy | null;
};

export type PermissionDefinition = {
	key: Permission;
	details: PermissionDetails;
	core: boolean;
};

export type PermissionGroup = {
	key: string;
	details: PermissionDetails;
	core: boolean;
	permissions: PermissionDefinition[];
};
