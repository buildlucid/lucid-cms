import type { LucidConfig } from "../../types/config.js";
import deepMerge from "../../utils/helpers/deep-merge.js";

/** Adapter instances belong to their provider and must never be recursively merged. */
const withoutAdapters = (
	config: Partial<LucidConfig>,
): Partial<LucidConfig> => ({
	...config,
	media: config.media && {
		...config.media,
		storageAdapter: undefined,
		deliveryAdapter: undefined,
	},
	email: config.email && { ...config.email, adapter: undefined },
	captcha: config.captcha && { ...config.captcha, adapter: undefined },
	kv: config.kv && { ...config.kv, adapter: undefined },
	queue: config.queue && { ...config.queue, adapter: undefined },
});

const mergeConfig = (
	config: Partial<LucidConfig>,
	defaultConfig: Partial<LucidConfig>,
) => {
	const merged = deepMerge(
		deepMerge({}, withoutAdapters(defaultConfig)),
		withoutAdapters(config),
	);
	if (merged.media) {
		merged.media.storageAdapter =
			config.media?.storageAdapter !== undefined
				? config.media.storageAdapter
				: defaultConfig.media?.storageAdapter;
		merged.media.deliveryAdapter =
			config.media?.deliveryAdapter !== undefined
				? config.media.deliveryAdapter
				: defaultConfig.media?.deliveryAdapter;
	}
	if (merged.email)
		merged.email.adapter =
			config.email?.adapter !== undefined
				? config.email.adapter
				: defaultConfig.email?.adapter;
	if (merged.captcha)
		merged.captcha.adapter =
			config.captcha?.adapter !== undefined
				? config.captcha.adapter
				: defaultConfig.captcha?.adapter;
	if (merged.kv)
		merged.kv.adapter =
			config.kv?.adapter !== undefined
				? config.kv.adapter
				: defaultConfig.kv?.adapter;
	if (merged.queue)
		merged.queue.adapter =
			config.queue?.adapter !== undefined
				? config.queue.adapter
				: defaultConfig.queue?.adapter;
	return merged;
};

export default mergeConfig;
