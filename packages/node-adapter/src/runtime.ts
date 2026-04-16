import type { RuntimeAdapterRuntimeLoader } from "@lucidcms/core/types";
import { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import getRuntimeContext from "./services/runtime-context.js";

const loadRuntime: RuntimeAdapterRuntimeLoader = async () => {
	return {
		key: ADAPTER_KEY,
		lucid: LUCID_VERSION,
	};
};

export default loadRuntime;
export { getRuntimeContext, loadRuntime as runtime };
