import { DropdownMenu as KobalteMenu } from "@kobalte/core";
import classNames from "classnames";
import { FaSolidChevronRight } from "solid-icons/fa";
import { type Component, type JSXElement, Show } from "solid-js";
import {
	type MenuItemVariant,
	menuItemClasses,
} from "@/components/Menu/itemClasses";
import { useMenuContext } from "@/components/Menu/MenuContext";
import { menuPanelClasses } from "@/components/Menu/panelClasses";
import { useLayer } from "@/hooks/useLayer/useLayer";

export interface MenuSubProps {
	label: string;
	icon?: JSXElement;
	/** Content shown at the end of the trigger, such as the current value. */
	end?: JSXElement;
	variant?: MenuItemVariant;
	disabled?: boolean;
	/** Looks disabled but can still be opened. */
	unavailable?: boolean;
	/** Applied to the trigger. */
	class?: string;
	children: JSXElement;
}

/** A nested menu, opened from an item in the parent menu. */
const MenuSub: Component<MenuSubProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const layer = useLayer();
	const menu = useMenuContext();

	// ----------------------------------------
	// Render
	return (
		<KobalteMenu.Sub>
			<KobalteMenu.SubTrigger
				data-menu-row
				data-menu-sub-trigger
				textValue={props.label}
				disabled={props.disabled}
				onClick={(event) => event.stopPropagation()}
				class={menuItemClasses(props)}
			>
				<Show when={props.icon}>{props.icon}</Show>
				<span class="line-clamp-1 mr-2.5 flex-1">{props.label}</span>
				<Show when={props.end}>{props.end}</Show>
				<FaSolidChevronRight size={14} />
			</KobalteMenu.SubTrigger>
			<KobalteMenu.Portal>
				<KobalteMenu.SubContent
					data-menu-sub-content
					data-drawer-ignore
					class={classNames("ml-1", menuPanelClasses(menu.dividers()))}
					style={{ "z-index": layer ? layer() + 1 : undefined }}
				>
					{props.children}
				</KobalteMenu.SubContent>
			</KobalteMenu.Portal>
		</KobalteMenu.Sub>
	);
};

export default MenuSub;
