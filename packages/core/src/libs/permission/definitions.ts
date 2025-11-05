import type { PermissionGroup } from "./types.js";

export const Permissions = {
	// User permissions
	CreateUser: "create_user",
	UpdateUser: "update_user",
	DeleteUser: "delete_user",

	// Role permissions
	CreateRole: "create_role",
	UpdateRole: "update_role",
	DeleteRole: "delete_role",

	// Media permissions
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
	CreateContent: "create_content",
	UpdateContent: "update_content",
	DeleteContent: "delete_content",
	RestoreContent: "restore_content",
	PublishContent: "publish_content",

	// Collection permissions
	CreateCollection: "create_collection",
	UpdateCollection: "update_collection",
	DeleteCollection: "delete_collection",

	// Client integration permissions
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
			Permissions.CreateUser,
			Permissions.UpdateUser,
			Permissions.DeleteUser,
		],
	},
	roles: {
		key: "roles_permissions",
		permissions: [
			Permissions.CreateRole,
			Permissions.UpdateRole,
			Permissions.DeleteRole,
		],
	},
	media: {
		key: "media_permissions",
		permissions: [
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
			Permissions.CreateContent,
			Permissions.UpdateContent,
			Permissions.DeleteContent,
			Permissions.RestoreContent,
			Permissions.PublishContent,
		],
	},
	"client-integrations": {
		key: "client-integrations_permissions",
		permissions: [
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
