import { type Accessor, createContext, useContext } from "solid-js";

export interface MenuContextValue {
	/** Whether the panel draws a line between its rows. */
	dividers: Accessor<boolean>;
}

export const MenuContext = createContext<MenuContextValue>();

/** Reads what Menu.Content settled on, so nested panels match it. */
export const useMenuContext = (): MenuContextValue =>
	useContext(MenuContext) ?? { dividers: () => true };
