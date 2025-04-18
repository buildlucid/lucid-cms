import { createStore } from "solid-js/store";
import type { DocumentResponse } from "@types";

type SelectCallbackT = (_document: DocumentResponse) => void;

type DocumentSelectStoreT = {
	open: boolean;
	onSelectCallback: SelectCallbackT;

	collectionKey: string | undefined;
	selected?: DocumentResponse["id"];
};

const [get, set] = createStore<DocumentSelectStoreT>({
	open: false,
	onSelectCallback: () => {},
	collectionKey: undefined,
});

const documentSelectStore = {
	get,
	set,
};

export default documentSelectStore;
