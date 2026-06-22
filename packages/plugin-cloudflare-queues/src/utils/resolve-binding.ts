import { LucidError } from "@lucidcms/core";
import type { ServiceContext } from "@lucidcms/core/types";
import { DEFAULT_QUEUE_BINDING, PLUGIN_KEY } from "../constants.js";
import type { PluginOptions } from "../types.js";

/** Resolves the binding name convention used by Lucid's Wrangler generation. */
export const resolveBindingName = (options: PluginOptions) =>
	options.binding ?? DEFAULT_QUEUE_BINDING;

/** Resolves the configured Cloudflare queue from the current service env. */
export const resolveBinding = (
	context: ServiceContext,
	options: PluginOptions,
) => {
	const bindingName = resolveBindingName(options);
	const binding = context.env?.[bindingName];
	if (!binding) {
		throw new LucidError({
			message: `Cloudflare queue binding "${bindingName}" was not found in the runtime environment. Configure the queue binding in the Cloudflare runtime or pass the matching plugin binding option.`,
			scope: PLUGIN_KEY,
		});
	}

	return binding as Queue;
};
