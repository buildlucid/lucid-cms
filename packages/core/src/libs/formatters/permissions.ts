import type { PermissionGroup } from "../permission/types.js";

const formatMultiple = (props: {
	permissions: PermissionGroup[] | Record<string, PermissionGroup>;
}): PermissionGroup[] => {
	return Array.isArray(props.permissions)
		? props.permissions
		: Object.values(props.permissions);
};

export default {
	formatMultiple,
};
