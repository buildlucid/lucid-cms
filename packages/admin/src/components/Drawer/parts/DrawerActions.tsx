import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface DrawerActionsProps {
	class?: string;
	children: JSXElement;
}

/**
 * Right hand button cluster inside Drawer.Footer. It always sits against the
 * right edge, whether or not the footer has content on the left.
 *
 * @example
 * ```tsx
 * import { Button, Drawer } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Drawer.Actions>
 * 		<Button variant="outline" onClick={close}>Close</Button>
 * 		<Button type="submit">Save</Button>
 * 	</Drawer.Actions>
 * );
 * ```
 */
export const DrawerActions: Component<DrawerActionsProps> = (props) => {
	// ------------------------------
	// Render
	return (
		<div
			data-drawer-actions
			class={classNames(
				"ml-auto flex min-w-max flex-wrap items-center gap-2",
				props.class,
			)}
		>
			{props.children}
		</div>
	);
};
