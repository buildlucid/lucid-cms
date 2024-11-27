import { createStore } from "solid-js/store";
import type { CollectionDocumentResponse } from "@lucidcms/core/types";

type SelectCallbackT = (_document: CollectionDocumentResponse) => void;

type DocumentSelectStoreT = {
	open: boolean;
	onSelectCallback: SelectCallbackT;

	collectionKey: string | undefined;
	selected?: CollectionDocumentResponse["id"];
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
