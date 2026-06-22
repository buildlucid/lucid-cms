import type { RuntimeArtifactCustom } from "@lucidcms/core/types";
import type { D1AdapterBindingOptions } from "../types.js";

const WRANGLER_CONFIG_ARTIFACT_TYPE = "cloudflare:wrangler";

type D1WranglerBindingOptions = {
	binding?: string;
	databaseName?: string;
	databaseId?: string;
	previewDatabaseId?: string;
	remote?: boolean;
};

type CloudflareWranglerConfigArtifact = {
	bindings: {
		d1: true | string | D1WranglerBindingOptions;
	};
};

const createD1Binding = (
	options: D1AdapterBindingOptions | undefined,
): true | string | D1WranglerBindingOptions => {
	if (!options) return true;

	const binding = {
		...(options.binding ? { binding: options.binding } : {}),
		...(options.databaseName ? { databaseName: options.databaseName } : {}),
		...(options.databaseId ? { databaseId: options.databaseId } : {}),
		...(options.previewDatabaseId
			? { previewDatabaseId: options.previewDatabaseId }
			: {}),
		...(options.remote !== undefined ? { remote: options.remote } : {}),
	};

	if (Object.keys(binding).length === 0) {
		return true;
	}
	if (Object.keys(binding).length === 1 && binding.binding) {
		return binding.binding;
	}
	return binding;
};

/** Creates the opaque Wrangler config artifact consumed by Cloudflare runtimes. */
export const createD1WranglerArtifact = (
	options?: D1AdapterBindingOptions,
): RuntimeArtifactCustom<CloudflareWranglerConfigArtifact> => ({
	type: WRANGLER_CONFIG_ARTIFACT_TYPE,
	custom: {
		bindings: {
			d1: createD1Binding(options),
		},
	},
});
