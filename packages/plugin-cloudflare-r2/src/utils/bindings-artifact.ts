import type { CloudflareBindingsArtifact } from "@lucidcms/runtime-cloudflare/types";
import type { PluginOptions } from "../types.js";

/** Creates the bindings artifact the Cloudflare runtime adds to its Worker. */
export const createBindingsArtifact = (
	options: PluginOptions,
): CloudflareBindingsArtifact => ({
	type: "cloudflare:bindings",
	custom: {
		bindings: {
			r2: {
				...(options.binding && { binding: options.binding }),
				...(options.bucketName && { bucketName: options.bucketName }),
			},
		},
	},
});
