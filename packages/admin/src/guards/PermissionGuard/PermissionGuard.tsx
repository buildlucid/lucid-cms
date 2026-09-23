import { Navigate } from "@solidjs/router";
import type { PermissionRequirement } from "@types";
import { type Component, createMemo, type JSXElement } from "solid-js";
import userStore from "@/store/userStore/userStore";

interface PermissionGuardProps {
	permission: PermissionRequirement;
	fallback?: JSXElement;
	children: JSXElement;
}

const PermissionGuard: Component<PermissionGuardProps> = (props) => {
	const hasPermission = createMemo(() =>
		userStore.get.meetsRequirement(props.permission),
	);

	if (hasPermission()) return props.children;

	return props.fallback ?? <Navigate href="/lucid" />;
};

export default PermissionGuard;
