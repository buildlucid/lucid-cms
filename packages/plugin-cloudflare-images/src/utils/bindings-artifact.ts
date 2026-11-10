import type { CloudflareBindingsArtifact } from "@lucidcms/cloudflare/types";
import type { CloudflareImagesPluginOptions } from "../types.js";

/** Creates the bindings artifact the Cloudflare runtime adds to its Worker. */
export const createBindingsArtifact = (
	options: CloudflareImagesPluginOptions,
): CloudflareBindingsArtifact => ({
	type: "cloudflare:bindings",
	custom: {
		bindings: {
			images: {
				...(options.binding && { binding: options.binding }),
			},
		},
	},
});
