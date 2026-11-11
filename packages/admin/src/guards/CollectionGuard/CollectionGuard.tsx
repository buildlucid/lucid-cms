import { useParams } from "@solidjs/router";
import type { Component, JSXElement } from "solid-js";
import { getCollectionPermission } from "@/constants/permissions";
import PermissionGuard from "@/guards/PermissionGuard/PermissionGuard";

/** Shows a collection's pages only to users who can read the collection in the route, and sends others home. */
const CollectionGuard: Component<{ children: JSXElement }> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const params = useParams();

	// ----------------------------------------
	// Render
	return (
		<PermissionGuard
			permission={getCollectionPermission(params.collectionKey ?? "", "read")}
		>
			{props.children}
		</PermissionGuard>
	);
};

export default CollectionGuard;
