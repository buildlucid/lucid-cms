import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";
import { useDrawerContext } from "../DrawerContext";

export interface DrawerBodyProps {
	class?: string;
	children: JSXElement;
}

/**
 * Main content region of the drawer. It fills the space left between the
 * header and the footer, and its padding follows the padding set on
 * Drawer.Root.
 *
 * @example
 * ```tsx
 * import { Drawer } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Drawer.Body>
 * 		<Input id="name" name="name" type="text" label="Name" value={name()} onChange={setName} />
 * 	</Drawer.Body>
 * );
 * ```
 */
export const DrawerBody: Component<DrawerBodyProps> = (props) => {
	// ------------------------------
	// State & Hooks
	const { padding } = useDrawerContext();

	// ------------------------------
	// Render
	return (
		<div
			data-drawer-body
			class={classNames(
				"grow",
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
