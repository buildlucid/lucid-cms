import { DropdownMenu as KobalteMenu } from "@kobalte/core";
import type { Component, JSXElement } from "solid-js";

export type MenuPlacement =
	| "top"
	| "top-start"
	| "top-end"
	| "bottom"
	| "bottom-start"
	| "bottom-end";

export interface MenuRootProps {
	/** Controls the open state. */
	open?: boolean;
	onOpenChange?: (_open: boolean) => void;
	/** @default "bottom-start" */
	placement?: MenuPlacement;
	/** Space between the trigger and the menu, in pixels. @default 8 */
	gutter?: number;
	children: JSXElement;
}

/** Holds the menu's trigger and content. */
const MenuRoot: Component<MenuRootProps> = (props) => {
	// ----------------------------------------
	// State
	let lastAnchorRect: DOMRectInit | undefined;

	// ----------------------------------------
	// Functions
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
			gutter={props.gutter ?? 8}
			getAnchorRect={getAnchorRect}
		>
			{props.children}
		</KobalteMenu.Root>
	);
};

export default MenuRoot;
