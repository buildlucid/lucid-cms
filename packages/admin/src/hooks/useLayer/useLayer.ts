import { type Accessor, createContext, useContext } from "solid-js";

/**
 * The stack layer of the nearest overlay. Drawers, modals and menus read it so
 * anything they open sits above them without callers threading z-index props.
 */
export const LayerContext = createContext<Accessor<number>>();

/** Reads the stack layer of the nearest overlay, if there is one. */
export const useLayer = () => useContext(LayerContext);
