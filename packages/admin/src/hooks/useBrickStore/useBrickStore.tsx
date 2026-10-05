import { createContext, type ParentComponent, useContext } from "solid-js";
import brickStore, {
	type createBrickStore,
} from "@/store/brickStore/brickStore";

type BrickStore = ReturnType<typeof createBrickStore>;
const BrickStoreContext = createContext<BrickStore>(brickStore);

/** Provides isolated content state for a document pane, eg. the read-only side of a comparison. */
export const BrickStoreProvider: ParentComponent<{ store: BrickStore }> = (
	props,
) => {
	// ----------------------------------------
	// Render
	return (
		<BrickStoreContext.Provider value={props.store}>
			{props.children}
		</BrickStoreContext.Provider>
	);
};

/** The brick store for the current pane. Outside a provider this is the editable document's store. */
export const useBrickStore = () => useContext(BrickStoreContext);
