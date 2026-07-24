import type { ZodType } from "zod";
import type { DatabaseConnection, KyselyDB } from "../../libs/db/types.js";
import type { EmailAdapterInstance } from "../../libs/email/types.js";
import type { TranslationStore, Translator } from "../../libs/i18n/types.js";
import type { KVAdapterInstance } from "../../libs/kv/types.js";
import type { MediaAdapterInstance } from "../../libs/media/types.js";
import type { QueueAdapterInstance } from "../../libs/queue/types.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../../libs/runtime/types.js";
import type { Config } from "../../types/config.js";
import type { LucidErrorData } from "../../types/errors.js";

/** Inputs for building a service context from resolved Lucid runtime values. */
export type CreateServiceContextOptions = {
	/** Resolved Lucid config to build the service context from. */
	config: Config;
	/** Live database connection owned by the current runtime or invocation. */
	database: DatabaseConnection;
	/** Translation store resolved alongside the config. */
	translationStore: TranslationStore;
	/** Optional runtime env bindings associated with the context. */
	env?: EnvironmentVariables | null;
	/** Optional runtime context associated with the context. */
	runtimeContext?: AdapterRuntimeContext;
	/** Optional queue adapter instance available to services. */
	queue?: QueueAdapterInstance;
	/** Optional KV adapter instance available to services. */
	kv?: KVAdapterInstance;
	/** Optional initialized media adapter instance available to services. */
	media?: MediaAdapterInstance | null;
	/** Optional initialized email adapter instance available to services. */
	email?: EmailAdapterInstance;
	/**
	 * Request metadata used by services. If URL is omitted, Lucid uses
	 * `config.host`, then falls back to the local Lucid URL.
	 */
	request?: {
		url?: string;
		ipAddress?: string | null;
		tenantKey?: string | null;
	};
};

export type ServiceContext = {
	db: {
		// query: x, //* can be expanded to support some ORM like pattern later
		client: KyselyDB;
	};
	config: Config;
	env: EnvironmentVariables | null;
	runtimeContext?: AdapterRuntimeContext;
	queue: QueueAdapterInstance;
	kv: KVAdapterInstance;
	media: MediaAdapterInstance | null;
	email: EmailAdapterInstance;
	translate: Translator;
	request: {
		/** The request URL. Used to derive the base URL if config.host is not set. */
		url: string;
		/** The connecting client IP address when the service runs in an HTTP request context. */
		ipAddress?: string | null;
		/** The resolved CMS interface locale for server-side display messages. */
		locale: string;
		/** The resolved tenant key for this request. null/undefined means no tenant scoping is applied. */
		tenantKey?: string | null;
	};
};
export type ServiceProps<T> = {
	serviceConfig?: ServiceContext;
	data?: T;
	[key: string]: unknown;
};

export type ServiceWrapperConfig = {
	transaction: boolean; //* Decides whether the db queries should be within a transaction or not
	schema?: ZodType<unknown>;
	schemaArgIndex?: number; //* The index of the argument to parse the schema against
	defaultError?: Omit<Partial<LucidErrorData>, "zod" | "errors">;
	logError?: boolean;
};

export type ServiceResponse<T> = Promise<
	{ error: LucidErrorData; data: undefined } | { error: undefined; data: T }
>;

export type ServiceFn<T extends unknown[], R> = (
	service: ServiceContext,
	...args: T
) => ServiceResponse<R>;
