import type { ResolvedAdminCopy } from "../i18n/types.js";
import type { PermissionGroups, Permissions } from "./definitions.js";

export type StaticPermission = (typeof Permissions)[keyof typeof Permissions];

export type CollectionPermissionAction =
	| "read"
	| "create"
	/** Request new documents, which are only created once their create release is released. */
	| "create-request"
	| "update"
	| "delete"
	| "restore"
	| "publish"
	| "review";

export type CollectionPermission<
	TAction extends CollectionPermissionAction = CollectionPermissionAction,
> = `documents:${string}:${TAction}`;

export type AgentPermissionAction =
	| "chat"
	| "manage-own-routines"
	| "manage-code-routines";

export type AgentPermission<
	TAction extends AgentPermissionAction = AgentPermissionAction,
> = `agents:${string}:${TAction}`;

export type CorePermission =
	| StaticPermission
	| CollectionPermission
	| AgentPermission;

/** Project permissions added by Lucid type generation or a plugin. */
// biome-ignore lint/suspicious/noEmptyInterface: generated types and plugins augment this interface
export interface CustomPermissions {}

export type Permission =
	| CorePermission
	| Extract<keyof CustomPermissions, string>;

/** One permission, every permission in a list, or `some` of several options. */
export type PermissionRequirement =
	| Permission
	| readonly Permission[]
	| { readonly some: readonly (Permission | readonly Permission[])[] };

export type PermissionGroupKey = keyof typeof PermissionGroups;

export type PermissionDetails = {
	name: ResolvedAdminCopy;
	description?: ResolvedAdminCopy | null;
};

export type PermissionDefinition = {
	key: string;
	details: PermissionDetails;
	core: boolean;
};

export type PermissionGroup = {
	key: string;
	details: PermissionDetails;
	core: boolean;
	permissions: PermissionDefinition[];
};
