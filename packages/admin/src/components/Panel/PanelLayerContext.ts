import { type Accessor, createContext } from "solid-js";

/** Exposes the active overlay layer to nested panels, modals, and menus. */
export const PanelLayerContext = createContext<Accessor<number>>();
