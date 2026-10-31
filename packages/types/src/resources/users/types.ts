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
	| "ai:memories-manage"
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
	/**
	 * Labelled sets of permissions shown below the group's own, such as a collection's generated field
	 * permissions.
	 */
	subgroups?: PermissionSubgroup[];
};

export type PermissionSubgroup = {
	key: string;
	details: PermissionDetails;
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
	/** Visible with `users:read` or on your own account. */
	email?: string;
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
	/** Visible with `users:update` or on your own account. */
	twoFactor?: {
		enabled: boolean;
		enabledAt: string | null;
		/** Whether they have to use it, from the config or their roles. Only returned for the authenticated user. */
		required?: boolean;
		/** Unused recovery codes. Only returned for the authenticated user. */
		recoveryCodesRemaining?: number;
	};
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

/** A user referenced by a user field; only admin responses include their email, for the field to show. */
export type UserRef = (UserDisplay & { email?: string }) | null;

export type AuthProviderType = "oidc" | string;

export type AuthProvider = {
	key: string;
	name: string;
	icon?: string;
	type: AuthProviderType;
};

export type AuthProviders = {
	disablePassword: boolean;
	/** Whether users can log in with a code or link sent to their email. */
	magicLink: boolean;
	/** Whether users can turn on two-factor authentication. */
	twoFactor: boolean;
	providers: AuthProvider[];
};

export type TwoFactorStep = "verify" | "setup";

/** What password and magic link logins return. With a two-factor step, the session waits until it's done. */
export type LoginResult = {
	twoFactor: TwoFactorStep | null;
};

export type TwoFactorProof = { code: string } | { recoveryCode: string };

export type TwoFactorChallenge = {
	step: TwoFactorStep;
};

/** A new authenticator app secret, as a key to type in and an otpauth:// link for the QR code. */
export type TwoFactorSetup = {
	secret: string;
	uri: string;
};

/** Recovery codes, shown once when they're created. */
export type TwoFactorRecoveryCodes = {
	recoveryCodes: string[];
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
	requireTwoFactor: boolean;
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

export interface ValidateMagicLink {
	/** The email address of the account the link logs in to. */
	email: User["email"];
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
