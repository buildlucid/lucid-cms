import type { PermissionGroup } from "./types.js";

export const Permissions = {
	// User permissions
	UsersRead: "users:read",
	UsersCreate: "users:create",
	UsersUpdate: "users:update",
	UsersDelete: "users:delete",

	// Role permissions
	RolesRead: "roles:read",
	RolesCreate: "roles:create",
	RolesUpdate: "roles:update",
	RolesDelete: "roles:delete",

	// Media permissions
	MediaRead: "media:read",
	MediaCreate: "media:create",
	MediaUpdate: "media:update",
	MediaDelete: "media:delete",

	// Email permissions
	EmailRead: "email:read",
	EmailDelete: "email:delete",
	EmailSend: "email:send",

	// Job permissions
	JobsRead: "jobs:read",

	// Content permissions
	DocumentsRead: "documents:read",
	DocumentsCreate: "documents:create",
	DocumentsUpdate: "documents:update",
	DocumentsDelete: "documents:delete",
	DocumentsRestore: "documents:restore",
	DocumentsPublish: "documents:publish",

	// Client integration permissions
	IntegrationRead: "integrations:read",
	IntegrationCreate: "integrations:create",
	IntegrationUpdate: "integrations:update",
	IntegrationDelete: "integrations:delete",
	IntegrationRegenerate: "integrations:regenerate",

	// Settings permissions
	LicenseUpdate: "license:update",
	CacheClear: "cache:clear",
} as const;

export const PermissionGroups = Object.freeze({
	users: {
		key: "users_permissions",
		permissions: [
			Permissions.UsersRead,
			Permissions.UsersCreate,
			Permissions.UsersUpdate,
			Permissions.UsersDelete,
		],
	},
	roles: {
		key: "roles_permissions",
		permissions: [
			Permissions.RolesRead,
			Permissions.RolesCreate,
			Permissions.RolesUpdate,
			Permissions.RolesDelete,
		],
	},
	media: {
		key: "media_permissions",
		permissions: [
			Permissions.MediaRead,
			Permissions.MediaCreate,
			Permissions.MediaUpdate,
			Permissions.MediaDelete,
		],
	},
	emails: {
		key: "emails_permissions",
		permissions: [
			Permissions.EmailRead,
			Permissions.EmailDelete,
			Permissions.EmailSend,
		],
	},
	jobs: {
		key: "jobs_permissions",
		permissions: [Permissions.JobsRead],
	},
	content: {
		key: "content_permissions",
		permissions: [
			Permissions.DocumentsRead,
			Permissions.DocumentsCreate,
			Permissions.DocumentsUpdate,
			Permissions.DocumentsDelete,
			Permissions.DocumentsRestore,
			Permissions.DocumentsPublish,
		],
	},
	"client-integrations": {
		key: "client_integrations_permissions",
		permissions: [
			Permissions.IntegrationRead,
			Permissions.IntegrationCreate,
			Permissions.IntegrationUpdate,
			Permissions.IntegrationDelete,
			Permissions.IntegrationRegenerate,
		],
	},
	settings: {
		key: "settings_permissions",
		permissions: [Permissions.LicenseUpdate, Permissions.CacheClear],
	},
}) satisfies Record<string, PermissionGroup>;
