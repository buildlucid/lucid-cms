import type { RuntimeArtifactCustom } from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";

const WRANGLER_CONFIG_ARTIFACT_TYPE = "cloudflare:wrangler";

type KVWranglerBindingOptions = {
	binding?: string;
	id?: string;
	previewId?: string;
};

type CloudflareWranglerConfigArtifact = {
	bindings: {
		kv: true | string | KVWranglerBindingOptions;
	};
};

export const createKVBinding = (
	options: PluginOptions,
): true | string | KVWranglerBindingOptions => {
	const binding = {
		...(options.binding ? { binding: options.binding } : {}),
		...(options.id ? { id: options.id } : {}),
		...(options.previewId ? { previewId: options.previewId } : {}),
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
export const createWranglerArtifact = (
	options: PluginOptions,
): RuntimeArtifactCustom<CloudflareWranglerConfigArtifact> => ({
	type: WRANGLER_CONFIG_ARTIFACT_TYPE,
	custom: {
		bindings: {
			kv: createKVBinding(options),
		},
	},
});
