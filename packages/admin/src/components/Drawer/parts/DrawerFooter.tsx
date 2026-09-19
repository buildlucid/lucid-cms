import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";
import { useDrawerContext } from "../DrawerContext";

export interface DrawerFooterProps {
	class?: string;
	children: JSXElement;
}

/**
 * Bottom bar of the drawer. Children sit on the left, so put status or error
 * messages here and wrap buttons in Drawer.Actions to push them right.
 *
 * @example
 * ```tsx
 * import { Button, Drawer } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Drawer.Footer>
 * 		<ErrorMessage theme="basic" message={save.errors()?.message} />
 * 		<Drawer.Actions>
 * 			<Button type="submit" loading={save.isPending}>Save</Button>
 * 		</Drawer.Actions>
 * 	</Drawer.Footer>
 * );
 * ```
 */
export const DrawerFooter: Component<DrawerFooterProps> = (props) => {
	// ------------------------------
	// State & Hooks
	const { padding } = useDrawerContext();

	// ------------------------------
	// Render
	return (
		<div
			data-drawer-footer
			class={classNames(
				"mt-4 md:mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card-base py-4 md:py-6",
				{
					"px-4": padding() === "sm",
					"px-4 md:px-6": padding() === "md",
				},
				props.class,
			)}
		>
			{props.children}
		</div>
	);
};
