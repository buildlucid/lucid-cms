import { copy } from "../i18n/index.js";
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
	MediaReadAll: "media:read-all",

	// Email permissions
	EmailRead: "email:read",
	EmailDelete: "email:delete",
	EmailSend: "email:send",

	// Job permissions
	JobsRead: "jobs:read",
	JobsRun: "jobs:run",
	JobsUpdate: "jobs:update",

	// Request permissions
	RequestsRead: "requests:read",

	// AI permissions
	AiCustomFieldValue: "ai:custom-field-value",
	AiImageGenerate: "ai:image-generate",
	AiAltGenerate: "ai:alt-generate",

	// Integration permissions
	IntegrationRead: "integrations:read",
	IntegrationCreate: "integrations:create",
	IntegrationUpdate: "integrations:update",
	IntegrationDelete: "integrations:delete",
	IntegrationRegenerate: "integrations:regenerate",

	// Settings permissions
	SettingsRead: "settings:read",
	SettingsUpdate: "settings:update",
	ConnectionUpdate: "connection:update",
	CacheClear: "cache:clear",
} as const;

export const PermissionGroups = Object.freeze({
	users: {
		key: "users_permissions",
		details: {
			name: copy("admin:core.permissions.user.permissions", {
				defaultMessage: "Users",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.UsersRead,
				details: {
					name: copy("admin:core.permissions.read.users", {
						defaultMessage: "Read",
					}),
				},
				core: true,
			},
			{
				key: Permissions.UsersCreate,
				details: {
					name: copy("admin:core.permissions.create.users", {
						defaultMessage: "Create",
					}),
				},
				core: true,
			},
			{
				key: Permissions.UsersUpdate,
				details: {
					name: copy("admin:core.permissions.update.users", {
						defaultMessage: "Update",
					}),
				},
				core: true,
			},
			{
				key: Permissions.UsersDelete,
				details: {
					name: copy("admin:core.permissions.delete.users", {
						defaultMessage: "Delete",
					}),
				},
				core: true,
			},
		],
	},
	roles: {
		key: "roles_permissions",
		details: {
			name: copy("admin:core.permissions.role.permissions", {
				defaultMessage: "Roles",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.RolesRead,
				details: {
					name: copy("admin:core.permissions.read.roles", {
						defaultMessage: "Read",
					}),
				},
				core: true,
			},
			{
				key: Permissions.RolesCreate,
				details: {
					name: copy("admin:core.permissions.create.roles", {
						defaultMessage: "Create",
					}),
				},
				core: true,
			},
			{
				key: Permissions.RolesUpdate,
				details: {
					name: copy("admin:core.permissions.update.roles", {
						defaultMessage: "Update",
					}),
				},
				core: true,
			},
			{
				key: Permissions.RolesDelete,
				details: {
					name: copy("admin:core.permissions.delete.roles", {
						defaultMessage: "Delete",
					}),
				},
				core: true,
			},
		],
	},
	media: {
		key: "media_permissions",
		details: {
			name: copy("admin:core.permissions.media.permissions", {
				defaultMessage: "Media",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.MediaRead,
				details: {
					name: copy("admin:core.permissions.read.media", {
						defaultMessage: "Read",
					}),
				},
				core: true,
			},
			{
				key: Permissions.MediaCreate,
				details: {
					name: copy("admin:core.permissions.create.media", {
						defaultMessage: "Create",
					}),
				},
				core: true,
			},
			{
				key: Permissions.MediaUpdate,
				details: {
					name: copy("admin:core.permissions.update.media", {
						defaultMessage: "Update",
					}),
				},
				core: true,
			},
			{
				key: Permissions.MediaDelete,
				details: {
					name: copy("admin:core.permissions.delete.media", {
						defaultMessage: "Delete",
					}),
				},
				core: true,
			},
			{
				key: Permissions.MediaReadAll,
				details: {
					name: copy("admin:core.permissions.read.all.media", {
						defaultMessage: "Read All",
					}),
					description: copy(
						"admin:core.permissions.read.all.media.description",
						{
							defaultMessage:
								"View every user's personal files, such as agent chat uploads, and files managed by the system. Combine with Delete Media to remove them.",
						},
					),
				},
				core: true,
			},
		],
	},
	ai: {
		key: "ai_permissions",
		details: {
			name: copy("admin:core.permissions.ai.permissions", {
				defaultMessage: "AI",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.AiCustomFieldValue,
				details: {
					name: copy("admin:core.permissions.custom.field.value", {
						defaultMessage: "Generate Field Values",
					}),
				},
				core: true,
			},
			{
				key: Permissions.AiImageGenerate,
				details: {
					name: copy("admin:core.permissions.image.generate", {
						defaultMessage: "Generate Images",
					}),
				},
				core: true,
			},
			{
				key: Permissions.AiAltGenerate,
				details: {
					name: copy("admin:core.permissions.alt.generate", {
						defaultMessage: "Generate Alt Text",
					}),
				},
				core: true,
			},
		],
	},
	emails: {
		key: "emails_permissions",
		details: {
			name: copy("admin:core.permissions.email.permissions", {
				defaultMessage: "Emails",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.EmailRead,
				details: {
					name: copy("admin:core.permissions.read.emails", {
						defaultMessage: "Read",
					}),
				},
				core: true,
			},
			{
				key: Permissions.EmailDelete,
				details: {
					name: copy("admin:core.permissions.delete.emails", {
						defaultMessage: "Delete",
					}),
				},
				core: true,
			},
			{
				key: Permissions.EmailSend,
				details: {
					name: copy("admin:core.permissions.send.emails", {
						defaultMessage: "Send",
					}),
				},
				core: true,
			},
		],
	},
	jobs: {
		key: "jobs_permissions",
		details: {
			name: copy("admin:core.permissions.jobs.permissions", {
				defaultMessage: "Jobs",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.JobsRead,
				details: {
					name: copy("admin:core.permissions.read.jobs", {
						defaultMessage: "Read",
					}),
				},
				core: true,
			},
			{
				key: Permissions.JobsRun,
				details: {
					name: copy("admin:core.permissions.run.jobs", {
						defaultMessage: "Run",
					}),
				},
				core: true,
			},
			{
				key: Permissions.JobsUpdate,
				details: {
					name: copy("admin:core.permissions.update.jobs", {
						defaultMessage: "Update Schedules",
					}),
				},
				core: true,
			},
		],
	},
	requests: {
		key: "request_permissions",
		details: {
			name: copy("admin:permissions.groups.requests"),
		},
		core: true,
		permissions: [
			{
				key: Permissions.RequestsRead,
				details: {
					name: copy("admin:permissions.requests.read"),
				},
				core: true,
			},
		],
	},
	integrations: {
		key: "integrations_permissions",
		details: {
			name: copy("admin:core.permissions.integrations.permissions", {
				defaultMessage: "Integrations",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.IntegrationRead,
				details: {
					name: copy("admin:core.permissions.read.integrations", {
						defaultMessage: "Read",
					}),
				},
				core: true,
			},
			{
				key: Permissions.IntegrationCreate,
				details: {
					name: copy("admin:core.permissions.create.integrations", {
						defaultMessage: "Create",
					}),
				},
				core: true,
			},
			{
				key: Permissions.IntegrationUpdate,
				details: {
					name: copy("admin:core.permissions.update.integrations", {
						defaultMessage: "Update",
					}),
				},
				core: true,
			},
			{
				key: Permissions.IntegrationDelete,
				details: {
					name: copy("admin:core.permissions.delete.integrations", {
						defaultMessage: "Delete",
					}),
				},
				core: true,
			},
			{
				key: Permissions.IntegrationRegenerate,
				details: {
					name: copy("admin:core.permissions.regenerate.api.keys", {
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
			name: copy("admin:core.permissions.setting.permissions", {
				defaultMessage: "Settings",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.SettingsRead,
				details: {
					name: copy("admin:core.permissions.read.settings", {
						defaultMessage: "Read",
					}),
				},
				core: true,
			},
			{
				key: Permissions.SettingsUpdate,
				details: {
					name: copy("admin:core.permissions.update.settings", {
						defaultMessage: "Update",
					}),
				},
				core: true,
			},
			{
				key: Permissions.ConnectionUpdate,
				details: {
					name: copy("admin:core.permissions.update.connection", {
						defaultMessage: "Update Connection",
					}),
				},
				core: true,
			},
			{
				key: Permissions.CacheClear,
				details: {
					name: copy("admin:core.permissions.clear.cache", {
						defaultMessage: "Clear Cache",
					}),
				},
				core: true,
			},
		],
	},
}) satisfies Record<string, PermissionGroup>;
