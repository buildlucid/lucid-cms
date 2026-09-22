import { type Accessor, createContext, useContext } from "solid-js";

export interface MenuContextValue {
	dividers: Accessor<boolean>;
}

export const MenuContext = createContext<MenuContextValue>();

/** Lets nested menus match their parent's settings. */
export const useMenuContext = (): MenuContextValue =>
	useContext(MenuContext) ?? { dividers: () => true };
