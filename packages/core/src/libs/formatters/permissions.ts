import type { PermissionGroup } from "../permission/types.js";

const formatMultiple = (props: {
	permissions: Record<string, PermissionGroup>;
}): PermissionGroup[] => {
	return Object.values(props.permissions);
};

export default {
	formatMultiple,
};
