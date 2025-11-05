import type { PermissionGroup } from "../permission/types.js";

export default class PermissionsFormatter {
	formatMultiple = (props: {
		permissions: Record<string, PermissionGroup>;
	}): PermissionGroup[] => {
		return Object.values(props.permissions);
	};
}
