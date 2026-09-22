import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";
import { useDrawerContext } from "../DrawerContext";

export interface DrawerBodyProps {
	class?: string;
	children: JSXElement;
}

/** The drawer's main content. */
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
