import type { RuntimeArtifactCustom } from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";

const WRANGLER_CONFIG_ARTIFACT_TYPE = "cloudflare:wrangler";

type R2WranglerBindingOptions = {
	binding?: string;
	bucketName?: string;
	previewBucketName?: string;
};

type CloudflareWranglerConfigArtifact = {
	bindings: {
		r2: true | string | R2WranglerBindingOptions;
	};
};

export const createR2Binding = (
	options: PluginOptions,
): true | string | R2WranglerBindingOptions => {
	const binding = {
		...(options.binding ? { binding: options.binding } : {}),
		...(options.bucketName ? { bucketName: options.bucketName } : {}),
		...(options.previewBucketName
			? { previewBucketName: options.previewBucketName }
			: {}),
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
			r2: createR2Binding(options),
		},
	},
});
