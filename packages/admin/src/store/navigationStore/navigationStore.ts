import { createStore } from "solid-js/store";

type NavigationStoreT = {
	/**
	 * Hides the desktop sidebar column, revealing it as an overlay. The owning page must restore it on
	 * cleanup.
	 */
	tucked: boolean;
};

const [get, set] = createStore<NavigationStoreT>({
	tucked: false,
});

const navigationStore = {
	get,
	set,
};

export default navigationStore;
