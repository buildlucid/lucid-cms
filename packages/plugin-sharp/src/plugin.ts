import { LucidError } from "@lucidcms/core";
import type { LucidPlugin } from "@lucidcms/core/types";
import {
	LUCID_VERSION,
	PLUGIN_KEY,
	SUPPORTED_RUNTIME_ADAPTER_KEY,
} from "./constants.js";
import sharpImageProcessor from "./processor.js";

const plugin: LucidPlugin = () => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		checkCompatibility: ({ runtimeContext }) => {
			if (runtimeContext.runtime !== SUPPORTED_RUNTIME_ADAPTER_KEY) {
				throw new LucidError({
					message:
						"Sharp plugin is only supported on the Node runtime adapter.",
				});
			}
		},
		recipe: (draft) => {
			draft.i18n.sources.push("@lucidcms/plugin-sharp/translations");
			draft.media.images.processor = sharpImageProcessor;
		},
	};
};

export default plugin;
