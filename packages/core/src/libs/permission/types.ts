import type { AdminTextDescriptor } from "../i18n/types.js";
import type { PermissionGroups, Permissions } from "./definitions.js";

export type CorePermission = (typeof Permissions)[keyof typeof Permissions];

export type Permission = CorePermission | (string & {});

export type PermissionGroupKey = keyof typeof PermissionGroups;

export type PermissionDetails = {
	name: AdminTextDescriptor;
	description?: AdminTextDescriptor | null;
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
