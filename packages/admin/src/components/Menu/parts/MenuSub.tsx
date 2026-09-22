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
	/** The row that opens the nested menu. */
	label: string;
	/** Before the label. */
	icon?: JSXElement;
	/** Against the right edge, for the value the nested menu is set to. */
	end?: JSXElement;
	variant?: MenuItemVariant;
	disabled?: boolean;
	/** Dims the row without stopping it opening. */
	unavailable?: boolean;
	/** Applied to the row that opens it. */
	class?: string;
	children: JSXElement;
}

/** A row that opens a nested menu beside it. */
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
