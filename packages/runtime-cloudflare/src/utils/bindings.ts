import {
	DEFAULT_D1_BINDING,
	DEFAULT_KV_BINDING,
	DEFAULT_QUEUE_BINDING,
	DEFAULT_R2_BINDING,
} from "../constants.js";
import type {
	CloudflareBindingsOptions,
	CloudflareD1DatabaseBindingOptions,
	CloudflareKVNamespaceBindingOptions,
	CloudflareQueueBindingOptions,
	CloudflareR2BucketBindingOptions,
} from "../types.js";

type NormalizedBinding<T extends { binding?: string }> = Omit<T, "binding"> & {
	binding: string;
};
type BindingOption<T extends { binding?: string }> = true | string | T;

/** Converts boolean/string shorthand into the expanded Wrangler binding shape. */
const normalizeBinding = <
	T extends
		| CloudflareKVNamespaceBindingOptions
		| CloudflareD1DatabaseBindingOptions
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
	d1: normalizeBinding<CloudflareD1DatabaseBindingOptions>(
		bindings?.d1,
		DEFAULT_D1_BINDING,
	),
});

const toObjectBinding = <T extends { binding?: string }>(
	value: BindingOption<T>,
): T => {
	if (value === true) return {} as T;
	if (typeof value === "string") return { binding: value } as T;
	return value;
};

const mergeBinding = <T extends { binding?: string }>(
	base: BindingOption<T> | undefined,
	extension: BindingOption<T> | undefined,
): BindingOption<T> | undefined => {
	if (extension === undefined) return base;
	if (base === undefined) return extension;
	if (extension === true) return base;
	if (base === true) return extension;

	return {
		...toObjectBinding(base),
		...toObjectBinding(extension),
	};
};

/** Merges Cloudflare binding declarations while treating `true` as "enable defaults". */
export const mergeCloudflareBindings = (
	...bindingOptions: Array<CloudflareBindingsOptions | undefined>
): CloudflareBindingsOptions | undefined => {
	const merged: CloudflareBindingsOptions = {};

	for (const bindings of bindingOptions) {
		merged.kv = mergeBinding(merged.kv, bindings?.kv);
		merged.r2 = mergeBinding(merged.r2, bindings?.r2);
		merged.queues = mergeBinding(merged.queues, bindings?.queues);
		merged.d1 = mergeBinding(merged.d1, bindings?.d1);
	}

	return Object.values(merged).some((value) => value !== undefined)
		? merged
		: undefined;
};
