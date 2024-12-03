import type { PermissionGroup } from "../../types/response.js";

export default class PermissionsFormatter {
	formatMultiple = (props: {
		permissions: Record<string, PermissionGroup>;
	}): PermissionGroup[] => {
		return Object.values(props.permissions);
	};
	static swagger = {
		type: "object",
		properties: {
			key: {
				type: "string",
				example: "users_permissions",
			},
			permissions: {
				type: "array",
				example: ["create_user", "update_user", "delete_user"],
			},
		},
	};
}
