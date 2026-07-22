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

	// Email permissions
	EmailRead: "email:read",
	EmailDelete: "email:delete",
	EmailSend: "email:send",

	// Job permissions
	JobsRead: "jobs:read",

	// Publish operation permissions
	PublishOperationsRead: "publish-operations:read",

	// AI permissions
	AiCustomFieldValue: "ai:custom-field-value",
	AiImageGenerate: "ai:image-generate",
	AiAltGenerate: "ai:alt-generate",

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

export const PermissionGroups = Object.freeze({
	users: {
		key: "users_permissions",
		details: {
			name: copy("admin:core.permissions.user.permissions", {
				defaultMessage: "User Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.UsersRead,
				details: {
					name: copy("admin:core.permissions.read.users", {
						defaultMessage: "Read Users",
					}),
				},
				core: true,
			},
			{
				key: Permissions.UsersCreate,
				details: {
					name: copy("admin:core.permissions.create.users", {
						defaultMessage: "Create Users",
					}),
				},
				core: true,
			},
			{
				key: Permissions.UsersUpdate,
				details: {
					name: copy("admin:core.permissions.update.users", {
						defaultMessage: "Update Users",
					}),
				},
				core: true,
			},
			{
				key: Permissions.UsersDelete,
				details: {
					name: copy("admin:core.permissions.delete.users", {
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
			name: copy("admin:core.permissions.role.permissions", {
				defaultMessage: "Role Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.RolesRead,
				details: {
					name: copy("admin:core.permissions.read.roles", {
						defaultMessage: "Read Roles",
					}),
				},
				core: true,
			},
			{
				key: Permissions.RolesCreate,
				details: {
					name: copy("admin:core.permissions.create.roles", {
						defaultMessage: "Create Roles",
					}),
				},
				core: true,
			},
			{
				key: Permissions.RolesUpdate,
				details: {
					name: copy("admin:core.permissions.update.roles", {
						defaultMessage: "Update Roles",
					}),
				},
				core: true,
			},
			{
				key: Permissions.RolesDelete,
				details: {
					name: copy("admin:core.permissions.delete.roles", {
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
			name: copy("admin:core.permissions.media.permissions", {
				defaultMessage: "Media Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.MediaRead,
				details: {
					name: copy("admin:core.permissions.read.media", {
						defaultMessage: "Read Media",
					}),
				},
				core: true,
			},
			{
				key: Permissions.MediaCreate,
				details: {
					name: copy("admin:core.permissions.create.media", {
						defaultMessage: "Create Media",
					}),
				},
				core: true,
			},
			{
				key: Permissions.MediaUpdate,
				details: {
					name: copy("admin:core.permissions.update.media", {
						defaultMessage: "Update Media",
					}),
				},
				core: true,
			},
			{
				key: Permissions.MediaDelete,
				details: {
					name: copy("admin:core.permissions.delete.media", {
						defaultMessage: "Delete Media",
					}),
				},
				core: true,
			},
		],
	},
	ai: {
		key: "ai_permissions",
		details: {
			name: copy("admin:core.permissions.ai.permissions", {
				defaultMessage: "AI Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.AiCustomFieldValue,
				details: {
					name: copy("admin:core.permissions.custom.field.value", {
						defaultMessage: "Custom Field Value",
					}),
				},
				core: true,
			},
			{
				key: Permissions.AiImageGenerate,
				details: {
					name: copy("admin:core.permissions.image.generate", {
						defaultMessage: "Image Generate",
					}),
				},
				core: true,
			},
			{
				key: Permissions.AiAltGenerate,
				details: {
					name: copy("admin:core.permissions.alt.generate", {
						defaultMessage: "Alt Generate",
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
				defaultMessage: "Email Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.EmailRead,
				details: {
					name: copy("admin:core.permissions.read.emails", {
						defaultMessage: "Read Emails",
					}),
				},
				core: true,
			},
			{
				key: Permissions.EmailDelete,
				details: {
					name: copy("admin:core.permissions.delete.emails", {
						defaultMessage: "Delete Emails",
					}),
				},
				core: true,
			},
			{
				key: Permissions.EmailSend,
				details: {
					name: copy("admin:core.permissions.send.emails", {
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
			name: copy("admin:core.permissions.jobs.permissions", {
				defaultMessage: "Jobs Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.JobsRead,
				details: {
					name: copy("admin:core.permissions.read.jobs", {
						defaultMessage: "Read Jobs",
					}),
				},
				core: true,
			},
		],
	},
	"publish-operations": {
		key: "publish_operations_permissions",
		details: {
			name: copy("admin:permissions.groups.publish.operations"),
		},
		core: true,
		permissions: [
			{
				key: Permissions.PublishOperationsRead,
				details: {
					name: copy("admin:permissions.publish.operations.read"),
				},
				core: true,
			},
		],
	},
	"client-integrations": {
		key: "client_integrations_permissions",
		details: {
			name: copy("admin:core.permissions.integrations.permissions", {
				defaultMessage: "Integrations Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.IntegrationRead,
				details: {
					name: copy("admin:core.permissions.read.integrations", {
						defaultMessage: "Read Integrations",
					}),
				},
				core: true,
			},
			{
				key: Permissions.IntegrationCreate,
				details: {
					name: copy("admin:core.permissions.create.integrations", {
						defaultMessage: "Create Integrations",
					}),
				},
				core: true,
			},
			{
				key: Permissions.IntegrationUpdate,
				details: {
					name: copy("admin:core.permissions.update.integrations", {
						defaultMessage: "Update Integrations",
					}),
				},
				core: true,
			},
			{
				key: Permissions.IntegrationDelete,
				details: {
					name: copy("admin:core.permissions.delete.integrations", {
						defaultMessage: "Delete Integrations",
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
				defaultMessage: "Setting Permissions",
			}),
		},
		core: true,
		permissions: [
			{
				key: Permissions.SettingsRead,
				details: {
					name: copy("admin:core.permissions.read.settings", {
						defaultMessage: "Read Settings",
					}),
				},
				core: true,
			},
			{
				key: Permissions.SettingsUpdate,
				details: {
					name: copy("admin:core.permissions.update.settings", {
						defaultMessage: "Update Settings",
					}),
				},
				core: true,
			},
			{
				key: Permissions.LicenseUpdate,
				details: {
					name: copy("admin:core.permissions.update.license", {
						defaultMessage: "Update License",
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
