import type { ResolvedAdminCopy } from "../i18n/types.js";
import type { agentPermissionActions } from "./agent-permissions.js";
import type { collectionPermissionActions } from "./collection-permissions.js";
import type { PermissionGroups, Permissions } from "./definitions.js";
import type { fieldPermissionActions } from "./field-permissions.js";

export type StaticPermission = (typeof Permissions)[keyof typeof Permissions];

export type CollectionPermissionAction =
	(typeof collectionPermissionActions)[number];

export type CollectionPermission<
	TAction extends CollectionPermissionAction = CollectionPermissionAction,
> = `documents:${string}:${TAction}`;

export type AgentPermissionAction = (typeof agentPermissionActions)[number];

export type AgentPermission<
	TAction extends AgentPermissionAction = AgentPermissionAction,
> = `agents:${string}:${TAction}`;

export type FieldPermissionAction = (typeof fieldPermissionActions)[number];

/** A permission Lucid generates for a field or brick that opts in, eg. `documents:page:fields:seo:read` or `documents:page:bricks:banner:update`. */
export type FieldPermission<
	TAction extends FieldPermissionAction = FieldPermissionAction,
> =
	| `documents:${string}:fields:${string}:${TAction}`
	| `documents:${string}:bricks:${string}:${TAction}`;

export type CorePermission =
	| StaticPermission
	| CollectionPermission
	| FieldPermission
	| AgentPermission;

/** Project permissions added by Lucid type generation or a plugin. */
// oxlint-disable-next-line typescript/no-empty-object-type -- generated types and plugins augment this interface
export interface CustomPermissions {}

export type Permission =
	| CorePermission
	| Extract<keyof CustomPermissions, string>;

/** One permission, every permission in a list, or `some` of several options. */
export type PermissionRequirement =
	| Permission
	| readonly Permission[]
	| { readonly some: readonly (Permission | readonly Permission[])[] };

/** Enables generated read/update permissions for fields, tabs, sections, collapsibles and bricks, scoped to their collection and enforced cumulatively through containers and bricks. */
export type FieldPermissions = {
	/** Generates a read permission only when `true`, hiding the field or brick from the admin and document responses for actors who lack it. */
	read?: boolean;
	/** Generates an update permission only when `true`, making values read-only for actors who lack it while saves preserve stored values. */
	update?: boolean;
};

/** The generated permissions a field or brick requires, as collection responses send them. */
export type GeneratedFieldPermissions = {
	read?: FieldPermission<"read">;
	update?: FieldPermission<"update">;
};

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
	/** Labelled sets of permissions shown below the group's own, such as a collection's generated field permissions. */
	subgroups?: PermissionSubgroup[];
};

export type PermissionSubgroup = {
	key: string;
	details: PermissionDetails;
	permissions: PermissionDefinition[];
};
