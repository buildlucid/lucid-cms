import type { MediaResponse } from "@types";
import { createStore } from "solid-js/store";

type SuccessCallbackT = (_media: MediaResponse) => void;

type MediaUploadStoreT = {
	open: boolean;
	onSuccessCallback: SuccessCallbackT;
	extensions?: string;
	type?: string;
};

const [get, set] = createStore<MediaUploadStoreT>({
	open: false,
	onSuccessCallback: () => {},
});

const mediaUploadStore = {
	get,
	set,
};

export default mediaUploadStore;
