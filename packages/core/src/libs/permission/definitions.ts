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
	DocumentsReview: "documents:review",

	// Client integration permissions
	IntegrationRead: "integrations:read",
	IntegrationCreate: "integrations:create",
	IntegrationUpdate: "integrations:update",
	IntegrationDelete: "integrations:delete",
	IntegrationRegenerate: "integrations:regenerate",

	// Settings permissions
	SettingsRead: "settings:read",
	SettingsUpdate: "settings:update",
	LicenseUpdate: "license:update",
	CacheClear: "cache:clear",
} as const;

export const PermissionSets = {
	Users: [
		Permissions.UsersRead,
		Permissions.UsersCreate,
		Permissions.UsersUpdate,
		Permissions.UsersDelete,
	],
	Roles: [
		Permissions.RolesRead,
		Permissions.RolesCreate,
		Permissions.RolesUpdate,
		Permissions.RolesDelete,
	],
	Media: [
		Permissions.MediaRead,
		Permissions.MediaCreate,
		Permissions.MediaUpdate,
		Permissions.MediaDelete,
	],
	Email: [
		Permissions.EmailRead,
		Permissions.EmailDelete,
		Permissions.EmailSend,
	],
	Jobs: [Permissions.JobsRead],
	Documents: [
		Permissions.DocumentsRead,
		Permissions.DocumentsCreate,
		Permissions.DocumentsUpdate,
		Permissions.DocumentsDelete,
		Permissions.DocumentsRestore,
		Permissions.DocumentsPublish,
		Permissions.DocumentsReview,
	],
	Integrations: [
		Permissions.IntegrationRead,
		Permissions.IntegrationCreate,
		Permissions.IntegrationUpdate,
		Permissions.IntegrationDelete,
		Permissions.IntegrationRegenerate,
	],
	Settings: [
		Permissions.SettingsRead,
		Permissions.SettingsUpdate,
		Permissions.LicenseUpdate,
		Permissions.CacheClear,
	],
} as const;

export const PermissionGroups = Object.freeze({
	users: {
		key: "users_permissions",
		details: {
			name: "User Permissions",
		},
		core: true,
		permissions: [
			{
				key: Permissions.UsersRead,
				details: { name: "Read Users" },
				core: true,
			},
			{
				key: Permissions.UsersCreate,
				details: { name: "Create Users" },
				core: true,
			},
			{
				key: Permissions.UsersUpdate,
				details: { name: "Update Users" },
				core: true,
			},
			{
				key: Permissions.UsersDelete,
				details: { name: "Delete Users" },
				core: true,
			},
		],
	},
	roles: {
		key: "roles_permissions",
		details: {
			name: "Role Permissions",
		},
		core: true,
		permissions: [
			{
				key: Permissions.RolesRead,
				details: { name: "Read Roles" },
				core: true,
			},
			{
				key: Permissions.RolesCreate,
				details: { name: "Create Roles" },
				core: true,
			},
			{
				key: Permissions.RolesUpdate,
				details: { name: "Update Roles" },
				core: true,
			},
			{
				key: Permissions.RolesDelete,
				details: { name: "Delete Roles" },
				core: true,
			},
		],
	},
	media: {
		key: "media_permissions",
		details: {
			name: "Media Permissions",
		},
		core: true,
		permissions: [
			{
				key: Permissions.MediaRead,
				details: { name: "Read Media" },
				core: true,
			},
			{
				key: Permissions.MediaCreate,
				details: { name: "Create Media" },
				core: true,
			},
			{
				key: Permissions.MediaUpdate,
				details: { name: "Update Media" },
				core: true,
			},
			{
				key: Permissions.MediaDelete,
				details: { name: "Delete Media" },
				core: true,
			},
		],
	},
	emails: {
		key: "emails_permissions",
		details: {
			name: "Email Permissions",
		},
		core: true,
		permissions: [
			{
				key: Permissions.EmailRead,
				details: { name: "Read Emails" },
				core: true,
			},
			{
				key: Permissions.EmailDelete,
				details: { name: "Delete Emails" },
				core: true,
			},
			{
				key: Permissions.EmailSend,
				details: { name: "Send Emails" },
				core: true,
			},
		],
	},
	jobs: {
		key: "jobs_permissions",
		details: {
			name: "Jobs Permissions",
		},
		core: true,
		permissions: [
			{
				key: Permissions.JobsRead,
				details: { name: "Read Jobs" },
				core: true,
			},
		],
	},
	content: {
		key: "content_permissions",
		details: {
			name: "Content Permissions",
		},
		core: true,
		permissions: [
			{
				key: Permissions.DocumentsRead,
				details: { name: "Read Documents" },
				core: true,
			},
			{
				key: Permissions.DocumentsCreate,
				details: { name: "Create Documents" },
				core: true,
			},
			{
				key: Permissions.DocumentsUpdate,
				details: { name: "Update Documents" },
				core: true,
			},
			{
				key: Permissions.DocumentsDelete,
				details: { name: "Delete Documents" },
				core: true,
			},
			{
				key: Permissions.DocumentsRestore,
				details: { name: "Restore Revisions" },
				core: true,
			},
			{
				key: Permissions.DocumentsPublish,
				details: { name: "Publish Documents" },
				core: true,
			},
			{
				key: Permissions.DocumentsReview,
				details: { name: "Review Document Publish Requests" },
				core: true,
			},
		],
	},
	"client-integrations": {
		key: "client_integrations_permissions",
		details: {
			name: "Integrations Permissions",
		},
		core: true,
		permissions: [
			{
				key: Permissions.IntegrationRead,
				details: { name: "Read Integrations" },
				core: true,
			},
			{
				key: Permissions.IntegrationCreate,
				details: { name: "Create Integrations" },
				core: true,
			},
			{
				key: Permissions.IntegrationUpdate,
				details: { name: "Update Integrations" },
				core: true,
			},
			{
				key: Permissions.IntegrationDelete,
				details: { name: "Delete Integrations" },
				core: true,
			},
			{
				key: Permissions.IntegrationRegenerate,
				details: { name: "Regenerate API Keys" },
				core: true,
			},
		],
	},
	settings: {
		key: "settings_permissions",
		details: {
			name: "Setting Permissions",
		},
		core: true,
		permissions: [
			{
				key: Permissions.SettingsRead,
				details: { name: "Read Settings" },
				core: true,
			},
			{
				key: Permissions.SettingsUpdate,
				details: { name: "Update Settings" },
				core: true,
			},
			{
				key: Permissions.LicenseUpdate,
				details: { name: "Update License" },
				core: true,
			},
			{
				key: Permissions.CacheClear,
				details: { name: "Clear Cache" },
				core: true,
			},
		],
	},
}) satisfies Record<string, PermissionGroup>;
