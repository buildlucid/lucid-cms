import type { PermissionGroupKey, PermissionGroup } from "../types/response.js";

const permissionGroups: Record<PermissionGroupKey, PermissionGroup> =
	Object.freeze({
		users: {
			key: "users_permissions",
			permissions: ["create_user", "update_user", "delete_user"],
		},
		roles: {
			key: "roles_permissions",
			permissions: ["create_role", "update_role", "delete_role"],
		},
		media: {
			key: "media_permissions",
			permissions: ["create_media", "update_media", "delete_media"],
		},
		emails: {
			key: "emails_permissions",
			permissions: ["read_email", "delete_email", "send_email"],
		},
		content: {
			key: "content_permissions",
			permissions: [
				"create_content",
				"update_content",
				"delete_content",
				"restore_content",
				"publish_content",
			],
		},
		"client-integrations": {
			key: "client-integrations_permissions",
			permissions: [
				"create_client_integration",
				"update_client_integration",
				"delete_client_integration",
				"regenerate_client_integration",
			],
		},
	});

export default permissionGroups;
