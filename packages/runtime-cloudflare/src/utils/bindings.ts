import {
	DEFAULT_KV_BINDING,
	DEFAULT_QUEUE_BINDING,
	DEFAULT_R2_BINDING,
} from "../constants.js";
import type {
	CloudflareBindingsOptions,
	CloudflareKVNamespaceBindingOptions,
	CloudflareQueueBindingOptions,
	CloudflareR2BucketBindingOptions,
} from "../types.js";

type NormalizedBinding<T extends { binding?: string }> = Omit<T, "binding"> & {
	binding: string;
};

/** Converts boolean/string shorthand into the expanded Wrangler binding shape. */
const normalizeBinding = <
	T extends
		| CloudflareKVNamespaceBindingOptions
		| CloudflareR2BucketBindingOptions
		| CloudflareQueueBindingOptions,
>(
	value: true | string | T | undefined,
	defaultBinding: string,
): NormalizedBinding<T> | undefined => {
	if (!value) return undefined;
	if (value === true) {
		return { binding: defaultBinding } as NormalizedBinding<T>;
	}
	if (typeof value === "string") {
		return { binding: value } as NormalizedBinding<T>;
	}

	return {
		...value,
		binding: value.binding ?? defaultBinding,
	};
};

/** Normalizes Cloudflare binding shorthands into Wrangler binding objects. */
export const normalizeCloudflareBindings = (
	bindings: CloudflareBindingsOptions | undefined,
) => ({
	kv: normalizeBinding<CloudflareKVNamespaceBindingOptions>(
		bindings?.kv,
		DEFAULT_KV_BINDING,
	),
	r2: normalizeBinding<CloudflareR2BucketBindingOptions>(
		bindings?.r2,
		DEFAULT_R2_BINDING,
	),
	queues: normalizeBinding<CloudflareQueueBindingOptions>(
		bindings?.queues,
		DEFAULT_QUEUE_BINDING,
	),
});
