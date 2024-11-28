import { createStore } from "solid-js/store";
import type { LinkResValue } from "@types";

type SelectCallbackT = (_link: LinkResValue) => void;

type LinkFieldStoreT = {
	open: boolean;
	onSelectCallback: SelectCallbackT;
	selectedLink: LinkResValue;
};

const [get, set] = createStore<LinkFieldStoreT>({
	open: false,
	onSelectCallback: () => {},
	selectedLink: null,
});

const linkFieldStore = {
	get,
	set,
};

export default linkFieldStore;
