import { Navigate } from "@solidjs/router";
import type { PermissionRequirement } from "@types";
import { type Component, createMemo, type JSXElement, Show } from "solid-js";
import userStore from "@/store/userStore/userStore";

interface PermissionGuardProps {
	permission: PermissionRequirement;
	fallback?: JSXElement;
	children: JSXElement;
}

/** Renders children while the reactive requirement is met; otherwise redirects home. */
const PermissionGuard: Component<PermissionGuardProps> = (props) => {
	// ----------------------------------------
	// Memos
	const hasPermission = createMemo(() =>
		userStore.get.meetsRequirement(props.permission),
	);

	// ----------------------------------------
	// Render
	return (
		<Show
			when={hasPermission()}
			fallback={props.fallback ?? <Navigate href="/admin" />}
		>
			{props.children}
		</Show>
	);
};

export default PermissionGuard;
