import { LucidError } from "@lucidcms/core";
import type { ServiceContext } from "@lucidcms/core/types";
import { DEFAULT_QUEUE_BINDING, PLUGIN_KEY } from "../constants.js";
import type { PluginOptions } from "../types.js";

/** Resolves the binding name convention used by Lucid's Wrangler generation. */
const resolveBindingName = (options: PluginOptions) =>
	options.binding ?? DEFAULT_QUEUE_BINDING;

const isQueueBinding = (value: unknown): value is Queue =>
	typeof value === "object" &&
	value !== null &&
	"metrics" in value &&
	typeof value.metrics === "function" &&
	"send" in value &&
	typeof value.send === "function" &&
	"sendBatch" in value &&
	typeof value.sendBatch === "function";

/** Resolves the configured Cloudflare queue from the current service env. */
export const resolveBinding = (
	context: ServiceContext,
	options: PluginOptions,
) => {
	const bindingName = resolveBindingName(options);
	const binding = context.env?.[bindingName];
	if (!isQueueBinding(binding)) {
		throw new LucidError({
			message: `Cloudflare queue binding "${bindingName}" is missing or invalid. Configure the queue binding in the Cloudflare runtime or pass the matching plugin binding option.`,
			scope: PLUGIN_KEY,
		});
	}

	return binding;
};
