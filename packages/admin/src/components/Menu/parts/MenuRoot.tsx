import { DropdownMenu as KobalteMenu } from "@kobalte/core";
import type { Component, JSXElement } from "solid-js";

/** Where the menu opens relative to its trigger. */
export type MenuPlacement =
	| "top"
	| "top-start"
	| "top-end"
	| "bottom"
	| "bottom-start"
	| "bottom-end";

export interface MenuRootProps {
	/** Takes the open state over. The menu manages its own otherwise. */
	open?: boolean;
	onOpenChange?: (_open: boolean) => void;
	/** @default "bottom-start" */
	placement?: MenuPlacement;
	/** Space between the trigger and the menu, in pixels. */
	gutter?: number;
	children: JSXElement;
}

/** Holds a trigger and the menu it opens. */
const MenuRoot: Component<MenuRootProps> = (props) => {
	// ----------------------------------------
	// State
	let lastAnchorRect: DOMRectInit | undefined;

	// ----------------------------------------
	// Functions
	//* a trigger that is mid-transition can measure as zero, which would park
	//* the menu in the top corner - the last real measurement stands in
	const getAnchorRect = (anchor?: HTMLElement) => {
		const rect = anchor?.getBoundingClientRect();

		if (rect && rect.width > 0 && rect.height > 0) {
			lastAnchorRect = {
				x: rect.x,
				y: rect.y,
				width: rect.width,
				height: rect.height,
			};
		}

		return lastAnchorRect;
	};

	// ----------------------------------------
	// Render
	return (
		<KobalteMenu.Root
			open={props.open}
			onOpenChange={props.onOpenChange}
			placement={props.placement}
			gutter={props.gutter}
			getAnchorRect={getAnchorRect}
		>
			{props.children}
		</KobalteMenu.Root>
	);
};

export default MenuRoot;
