import { adminText } from "../i18n/admin-text.js";
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
	DocumentsAi: "documents:ai",

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
		Permissions.DocumentsAi,
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
			name: adminText("core.permissions.user.permissions", {
				fallback: "User Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.UsersRead,
				details: {
					name: adminText("core.permissions.read.users", {
						fallback: "Read Users",
					}),
				},
				core: true,
			},
			{
				key: Permissions.UsersCreate,
				details: {
					name: adminText("core.permissions.create.users", {
						fallback: "Create Users",
					}),
				},
				core: true,
			},
			{
				key: Permissions.UsersUpdate,
				details: {
					name: adminText("core.permissions.update.users", {
						fallback: "Update Users",
					}),
				},
				core: true,
			},
			{
				key: Permissions.UsersDelete,
				details: {
					name: adminText("core.permissions.delete.users", {
						fallback: "Delete Users",
					}),
				},
				core: true,
			},
		],
	},
	roles: {
		key: "roles_permissions",
		details: {
			name: adminText("core.permissions.role.permissions", {
				fallback: "Role Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.RolesRead,
				details: {
					name: adminText("core.permissions.read.roles", {
						fallback: "Read Roles",
					}),
				},
				core: true,
			},
			{
				key: Permissions.RolesCreate,
				details: {
					name: adminText("core.permissions.create.roles", {
						fallback: "Create Roles",
					}),
				},
				core: true,
			},
			{
				key: Permissions.RolesUpdate,
				details: {
					name: adminText("core.permissions.update.roles", {
						fallback: "Update Roles",
					}),
				},
				core: true,
			},
			{
				key: Permissions.RolesDelete,
				details: {
					name: adminText("core.permissions.delete.roles", {
						fallback: "Delete Roles",
					}),
				},
				core: true,
			},
		],
	},
	media: {
		key: "media_permissions",
		details: {
			name: adminText("core.permissions.media.permissions", {
				fallback: "Media Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.MediaRead,
				details: {
					name: adminText("core.permissions.read.media", {
						fallback: "Read Media",
					}),
				},
				core: true,
			},
			{
				key: Permissions.MediaCreate,
				details: {
					name: adminText("core.permissions.create.media", {
						fallback: "Create Media",
					}),
				},
				core: true,
			},
			{
				key: Permissions.MediaUpdate,
				details: {
					name: adminText("core.permissions.update.media", {
						fallback: "Update Media",
					}),
				},
				core: true,
			},
			{
				key: Permissions.MediaDelete,
				details: {
					name: adminText("core.permissions.delete.media", {
						fallback: "Delete Media",
					}),
				},
				core: true,
			},
		],
	},
	emails: {
		key: "emails_permissions",
		details: {
			name: adminText("core.permissions.email.permissions", {
				fallback: "Email Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.EmailRead,
				details: {
					name: adminText("core.permissions.read.emails", {
						fallback: "Read Emails",
					}),
				},
				core: true,
			},
			{
				key: Permissions.EmailDelete,
				details: {
					name: adminText("core.permissions.delete.emails", {
						fallback: "Delete Emails",
					}),
				},
				core: true,
			},
			{
				key: Permissions.EmailSend,
				details: {
					name: adminText("core.permissions.send.emails", {
						fallback: "Send Emails",
					}),
				},
				core: true,
			},
		],
	},
	jobs: {
		key: "jobs_permissions",
		details: {
			name: adminText("core.permissions.jobs.permissions", {
				fallback: "Jobs Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.JobsRead,
				details: {
					name: adminText("core.permissions.read.jobs", {
						fallback: "Read Jobs",
					}),
				},
				core: true,
			},
		],
	},
	content: {
		key: "content_permissions",
		details: {
			name: adminText("core.permissions.content.permissions", {
				fallback: "Content Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.DocumentsRead,
				details: {
					name: adminText("core.permissions.read.documents", {
						fallback: "Read Documents",
					}),
				},
				core: true,
			},
			{
				key: Permissions.DocumentsCreate,
				details: {
					name: adminText("core.permissions.create.documents", {
						fallback: "Create Documents",
					}),
				},
				core: true,
			},
			{
				key: Permissions.DocumentsUpdate,
				details: {
					name: adminText("core.permissions.update.documents", {
						fallback: "Update Documents",
					}),
				},
				core: true,
			},
			{
				key: Permissions.DocumentsDelete,
				details: {
					name: adminText("core.permissions.delete.documents", {
						fallback: "Delete Documents",
					}),
				},
				core: true,
			},
			{
				key: Permissions.DocumentsRestore,
				details: {
					name: adminText("core.permissions.restore.revisions", {
						fallback: "Restore Revisions",
					}),
				},
				core: true,
			},
			{
				key: Permissions.DocumentsPublish,
				details: {
					name: adminText("core.permissions.publish.documents", {
						fallback: "Publish Documents",
					}),
				},
				core: true,
			},
			{
				key: Permissions.DocumentsReview,
				details: {
					name: adminText("core.permissions.review.document.releases", {
						fallback: "Review Document Releases",
					}),
				},
				core: true,
			},
			{
				key: Permissions.DocumentsAi,
				details: {
					name: adminText("core.permissions.use.document.ai", {
						fallback: "Use Document AI",
					}),
				},
				core: true,
			},
		],
	},
	"client-integrations": {
		key: "client_integrations_permissions",
		details: {
			name: adminText("core.permissions.integrations.permissions", {
				fallback: "Integrations Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.IntegrationRead,
				details: {
					name: adminText("core.permissions.read.integrations", {
						fallback: "Read Integrations",
					}),
				},
				core: true,
			},
			{
				key: Permissions.IntegrationCreate,
				details: {
					name: adminText("core.permissions.create.integrations", {
						fallback: "Create Integrations",
					}),
				},
				core: true,
			},
			{
				key: Permissions.IntegrationUpdate,
				details: {
					name: adminText("core.permissions.update.integrations", {
						fallback: "Update Integrations",
					}),
				},
				core: true,
			},
			{
				key: Permissions.IntegrationDelete,
				details: {
					name: adminText("core.permissions.delete.integrations", {
						fallback: "Delete Integrations",
					}),
				},
				core: true,
			},
			{
				key: Permissions.IntegrationRegenerate,
				details: {
					name: adminText("core.permissions.regenerate.api.keys", {
						fallback: "Regenerate API Keys",
					}),
				},
				core: true,
			},
		],
	},
	settings: {
		key: "settings_permissions",
		details: {
			name: adminText("core.permissions.setting.permissions", {
				fallback: "Setting Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.SettingsRead,
				details: {
					name: adminText("core.permissions.read.settings", {
						fallback: "Read Settings",
					}),
				},
				core: true,
			},
			{
				key: Permissions.SettingsUpdate,
				details: {
					name: adminText("core.permissions.update.settings", {
						fallback: "Update Settings",
					}),
				},
				core: true,
			},
			{
				key: Permissions.LicenseUpdate,
				details: {
					name: adminText("core.permissions.update.license", {
						fallback: "Update License",
					}),
				},
				core: true,
			},
			{
				key: Permissions.CacheClear,
				details: {
					name: adminText("core.permissions.clear.cache", {
						fallback: "Clear Cache",
					}),
				},
				core: true,
			},
		],
	},
}) satisfies Record<string, PermissionGroup>;
