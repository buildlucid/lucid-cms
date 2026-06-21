import { LucidError } from "@lucidcms/core";
import type { ServiceContext } from "@lucidcms/core/types";
import { DEFAULT_R2_BINDING, PLUGIN_KEY } from "../constants.js";
import type { PluginOptions } from "../types.js";

/** Resolves the binding name convention used by Lucid's Wrangler generation. */
export const resolveBindingName = (options: PluginOptions) =>
	options.binding ?? DEFAULT_R2_BINDING;

/** Resolves the configured Cloudflare R2 bucket from the current adapter env. */
export const resolveBinding = (
	context: ServiceContext,
	options: PluginOptions,
) => {
	const bindingName = resolveBindingName(options);
	const binding = context.env?.[bindingName];
	if (!binding) {
		throw new LucidError({
			message: `Cloudflare R2 binding "${bindingName}" was not found in the runtime environment. Enable it with \`cloudflare({ wrangler: { bindings: { r2: true } } })\` or pass a matching \`binding\` to the Cloudflare R2 plugin.`,
			scope: PLUGIN_KEY,
		});
	}

	return binding as R2Bucket;
};
