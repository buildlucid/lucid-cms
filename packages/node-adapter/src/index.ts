import { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import type { LucidAdapter } from "@lucidcms/core/types";

const nodeAdapter: LucidAdapter = (config) => {
	return {
		key: ADAPTER_KEY,
		lucid: LUCID_VERSION,
		config: config,
	};
};

export default nodeAdapter;
