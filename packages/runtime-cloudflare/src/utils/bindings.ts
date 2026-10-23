import {
	DEFAULT_IMAGES_BINDING,
	DEFAULT_KV_BINDING,
	DEFAULT_QUEUE_BINDING,
	DEFAULT_R2_BINDING,
} from "../constants.js";
import type {
	CloudflareBindingsOptions,
	CloudflareImagesBindingOptions,
	CloudflareKVNamespaceBindingOptions,
	CloudflareQueueBindingOptions,
	CloudflareR2BucketBindingOptions,
} from "../types.js";

type NormalizedBinding<T extends { binding?: string }> = Omit<T, "binding"> & {
	binding: string;
};
type BindingOption<T extends { binding?: string }> = true | string | T;

/** Converts boolean or string shorthand into the expanded binding options. */
const normalizeBinding = <
	T extends
		| CloudflareKVNamespaceBindingOptions
		| CloudflareImagesBindingOptions
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

/** Normalizes Cloudflare binding shorthands into expanded binding options. */
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
	images: normalizeBinding<CloudflareImagesBindingOptions>(
		bindings?.images,
		DEFAULT_IMAGES_BINDING,
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
		merged.images = mergeBinding(merged.images, bindings?.images);
	}

	return Object.values(merged).some((value) => value !== undefined)
		? merged
		: undefined;
};
