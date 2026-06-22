import { LucidError } from "@lucidcms/core";
import type { ServiceContext } from "@lucidcms/core/types";
import { DEFAULT_KV_BINDING, PLUGIN_KEY } from "../constants.js";
import type { PluginOptions } from "../types.js";

/** Resolves the binding name convention used by Lucid's Wrangler generation. */
export const resolveBindingName = (options: PluginOptions) =>
	options.binding ?? DEFAULT_KV_BINDING;

/** Resolves the configured Cloudflare KV namespace from the current adapter env. */
export const resolveBinding = (
	context: ServiceContext,
	options: PluginOptions,
) => {
	const bindingName = resolveBindingName(options);
	const binding = context.env?.[bindingName];
	if (!binding) {
		throw new LucidError({
			message: `Cloudflare KV binding "${bindingName}" was not found in the runtime environment. Configure the KV binding in the Cloudflare runtime or pass the matching plugin binding option.`,
			scope: PLUGIN_KEY,
		});
	}

	return binding as KVNamespace;
};
