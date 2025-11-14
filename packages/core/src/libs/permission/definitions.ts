import type { PermissionGroup } from "./types.js";

export const Permissions = {
	// User permissions
	ReadUser: "read_user",
	CreateUser: "create_user",
	UpdateUser: "update_user",
	DeleteUser: "delete_user",

	// Role permissions
	ReadRole: "read_role",
	CreateRole: "create_role",
	UpdateRole: "update_role",
	DeleteRole: "delete_role",

	// Media permissions
	ReadMedia: "read_media",
	CreateMedia: "create_media",
	UpdateMedia: "update_media",
	DeleteMedia: "delete_media",

	// Email permissions
	ReadEmail: "read_email",
	DeleteEmail: "delete_email",
	SendEmail: "send_email",

	// Job permissions
	ReadJob: "read_job",

	// Content permissions
	ReadContent: "read_content",
	CreateContent: "create_content",
	UpdateContent: "update_content",
	DeleteContent: "delete_content",
	RestoreContent: "restore_content",
	PublishContent: "publish_content",

	// Client integration permissions
	ReadClientIntegration: "read_client_integration",
	CreateClientIntegration: "create_client_integration",
	UpdateClientIntegration: "update_client_integration",
	DeleteClientIntegration: "delete_client_integration",
	RegenerateClientIntegration: "regenerate_client_integration",

	// Settings permissions
	UpdateLicense: "update_license",
	ClearKv: "clear_kv",
} as const;

export const PermissionGroups = Object.freeze({
	users: {
		key: "users_permissions",
		permissions: [
			Permissions.ReadUser,
			Permissions.CreateUser,
			Permissions.UpdateUser,
			Permissions.DeleteUser,
		],
	},
	roles: {
		key: "roles_permissions",
		permissions: [
			Permissions.ReadRole,
			Permissions.CreateRole,
			Permissions.UpdateRole,
			Permissions.DeleteRole,
		],
	},
	media: {
		key: "media_permissions",
		permissions: [
			Permissions.ReadMedia,
			Permissions.CreateMedia,
			Permissions.UpdateMedia,
			Permissions.DeleteMedia,
		],
	},
	emails: {
		key: "emails_permissions",
		permissions: [
			Permissions.ReadEmail,
			Permissions.DeleteEmail,
			Permissions.SendEmail,
		],
	},
	jobs: {
		key: "jobs_permissions",
		permissions: [Permissions.ReadJob],
	},
	content: {
		key: "content_permissions",
		permissions: [
			Permissions.ReadContent,
			Permissions.CreateContent,
			Permissions.UpdateContent,
			Permissions.DeleteContent,
			Permissions.RestoreContent,
			Permissions.PublishContent,
		],
	},
	"client-integrations": {
		key: "client_integrations_permissions",
		permissions: [
			Permissions.ReadClientIntegration,
			Permissions.CreateClientIntegration,
			Permissions.UpdateClientIntegration,
			Permissions.DeleteClientIntegration,
			Permissions.RegenerateClientIntegration,
		],
	},
	settings: {
		key: "settings_permissions",
		permissions: [Permissions.UpdateLicense, Permissions.ClearKv],
	},
}) satisfies Record<string, PermissionGroup>;
