import { type Component, type JSXElement, createMemo } from "solid-js";
import { Navigate } from "@solidjs/router";
import type { Permission } from "@types";
import userStore from "@/store/userStore";

interface PermissionGuardProps {
	permission: Permission | Permission[];
	fallback?: JSXElement;
	children: JSXElement;
}

const PermissionGuard: Component<PermissionGuardProps> = (props) => {
	const hasPermission = createMemo(() => {
		const requirements = Array.isArray(props.permission)
			? props.permission
			: [props.permission];

		return userStore.get.hasPermission(requirements).all;
	});

	if (hasPermission()) return props.children;

	return props.fallback ?? <Navigate href="/admin" />;
};

export default PermissionGuard;
