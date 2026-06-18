import type { ResolvedAdminCopy } from "../locales/types.js";
import type { ProfilePicture } from "../media/types.js";
import type { Tenant } from "../tenants/types.js";

export type CorePermission =
	| "users:read"
	| "users:create"
	| "users:update"
	| "users:delete"
	| "roles:read"
	| "roles:create"
	| "roles:update"
	| "roles:delete"
	| "media:read"
	| "media:create"
	| "media:update"
	| "media:delete"
	| "email:read"
	| "email:delete"
	| "email:send"
	| "jobs:read"
	| "documents:read"
	| "documents:create"
	| "documents:update"
	| "documents:delete"
	| "documents:restore"
	| "documents:publish"
	| "documents:review"
	| "ai:custom-field-value"
	| "ai:image-generate"
	| "ai:alt-generate"
	| "integrations:read"
	| "integrations:create"
	| "integrations:update"
	| "integrations:delete"
	| "integrations:regenerate"
	| "settings:read"
	| "settings:update"
	| "license:update"
	| "cache:clear";

export type Permission = CorePermission | (string & {});

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

export type UserPermission = {
	roles: Array<{
		id: number;
		name: string;
	}>;
	permissions: Permission[];
};

export type User = {
	id: number;
	username: string;
	firstName: string | null;
	lastName: string | null;
	isDeleted: boolean;
	email: string;
	pendingEmailChange?: {
		email: string;
		requestedAt: string | null;
		expiresAt: string | null;
	} | null;
	profilePicture: ProfilePicture | null;
	deletedAt?: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;
	isLocked?: boolean;
	superAdmin?: boolean;
	triggerPasswordReset?: boolean | null;
	invitationAccepted?: boolean;
	roles?: UserPermission["roles"];
	permissions?: UserPermission["permissions"];
	tenants?: Tenant[];
	hasPassword?: boolean;
	authProviders?: Array<{
		id: number;
		providerKey: string;
		providerUserId: string;
		linkedAt: string | null;
	}>;
};

export type UserRef = {
	id: number;
	username: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	profilePicture: ProfilePicture | null;
} | null;

export type AuthProviderType = "oidc" | string;

export type AuthProvider = {
	key: string;
	name: string;
	icon?: string;
	type: AuthProviderType;
};

export type AuthProviders = {
	disablePassword: boolean;
	providers: AuthProvider[];
};

export type InitiateAuth = {
	redirectUrl: string;
};

export interface Role {
	id: number;
	key: string | null;
	tenantKey: string | null;
	name: {
		localeCode: string;
		value: string | null;
	}[];
	description: {
		localeCode: string;
		value: string | null;
	}[];
	locked: boolean;
	permissions?: {
		id: number;
		permission: Permission;
	}[];
	createdAt: string | null;
	updatedAt: string | null;
}

export interface UserLogin {
	id: number;
	userId: number | null;
	tokenId: number | null;
	authMethod: string;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string | null;
}

export interface ValidateInvitation {
	valid: boolean;
	user?: {
		id: User["id"];
		email: User["email"];
		username: User["username"];
		firstName: User["firstName"];
		lastName: User["lastName"];
	};
}
