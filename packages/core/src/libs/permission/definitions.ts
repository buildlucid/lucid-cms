import type { PermissionGroup } from "./types.js";

export const Permissions = {
	// User permissions
	UserCreateSingle: "create_user",
	UserUpdateSingle: "update_user",
	UserDeleteSingle: "delete_user",

	// Role permissions
	RoleCreateSingle: "create_role",
	RoleUpdateSingle: "update_role",
	RoleDeleteSingle: "delete_role",

	// Media permissions
	MediaCreateSingle: "create_media",
	MediaUpdateSingle: "update_media",
	MediaDeleteSingle: "delete_media",

	// Email permissions
	EmailReadSingle: "read_email",
	EmailDeleteSingle: "delete_email",
	EmailSendSingle: "send_email",

	// Job permissions
	JobReadSingle: "read_job",

	// Content permissions
	ContentCreateSingle: "create_content",
	ContentUpdateSingle: "update_content",
	ContentDeleteSingle: "delete_content",
	ContentRestoreSingle: "restore_content",
	ContentPublishSingle: "publish_content",

	// Collection permissions
	CollectionCreateSingle: "create_collection",
	CollectionUpdateSingle: "update_collection",
	CollectionDeleteSingle: "delete_collection",

	// Client integration permissions
	ClientIntegrationCreateSingle: "create_client_integration",
	ClientIntegrationUpdateSingle: "update_client_integration",
	ClientIntegrationDeleteSingle: "delete_client_integration",
	ClientIntegrationRegenerateSingle: "regenerate_client_integration",

	// Settings permissions
	SettingsUpdateLicense: "update_license",
	SettingsClearKv: "clear_kv",
} as const;

export const PermissionGroups = Object.freeze({
	users: {
		key: "users_permissions",
		permissions: [
			Permissions.UserCreateSingle,
			Permissions.UserUpdateSingle,
			Permissions.UserDeleteSingle,
		],
	},
	roles: {
		key: "roles_permissions",
		permissions: [
			Permissions.RoleCreateSingle,
			Permissions.RoleUpdateSingle,
			Permissions.RoleDeleteSingle,
		],
	},
	media: {
		key: "media_permissions",
		permissions: [
			Permissions.MediaCreateSingle,
			Permissions.MediaUpdateSingle,
			Permissions.MediaDeleteSingle,
		],
	},
	emails: {
		key: "emails_permissions",
		permissions: [
			Permissions.EmailReadSingle,
			Permissions.EmailDeleteSingle,
			Permissions.EmailSendSingle,
		],
	},
	jobs: {
		key: "jobs_permissions",
		permissions: [Permissions.JobReadSingle],
	},
	content: {
		key: "content_permissions",
		permissions: [
			Permissions.ContentCreateSingle,
			Permissions.ContentUpdateSingle,
			Permissions.ContentDeleteSingle,
			Permissions.ContentRestoreSingle,
			Permissions.ContentPublishSingle,
		],
	},
	"client-integrations": {
		key: "client-integrations_permissions",
		permissions: [
			Permissions.ClientIntegrationCreateSingle,
			Permissions.ClientIntegrationUpdateSingle,
			Permissions.ClientIntegrationDeleteSingle,
			Permissions.ClientIntegrationRegenerateSingle,
		],
	},
	settings: {
		key: "settings_permissions",
		permissions: [
			Permissions.SettingsUpdateLicense,
			Permissions.SettingsClearKv,
		],
	},
}) satisfies Record<string, PermissionGroup>;
