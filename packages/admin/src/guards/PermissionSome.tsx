import { Navigate } from "@solidjs/router";
import type { Permission } from "@types";
import { type Component, createMemo, type JSXElement } from "solid-js";
import userStore from "@/store/userStore";

interface PermissionSomeGuardProps {
	permission: Permission | Permission[];
	fallback?: JSXElement;
	children: JSXElement;
}

const PermissionSomeGuard: Component<PermissionSomeGuardProps> = (props) => {
	// ----------------------------------------
	// Memos
	const hasPermission = createMemo(() => {
		const requirements = Array.isArray(props.permission)
			? props.permission
			: [props.permission];

		return userStore.get.hasPermission(requirements).some;
	});

	// ----------------------------------------
	// Render
	if (hasPermission()) return props.children;

	return props.fallback ?? <Navigate href="/lucid" />;
};

export default PermissionSomeGuard;
