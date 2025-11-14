import type { Permission } from "../../libs/permission/types.js";

type UserResponseExtras = {
	isLocked: boolean;
	deletedAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	superAdmin: boolean;
	triggerPasswordReset: boolean | null;
	invitationAccepted: boolean;
	roles: UserPermissionsResponse["roles"];
	permissions: UserPermissionsResponse["permissions"];
	hasPassword: boolean;
	authProviders: Array<{
		id: number;
		providerKey: string;
		providerUserId: string;
		linkedAt: string | null;
	}>;
};

type PermissionUserKeys = {
	default: never;
	read: "deletedAt" | "createdAt" | "updatedAt";
	update:
		| "deletedAt"
		| "createdAt"
		| "updatedAt"
		| "isLocked"
		| "superAdmin"
		| "triggerPasswordReset"
		| "invitationAccepted"
		| "roles"
		| "permissions"
		| "hasPassword"
		| "authProviders";
};

type PermissionLevel = keyof PermissionUserKeys;

export type UserResponse<T extends PermissionLevel = "default"> = {
	id: number;
	email: string;
	username: string;
	firstName: string | null;
	lastName: string | null;
	isDeleted: boolean;
} & Partial<UserResponseExtras> &
	Required<Pick<UserResponseExtras, PermissionUserKeys[T]>>;

export type UserPermissionsResponse = {
	roles: Array<{
		id: number;
		name: string;
	}>;
	permissions: Permission[];
};
