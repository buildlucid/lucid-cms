import { type Accessor, createContext } from "solid-js";

export const PanelLayerContext = createContext<Accessor<number>>();
