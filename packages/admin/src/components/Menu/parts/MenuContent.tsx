import { DropdownMenu as KobalteMenu } from "@kobalte/core";
import classNames from "classnames";
import { type Component, createMemo, type JSXElement } from "solid-js";
import { MenuContext } from "@/components/Menu/MenuContext";
import { menuPanelClasses } from "@/components/Menu/panelClasses";
import { useLayer } from "@/hooks/useLayer/useLayer";

export interface MenuContentProps {
	/** Widens the menu to match its trigger. */
	matchTriggerWidth?: boolean;
	/** Caps the height and scrolls the items inside it. */
	scrollable?: boolean;
	/** Closes the gap between the trigger and the menu. */
	flush?: boolean;
	/**
	 * Draws a hairline between the rows. Turn it off for a list of like
	 * things, such as a long run of options. @default true
	 */
	dividers?: boolean;
	/** Applied to the menu panel. */
	class?: string;
	children: JSXElement;
}

/** The panel the items sit in. */
const MenuContent: Component<MenuContentProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const layer = useLayer();
	const dividers = createMemo(() => props.dividers ?? true);

	// ----------------------------------------
	// Render
	return (
		<MenuContext.Provider value={{ dividers }}>
			<KobalteMenu.Portal>
				<KobalteMenu.Content
					data-menu-content
					data-drawer-ignore
					class={classNames(
						menuPanelClasses(dividers()),
						{
							"max-h-60 overflow-y-auto": props.scrollable,
							"mt-2": !props.flush,
						},
						props.class,
					)}
					style={{
						width: props.matchTriggerWidth
							? "var(--kb-popper-anchor-width)"
							: undefined,
						//* an overlay's own layer keeps whatever it opens above it
						"z-index": layer ? layer() + 1 : undefined,
					}}
				>
					{props.children}
				</KobalteMenu.Content>
			</KobalteMenu.Portal>
		</MenuContext.Provider>
	);
};

export default MenuContent;
