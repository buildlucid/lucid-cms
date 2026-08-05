import type { RuntimeArtifactCustom } from "@lucidcms/core/types";
import type { CloudflareImagesPluginOptions } from "../types.js";

const WRANGLER_CONFIG_ARTIFACT_TYPE = "cloudflare:wrangler";

type CloudflareWranglerConfigArtifact = {
	bindings: {
		images: true | string;
	};
};

/** Creates the Images binding requirement consumed by Cloudflare runtimes. */
export const createWranglerArtifact = (
	options: CloudflareImagesPluginOptions,
): RuntimeArtifactCustom<CloudflareWranglerConfigArtifact> => ({
	type: WRANGLER_CONFIG_ARTIFACT_TYPE,
	custom: {
		bindings: {
			images: options.binding ?? true,
		},
	},
});
