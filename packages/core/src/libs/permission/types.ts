import type { PermissionGroups, Permissions } from "./definitions.js";

export type Permission = (typeof Permissions)[keyof typeof Permissions];
export type PermissionGroupKey = keyof typeof PermissionGroups;
export type PermissionGroup = {
	key: string;
	permissions: Permission[];
};
