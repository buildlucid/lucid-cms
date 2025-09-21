import { createStore, produce } from "solid-js/store";

const [get, set] = createStore<{
	selectedFolders: Array<number>;
	selectedMedia: Array<number>;
	/** Reset the selected folders and media */
	reset: () => void;
	/** Add a selected folder */
	addSelectedFolder: (folder: number) => void;
	/** Add a selected media */
	addSelectedMedia: (media: number) => void;
	/** Remove a selected folder */
	removeSelectedFolder: (folder: number) => void;
	/** Remove a selected media */
	removeSelectedMedia: (media: number) => void;
	/** Reset the selected folders */
	resetSelectedFolders: () => void;
	/** Reset the selected media */
	resetSelectedMedia: () => void;
}>({
	selectedFolders: [],
	selectedMedia: [],
	reset() {
		set("selectedFolders", []);
		set("selectedMedia", []);
	},
	addSelectedFolder(folder) {
		set(
			"selectedFolders",
			produce((draft) => {
				draft.push(folder);
			}),
		);
	},
	addSelectedMedia(media) {
		set(
			"selectedMedia",
			produce((draft) => {
				draft.push(media);
			}),
		);
	},
	removeSelectedFolder(folder) {
		set(
			"selectedFolders",
			produce((draft) => {
				draft.splice(draft.indexOf(folder), 1);
			}),
		);
	},
	removeSelectedMedia(media) {
		set(
			"selectedMedia",
			produce((draft) => {
				draft.splice(draft.indexOf(media), 1);
			}),
		);
	},
	resetSelectedFolders() {
		set("selectedFolders", []);
	},
	resetSelectedMedia() {
		set("selectedMedia", []);
	},
});

const mediaStore = {
	get,
	set,
};

export default mediaStore;
