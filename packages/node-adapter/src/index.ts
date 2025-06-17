import { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import type { LucidAdapterResponse } from "@lucidcms/core/types";

const nodeAdapter = (): LucidAdapterResponse => {
	return {
		key: ADAPTER_KEY,
		lucid: LUCID_VERSION,
	};
};

export default nodeAdapter;
