import { createStore } from "solid-js/store";
import type { MediaResponse } from "@lucidcms/core/types";

type SelectCallbackT = (_media: MediaResponse) => void;

type MediaSelectStoreT = {
	open: boolean;
	onSelectCallback: SelectCallbackT;

	extensions?: string;
	type?: string;
	selected?: MediaResponse["id"];
};

const [get, set] = createStore<MediaSelectStoreT>({
	open: false,
	onSelectCallback: () => {},
});

const mediaSelectStore = {
	get,
	set,
};

export default mediaSelectStore;
