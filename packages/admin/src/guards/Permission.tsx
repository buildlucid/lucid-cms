import { Navigate } from "@solidjs/router";
import type { Permission } from "@types";
import { type Component, createMemo, type JSXElement } from "solid-js";
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

	return props.fallback ?? <Navigate href="/lucid" />;
};

export default PermissionGuard;
