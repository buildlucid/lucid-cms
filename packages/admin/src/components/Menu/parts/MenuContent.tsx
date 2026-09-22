import { DropdownMenu as KobalteMenu } from "@kobalte/core";
import classNames from "classnames";
import { type Component, createMemo, type JSXElement } from "solid-js";
import { MenuContext } from "@/components/Menu/MenuContext";
import { menuPanelClasses } from "@/components/Menu/panelClasses";
import { useLayer } from "@/hooks/useLayer/useLayer";

export interface MenuContentProps {
	matchTriggerWidth?: boolean;
	/** Limits the height and scrolls the items. */
	scrollable?: boolean;
	/** Shows lines between items. @default true */
	dividers?: boolean;
	class?: string;
	children: JSXElement;
}

/** The menu panel that holds the items. */
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
						{ "max-h-60 overflow-y-auto": props.scrollable },
						props.class,
					)}
					style={{
						width: props.matchTriggerWidth
							? "var(--kb-popper-anchor-width)"
							: undefined,
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
