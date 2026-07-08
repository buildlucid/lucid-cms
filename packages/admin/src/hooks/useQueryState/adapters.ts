import { createSignal } from "solid-js";
import type { QueryStateStorageAdapter } from "./types";

//* stores the serialized query state in a local signal - same canonical model
//* and query-string behaviour as URL mode, without touching browser history
export const createMemoryStorageAdapter = (
	initialSearch = "",
): QueryStateStorageAdapter => {
	const [getSearch, setSearch] = createSignal(initialSearch);
	return {
		search: getSearch,
		write: setSearch,
	};
};
