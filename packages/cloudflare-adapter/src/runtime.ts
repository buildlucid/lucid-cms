import type { RuntimeAdapterRuntimeLoader } from "@lucidcms/core/types";
import constants, { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import getRuntimeContext from "./services/get-runtime-context.js";

const loadRuntime: RuntimeAdapterRuntimeLoader = async () => {
	return {
		key: ADAPTER_KEY,
		lucid: LUCID_VERSION,
		config: {
			customBuildArtifacts: [
				constants.WORKER_EXPORT_ARTIFACT_TYPE,
				constants.WORKER_ENTRY_ARTIFACT_TYPE,
			],
		},
	};
};

export default loadRuntime;
export { getRuntimeContext, loadRuntime as runtime };
