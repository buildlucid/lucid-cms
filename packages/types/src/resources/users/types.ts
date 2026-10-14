import type { AiModelSelection } from "../ai/types.js";
import type { ResolvedAdminCopy } from "../locales/types.js";
import type { ProfilePicture } from "../media/types.js";

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
	| "media:read-all"
	| "email:read"
	| "email:delete"
	| "email:send"
	| "jobs:read"
	| "jobs:run"
	| "jobs:update"
	| "requests:read"
	| `documents:${string}:${"read" | "create" | "create-request" | "update" | "delete" | "delete-request" | "unpublish-request" | "restore" | "publish" | "review"}`
	| "ai:image-generate"
	| "ai:audio-generate"
	| "ai:alt-generate"
	| "ai:routines-manage-all"
	| `agents:${string}:${"chat" | "manage-own-routines" | "manage-code-routines"}`
	| "integrations:read"
	| "integrations:create"
	| "integrations:update"
	| "integrations:delete"
	| "integrations:regenerate"
	| "settings:read"
	| "settings:update"
	| "connection:update"
	| "cache:clear";

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
	hasPassword?: boolean;
	authProviders?: Array<{
		id: number;
		providerKey: string;
		providerUserId: string;
		linkedAt: string | null;
	}>;
	/** Only returned for the authenticated user. */
	preferences?: UserPreferences;
};

/** `sm` is a third of a wide row, `md` half, `lg` two thirds and `full` the whole row. */
export type HomeWidgetSize = "sm" | "md" | "lg" | "full";

/** A Home overview widget whose list position controls display order. */
export type HomeWidgetPreference = {
	key: string;
	size?: HomeWidgetSize;
	hidden?: boolean;
};

/** UI preferences synced across devices, with omitted keys using admin defaults. */
export type UserPreferences = {
	/** Hides AI features in the admin. */
	aiHidden?: boolean;
	interfaceLocale?: string;
	/** The agent new chats start with. */
	agentKey?: string;
	/** The last model and effort chosen for each agent, keyed by agent key. */
	agentModels?: Record<string, AiModelSelection>;
	autoSaveEnabled?: boolean;
	home?: {
		/** Ask opens Home on the agent's chat box, Overview on its widgets. */
		view?: "ask" | "overview";
		/** Unset until the user customises the overview, so it follows the defaults. */
		widgets?: HomeWidgetPreference[];
	};
	/** Hidden columns, keyed by table key. */
	tables?: Record<string, string[]>;
	/** Optional activity filter keys, showing no extra request activity when unset. */
	requestActivityFilters?: string[];
};

export type Account = {
	id: number;
	username: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	profilePicture: ProfilePicture | null;
};

/** User details for actor and permission displays, excluding contact information. */
export type UserDisplay = {
	id: number;
	username: string;
	firstName: string | null;
	lastName: string | null;
	profilePicture: ProfilePicture | null;
};

/** A user referenced by a user field, with the email a field can show. */
export type UserRef = (UserDisplay & { email: string }) | null;

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
	name: string;
	description: string | null;
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
