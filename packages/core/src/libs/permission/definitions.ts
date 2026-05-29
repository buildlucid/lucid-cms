import { text } from "../i18n/index.js";
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
			name: text.admin("core.permissions.user.permissions", {
				defaultMessage: "User Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.UsersRead,
				details: {
					name: text.admin("core.permissions.read.users", {
						defaultMessage: "Read Users",
					}),
				},
				core: true,
			},
			{
				key: Permissions.UsersCreate,
				details: {
					name: text.admin("core.permissions.create.users", {
						defaultMessage: "Create Users",
					}),
				},
				core: true,
			},
			{
				key: Permissions.UsersUpdate,
				details: {
					name: text.admin("core.permissions.update.users", {
						defaultMessage: "Update Users",
					}),
				},
				core: true,
			},
			{
				key: Permissions.UsersDelete,
				details: {
					name: text.admin("core.permissions.delete.users", {
						defaultMessage: "Delete Users",
					}),
				},
				core: true,
			},
		],
	},
	roles: {
		key: "roles_permissions",
		details: {
			name: text.admin("core.permissions.role.permissions", {
				defaultMessage: "Role Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.RolesRead,
				details: {
					name: text.admin("core.permissions.read.roles", {
						defaultMessage: "Read Roles",
					}),
				},
				core: true,
			},
			{
				key: Permissions.RolesCreate,
				details: {
					name: text.admin("core.permissions.create.roles", {
						defaultMessage: "Create Roles",
					}),
				},
				core: true,
			},
			{
				key: Permissions.RolesUpdate,
				details: {
					name: text.admin("core.permissions.update.roles", {
						defaultMessage: "Update Roles",
					}),
				},
				core: true,
			},
			{
				key: Permissions.RolesDelete,
				details: {
					name: text.admin("core.permissions.delete.roles", {
						defaultMessage: "Delete Roles",
					}),
				},
				core: true,
			},
		],
	},
	media: {
		key: "media_permissions",
		details: {
			name: text.admin("core.permissions.media.permissions", {
				defaultMessage: "Media Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.MediaRead,
				details: {
					name: text.admin("core.permissions.read.media", {
						defaultMessage: "Read Media",
					}),
				},
				core: true,
			},
			{
				key: Permissions.MediaCreate,
				details: {
					name: text.admin("core.permissions.create.media", {
						defaultMessage: "Create Media",
					}),
				},
				core: true,
			},
			{
				key: Permissions.MediaUpdate,
				details: {
					name: text.admin("core.permissions.update.media", {
						defaultMessage: "Update Media",
					}),
				},
				core: true,
			},
			{
				key: Permissions.MediaDelete,
				details: {
					name: text.admin("core.permissions.delete.media", {
						defaultMessage: "Delete Media",
					}),
				},
				core: true,
			},
		],
	},
	emails: {
		key: "emails_permissions",
		details: {
			name: text.admin("core.permissions.email.permissions", {
				defaultMessage: "Email Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.EmailRead,
				details: {
					name: text.admin("core.permissions.read.emails", {
						defaultMessage: "Read Emails",
					}),
				},
				core: true,
			},
			{
				key: Permissions.EmailDelete,
				details: {
					name: text.admin("core.permissions.delete.emails", {
						defaultMessage: "Delete Emails",
					}),
				},
				core: true,
			},
			{
				key: Permissions.EmailSend,
				details: {
					name: text.admin("core.permissions.send.emails", {
						defaultMessage: "Send Emails",
					}),
				},
				core: true,
			},
		],
	},
	jobs: {
		key: "jobs_permissions",
		details: {
			name: text.admin("core.permissions.jobs.permissions", {
				defaultMessage: "Jobs Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.JobsRead,
				details: {
					name: text.admin("core.permissions.read.jobs", {
						defaultMessage: "Read Jobs",
					}),
				},
				core: true,
			},
		],
	},
	content: {
		key: "content_permissions",
		details: {
			name: text.admin("core.permissions.content.permissions", {
				defaultMessage: "Content Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.DocumentsRead,
				details: {
					name: text.admin("core.permissions.read.documents", {
						defaultMessage: "Read Documents",
					}),
				},
				core: true,
			},
			{
				key: Permissions.DocumentsCreate,
				details: {
					name: text.admin("core.permissions.create.documents", {
						defaultMessage: "Create Documents",
					}),
				},
				core: true,
			},
			{
				key: Permissions.DocumentsUpdate,
				details: {
					name: text.admin("core.permissions.update.documents", {
						defaultMessage: "Update Documents",
					}),
				},
				core: true,
			},
			{
				key: Permissions.DocumentsDelete,
				details: {
					name: text.admin("core.permissions.delete.documents", {
						defaultMessage: "Delete Documents",
					}),
				},
				core: true,
			},
			{
				key: Permissions.DocumentsRestore,
				details: {
					name: text.admin("core.permissions.restore.revisions", {
						defaultMessage: "Restore Revisions",
					}),
				},
				core: true,
			},
			{
				key: Permissions.DocumentsPublish,
				details: {
					name: text.admin("core.permissions.publish.documents", {
						defaultMessage: "Publish Documents",
					}),
				},
				core: true,
			},
			{
				key: Permissions.DocumentsReview,
				details: {
					name: text.admin("core.permissions.review.document.releases", {
						defaultMessage: "Review Document Releases",
					}),
				},
				core: true,
			},
			{
				key: Permissions.DocumentsAi,
				details: {
					name: text.admin("core.permissions.use.document.ai", {
						defaultMessage: "Use Document AI",
					}),
				},
				core: true,
			},
		],
	},
	"client-integrations": {
		key: "client_integrations_permissions",
		details: {
			name: text.admin("core.permissions.integrations.permissions", {
				defaultMessage: "Integrations Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.IntegrationRead,
				details: {
					name: text.admin("core.permissions.read.integrations", {
						defaultMessage: "Read Integrations",
					}),
				},
				core: true,
			},
			{
				key: Permissions.IntegrationCreate,
				details: {
					name: text.admin("core.permissions.create.integrations", {
						defaultMessage: "Create Integrations",
					}),
				},
				core: true,
			},
			{
				key: Permissions.IntegrationUpdate,
				details: {
					name: text.admin("core.permissions.update.integrations", {
						defaultMessage: "Update Integrations",
					}),
				},
				core: true,
			},
			{
				key: Permissions.IntegrationDelete,
				details: {
					name: text.admin("core.permissions.delete.integrations", {
						defaultMessage: "Delete Integrations",
					}),
				},
				core: true,
			},
			{
				key: Permissions.IntegrationRegenerate,
				details: {
					name: text.admin("core.permissions.regenerate.api.keys", {
						defaultMessage: "Regenerate API Keys",
					}),
				},
				core: true,
			},
		],
	},
	settings: {
		key: "settings_permissions",
		details: {
			name: text.admin("core.permissions.setting.permissions", {
				defaultMessage: "Setting Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.SettingsRead,
				details: {
					name: text.admin("core.permissions.read.settings", {
						defaultMessage: "Read Settings",
					}),
				},
				core: true,
			},
			{
				key: Permissions.SettingsUpdate,
				details: {
					name: text.admin("core.permissions.update.settings", {
						defaultMessage: "Update Settings",
					}),
				},
				core: true,
			},
			{
				key: Permissions.LicenseUpdate,
				details: {
					name: text.admin("core.permissions.update.license", {
						defaultMessage: "Update License",
					}),
				},
				core: true,
			},
			{
				key: Permissions.CacheClear,
				details: {
					name: text.admin("core.permissions.clear.cache", {
						defaultMessage: "Clear Cache",
					}),
				},
				core: true,
			},
		],
	},
}) satisfies Record<string, PermissionGroup>;
