import type { Config } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import {
	destroyEmailAdapter,
	getInitializedEmailAdapter,
} from "../email/lifecycle.js";
import type { EmailAdapterInstance } from "../email/types.js";
import { destroyKVAdapter, getInitializedKVAdapter } from "../kv/lifecycle.js";
import type { KVAdapterInstance } from "../kv/types.js";
import {
	destroyMediaDeliveryAdapter,
	getInitializedMediaDeliveryAdapter,
} from "../media-delivery/lifecycle.js";
import type { MediaDeliveryAdapterInstance } from "../media-delivery/types.js";
import {
	destroyMediaStorageAdapter,
	getInitializedMediaStorageAdapter,
} from "../media-storage/lifecycle.js";
import type { MediaStorageAdapterInstance } from "../media-storage/types.js";
import {
	destroyQueueAdapter,
	getInitializedQueueAdapter,
} from "../queue/lifecycle.js";
import type { QueueAdapterInstance } from "../queue/types.js";
import type { AdapterRuntimeContext, EnvironmentVariables } from "./types.js";

/** Adapter instances available to Lucid services. */
export type LucidAdapterInstances = {
	queue: QueueAdapterInstance;
	kv: KVAdapterInstance;
	mediaStorage: MediaStorageAdapterInstance | null;
	mediaDelivery: MediaDeliveryAdapterInstance;
	email: EmailAdapterInstance;
};

/** Adapter instances to use instead of their configured equivalents. */
export type LucidAdapterOverrides = Partial<LucidAdapterInstances>;

/** Options for initializing Lucid's configured adapters. */
export type CreateLucidAdaptersOptions = {
	config: Config;
	env?: EnvironmentVariables;
	runtimeContext?: AdapterRuntimeContext;
	overrides?: LucidAdapterOverrides;
};

/** Initialized adapter instances with their shared lifecycle. */
export type LucidAdapters = {
	instances: LucidAdapterInstances;
	/** Destroys every initialized adapter. Safe to call more than once. */
	destroy(): Promise<void>;
};

/**
 * Initializes configured adapters and supplied overrides. The returned object
 * owns every adapter until `destroy` is called.
 */
const createLucidAdapters = async (
	options: CreateLucidAdaptersOptions,
): Promise<LucidAdapters> => {
	let queue: QueueAdapterInstance | undefined;
	let kv: KVAdapterInstance | undefined;
	let mediaStorage: MediaStorageAdapterInstance | null | undefined;
	let mediaDelivery: MediaDeliveryAdapterInstance | undefined;
	let email: EmailAdapterInstance | undefined;
	const lifecycleOptions = {
		env: options.env,
		runtimeContext: options.runtimeContext,
	};
	const destroyInstances = () =>
		Promise.allSettled([
			destroyQueueAdapter(queue, {
				config: options.config,
				...lifecycleOptions,
			}),
			destroyKVAdapter(kv, {
				config: options.config,
				...lifecycleOptions,
			}),
			destroyMediaStorageAdapter(mediaStorage, {
				config: options.config,
				...lifecycleOptions,
			}),
			destroyEmailAdapter(email, {
				config: options.config,
				...lifecycleOptions,
			}),
			destroyMediaDeliveryAdapter(mediaDelivery, {
				config: options.config,
				...lifecycleOptions,
			}),
		]);

	try {
		kv = await getInitializedKVAdapter(options.config, {
			...lifecycleOptions,
			adapter: options.overrides?.kv,
		});
		queue = await getInitializedQueueAdapter(options.config, {
			...lifecycleOptions,
			adapter: options.overrides?.queue,
		});
		mediaStorage = await getInitializedMediaStorageAdapter(options.config, {
			...lifecycleOptions,
			...(Object.hasOwn(options.overrides ?? {}, "mediaStorage")
				? { adapter: options.overrides?.mediaStorage }
				: {}),
		});
		email = await getInitializedEmailAdapter(options.config, {
			...lifecycleOptions,
			adapter: options.overrides?.email,
		});
		mediaDelivery = await getInitializedMediaDeliveryAdapter(options.config, {
			...lifecycleOptions,
			adapter: options.overrides?.mediaDelivery,
		});
	} catch (error) {
		await destroyInstances();
		throw error;
	}

	if (!queue || !kv || !mediaDelivery || !email) {
		await destroyInstances();
		throw new LucidError({
			message: "Lucid could not initialize its adapters.",
		});
	}

	let destroyPromise: Promise<void> | undefined;
	return {
		instances: {
			queue,
			kv,
			mediaStorage: mediaStorage ?? null,
			mediaDelivery,
			email,
		},
		destroy: () => {
			destroyPromise ??= destroyInstances().then(() => undefined);
			return destroyPromise;
		},
	};
};

export default createLucidAdapters;
