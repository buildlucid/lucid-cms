import { createStore } from "solid-js/store";

type UserPreferencesStoreT = {
	autoSaveEnabled: boolean;
	setAutoSaveEnabled: (enabled: boolean) => void;
	toggleAutoSave: () => void;
};

const AUTO_SAVE_ENABLED_KEY = "lucid_auto_save_enabled";

const getInitialAutoSaveEnabled = (): boolean => {
	const stored = localStorage.getItem(AUTO_SAVE_ENABLED_KEY);
	if (stored === null) return true; // Default to enabled
	return stored === "true";
};

const [get, set] = createStore<UserPreferencesStoreT>({
	autoSaveEnabled: getInitialAutoSaveEnabled(),

	setAutoSaveEnabled(enabled: boolean) {
		localStorage.setItem(AUTO_SAVE_ENABLED_KEY, String(enabled));
		set("autoSaveEnabled", enabled);
	},

	toggleAutoSave() {
		const newValue = !get.autoSaveEnabled;
		localStorage.setItem(AUTO_SAVE_ENABLED_KEY, String(newValue));
		set("autoSaveEnabled", newValue);
	},
});

const userPreferencesStore = {
	get,
	set,
};

export default userPreferencesStore;
