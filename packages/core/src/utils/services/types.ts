import type LucidDatabase from "../../libs/db/client/lucid-database.js";
import type { DatabaseConnection } from "../../libs/db/types.js";
import type { EmailAdapterInstance } from "../../libs/email/types.js";
import type { TranslationStore, Translator } from "../../libs/i18n/types.js";
import type { KVAdapterInstance } from "../../libs/kv/types.js";
import type { MediaDeliveryAdapterInstance } from "../../libs/media-delivery/types.js";
import type { MediaStorageAdapterInstance } from "../../libs/media-storage/types.js";
import type { QueueAdapterInstance } from "../../libs/queue/types.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../../libs/runtime/types.js";
import type { ResolvedLucidConfig } from "../../types/config.js";
import type { LucidErrorData } from "../../types/errors.js";

/** Inputs for building a service context from resolved Lucid runtime values. */
export type CreateServiceContextOptions = {
	/** Resolved Lucid config to build the service context from. */
	config: ResolvedLucidConfig;
	/** Live database connection owned by the current runtime or invocation. */
	database: DatabaseConnection;
	/** Prebuilt managed database boundary for the current runtime or invocation. */
	db?: LucidDatabase;
	/** Translation store resolved alongside the config. */
	translationStore: TranslationStore;
	/** Optional runtime env bindings associated with the context. */
	env?: EnvironmentVariables | null;
	/** Optional runtime context associated with the context. */
	runtimeContext?: AdapterRuntimeContext;
	/** Optional job delivery adapter instance available to services. */
	queue?: QueueAdapterInstance;
	/** Optional KV adapter instance available to services. */
	kv?: KVAdapterInstance;
	/** Optional initialized media storage adapter available to services. */
	mediaStorage?: MediaStorageAdapterInstance | null;
	/** Optional initialized media delivery adapter available to services. */
	mediaDelivery?: MediaDeliveryAdapterInstance;
	/** Optional initialized email adapter instance available to services. */
	email?: EmailAdapterInstance;
	/**
	 * Request metadata used by services. If URL is omitted, Lucid uses
	 * `config.host`, then falls back to the local Lucid URL.
	 */
	request?: {
		url?: string;
		ipAddress?: string | null;
	};
};

/** Database, adapters and request information passed to custom services, hooks and jobs. Use the supplied context for work in the current transaction. */
export type ServiceContext = {
	db: LucidDatabase;
	config: ResolvedLucidConfig;
	env: EnvironmentVariables | null;
	runtimeContext?: AdapterRuntimeContext;
	queue: QueueAdapterInstance;
	kv: KVAdapterInstance;
	mediaStorage: MediaStorageAdapterInstance | null;
	mediaDelivery: MediaDeliveryAdapterInstance;
	email: EmailAdapterInstance;
	translate: Translator;
	request: {
		/** The request URL. Used to derive the base URL if config.host is not set. */
		url: string;
		/** The connecting client IP address when the service runs in an HTTP request context. */
		ipAddress?: string | null;
		/** The resolved CMS interface locale for server-side display messages. */
		locale: string;
	};
};
export type ServiceProps<T> = {
	serviceConfig?: ServiceContext;
	data?: T;
	[key: string]: unknown;
};

/** Error handling and transaction options for `serviceWrapper`. */
export type ServiceWrapperConfig = {
	/** Start a transaction when supported. Existing transactions are reused. */
	transaction: boolean;
	/** Fallback error details merged with service errors. */
	defaultError?: Omit<Partial<LucidErrorData>, "zod" | "errors">;
	/** Log caught exceptions. Defaults to false. */
	logError?: boolean;
};

/** An async result with either data or an error. Check `error` before using `data`. */
export type ServiceResponse<T> = Promise<
	{ error: LucidErrorData; data: undefined } | { error: undefined; data: T }
>;

/** A service that receives its context first and returns a Lucid result. */
export type ServiceFn<T extends unknown[], R> = (
	service: ServiceContext,
	...args: T
) => ServiceResponse<R>;
