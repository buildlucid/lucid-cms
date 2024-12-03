import type { PermissionGroup } from "../../types/response.js";

export default class PermissionsFormatter {
	formatMultiple = (props: {
		permissions: Record<string, PermissionGroup>;
	}): PermissionGroup[] => {
		return Object.values(props.permissions);
	};
}
