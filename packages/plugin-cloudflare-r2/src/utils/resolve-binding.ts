import { LucidError } from "@lucidcms/core";
import type { ServiceContext } from "@lucidcms/core/types";
import { DEFAULT_R2_BINDING, PLUGIN_KEY } from "../constants.js";
import type { PluginOptions } from "../types.js";

/** Resolves the binding name, using Lucid's convention by default. */
const resolveBindingName = (options: PluginOptions) =>
	options.binding ?? DEFAULT_R2_BINDING;

const isR2Bucket = (value: unknown): value is R2Bucket =>
	typeof value === "object" &&
	value !== null &&
	"head" in value &&
	typeof value.head === "function" &&
	"get" in value &&
	typeof value.get === "function" &&
	"put" in value &&
	typeof value.put === "function" &&
	"delete" in value &&
	typeof value.delete === "function" &&
	"list" in value &&
	typeof value.list === "function";

/** Resolves the configured Cloudflare R2 bucket from the current adapter env. */
export const resolveBinding = (
	context: ServiceContext,
	options: PluginOptions,
) => {
	const bindingName = resolveBindingName(options);
	const binding = context.env?.[bindingName];
	if (!isR2Bucket(binding)) {
		throw new LucidError({
			message: `Cloudflare R2 binding "${bindingName}" was not found in the runtime environment. Configure the R2 binding in the Cloudflare runtime or pass the matching plugin binding option.`,
			scope: PLUGIN_KEY,
		});
	}

	return binding;
};
