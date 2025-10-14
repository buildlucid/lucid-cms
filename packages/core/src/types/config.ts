import type { Readable } from "node:stream";
import type { Hono } from "hono";
import type { InlineConfig } from "vite";
import type z from "zod/v4";
import type CollectionBuilder from "../libs/builders/collection-builder/index.js";
import type ConfigSchema from "../libs/config/config-schema.js";
import type DatabaseAdapter from "../libs/db-adapter/adapter-base.js";
import type { KVAdapter } from "../libs/kv-adapter/types.js";
import type { LogLevel, LogTransport } from "../libs/logger/types.js";
import type {
	MediaAdapter,
	MediaAdapterInstance,
} from "../libs/media-adapter/types.js";
import type { QueueAdapter } from "../libs/queue-adapter/types.js";
import type { EmailDeliveryStatus, MediaType } from "../types.js";
import type { ServiceResponse } from "../utils/services/types.js";
import type { LucidHonoGeneric } from "./hono.js";
import type { AllHooks } from "./hooks.js";

export type LucidPlugin = (config: Config) => Promise<{
	key: string;
	lucid: string;
	config: Config;
}>;

export type LucidPluginOptions<T = undefined> = (
	config: Config,
	pluginOptions: T,
) => Promise<{
	key: string;
	lucid: string;
	config: Config;
}>;

export type EmailStrategy = (
	email: {
		to: string;
		subject: string;
		from: {
			email: string;
			name: string;
		};
		html: string;
		text?: string;
		cc?: string;
		bcc?: string;
		replyTo?: string;
	},
	meta: {
		data: {
			[key: string]: unknown;
		};
		template: string;
	},
) => Promise<EmailStrategyResponse>;

export type EmailStrategyResponse = {
	success: boolean;
	delivery_status: EmailDeliveryStatus;
	message: string;
	external_message_id?: string | null;
	data?: Record<string, unknown> | null;
};

export type MediaStrategyGetPresignedUrl = (
	key: string,
	meta: {
		host: string;
		mimeType: string;
		extension?: string;
	},
) => ServiceResponse<{
	url: string;
	headers?: Record<string, string>;
}>;

export type MediaStrategyGetMeta = (key: string) => ServiceResponse<{
	size: number;
	mimeType: string | null;
	etag: string | null;
}>;

export type MediaStrategyStream = (
	key: string,
	options?: {
		range?: {
			start: number;
			end?: number;
		};
	},
) => ServiceResponse<{
	contentLength: number | undefined;
	contentType: string | undefined;
	body: Readable;
	isPartialContent?: boolean;
	totalSize?: number;
	range?: {
		start: number;
		end: number;
	};
}>;

export type MediaStrategyUploadSingle = (props: {
	key: string;
	data: Readable | Buffer;
	meta: {
		mimeType: string;
		extension: string;
		size: number;
		type: MediaType;
	};
}) => ServiceResponse<{
	etag?: string;
}>;

export type MediaStrategyDeleteSingle = (
	key: string,
) => ServiceResponse<undefined>;
export type MediaStrategyDeleteMultiple = (
	keys: string[],
) => ServiceResponse<undefined>;

export type MediaStrategy = {
	getPresignedUrl: MediaStrategyGetPresignedUrl;
	getMeta: MediaStrategyGetMeta;
	stream: MediaStrategyStream;
	uploadSingle: MediaStrategyUploadSingle;
	deleteSingle: MediaStrategyDeleteSingle;
	deleteMultiple: MediaStrategyDeleteMultiple;
};

export type ImageProcessorOptions = {
	width?: number;
	height?: number;
	format?: "webp" | "avif" | "jpeg" | "png";
	quality?: number;
};
export type ImageProcessorResult = {
	buffer: Buffer;
	mimeType: string;
	size: number;
	extension: string;
	shouldStore: boolean;
};
export type ImageProcessor = (
	stream: Readable,
	options: ImageProcessorOptions,
) => ServiceResponse<ImageProcessorResult>;

export type UrlStrategy = (media: { key: string }) => string;

// the version of config that is used in the lucid.config.ts file
export interface LucidConfig {
	/** A Postgres, SQLite or LibSQL database adapter instance. These can be imported from `@lucidcms/core/adapters`. */
	db: DatabaseAdapter;
	/** The KV adapter to use. If not provided, it will fallback to a better-sqlite3 custom adapter, then falls back to a passthrough adapter. */
	kv?: KVAdapter;
	/** The cors configuration. */
	cors?: {
		/** Allowed origins. Your configured host is already added by default. */
		origin?: string[];
		/** Allowed headers. */
		allowHeaders?: string[];
	};
	/** The host of the Lucid instance. */
	host: string;
	/** `64 character` length keys to encrypt and sign data. */
	keys: {
		/** Used to encrypt user secrets and API keys. Must be `64 characters` long. */
		encryptionKey: string;
		/** Used to sign cookies. Must be `64 characters` long. */
		cookieSecret: string;
		/** Used to sign the access token JWT. Must be `64 characters` long. */
		accessTokenSecret: string;
		/** Used to sign the refresh token JWT. Must be `64 characters` long. */
		refreshTokenSecret: string;
	};
	/** The logger configuration */
	logger?: {
		/** The log level to use. */
		level?: LogLevel;
		/** Custom log transport. If not provided, logs will default to console output. */
		transport?: LogTransport;
	};
	/** Disables the OpenAPI documentation site. */
	disableOpenAPI?: boolean;
	/** Localization settings. */
	localization?: {
		/** A list of locales you want to write content in. */
		locales: {
			/** The label of the locale. Eg. `English`, `French`, `German` etc. */
			label: string;
			/** The code of the locale. Eg. `en`, `fr`, `de` etc. */
			code: string;
		}[];
		/** The default locale code. Eg. `en`. */
		defaultLocale: string;
	};
	/** Email settings. */
	email?: {
		/** The email strategy identifier. */
		identifier?: string;
		/** The email from settings. */
		from?: {
			/** The email address to send emails from. */
			email: string;
			/** The name to send emails from. */
			name: string;
		};
		/** The email strategy services to use. These determine how emails are sent. */
		strategy?: EmailStrategy;
		/** When set to true, the plugin will not send emails but will still return as a success */
		simulate?: boolean;
	};
	/** The pre-rendered MJML templates to use. */
	preRenderedEmailTemplates?: Record<string, string>;
	/** Media settings. */
	media?: {
		/** The media adapter to use. */
		adapter?:
			| MediaAdapter
			| MediaAdapterInstance
			| Promise<MediaAdapterInstance>;
		/** The storage limit in bytes. */
		storageLimit?: number;
		/** The maximum file size in bytes. */
		maxFileSize?: number;
		/** The fallback image to use if an image cannot be found.
		 *  - If undefined, images will return a 404 status code.
		 *  - If a string is passed, it will attempt to stream the url as the response.
		 **/
		fallbackImage?: string;
		/** The media strategy services to use. These determine how media is stored, retrieved and deleted. */
		strategy?: MediaStrategy;
		/** The image processor to use. */
		imageProcessor?: ImageProcessor;
		/** The processed image limit. */
		processedImageLimit?: number;
		/** If true, the processed images will be stored. */
		storeProcessedImages?: boolean;
		/** If true, the format query parameter will be allowed on the CDN route. If enabled, there is a higher potential for abuse. */
		onDemandFormats?: boolean;
		/** The image presets to use. These are used to generate the processed images. */
		imagePresets?: Record<
			string,
			{
				width?: number;
				height?: number;
				format?: "webp" | "avif" | "jpeg" | "png";
				quality?: number;
			}
		>;
		/**
		 * The url strategy to use. This is used to generate the url for the media.
		 * This is useful when you want to overide using the cdn endpoint and stream media directly from your bucket for instance.
		 */
		urlStrategy?: UrlStrategy;
	};
	/** Hono middleware and extensions to register. Allows you to register custom routes, middleware, and more. */
	hono?: {
		middleware?: Array<
			(app: Hono<LucidHonoGeneric>, config: Config) => Promise<void>
		>;
		extensions?: Array<
			(app: Hono<LucidHonoGeneric>, config: Config) => Promise<void>
		>;
	};
	/** Queue configuration for background job processing. */
	queue?: {
		/** The queue adapter to use. If not provided, defaults to the worker adapter, then falls back to a passthrough adapter. */
		adapter?: QueueAdapter;
		/** Default options applied when jobs are added to the queue. */
		defaultJobOptions?: {
			/** Maximum number of retry attempts for failed jobs. Default: 3 */
			maxAttempts?: number;
		};
		/** Job processing configuration. */
		processing?: {
			/** Maximum number of jobs to process concurrently. Default: 5 */
			concurrentLimit?: number;
			/** Number of jobs to fetch from the database per poll. Default: 10 */
			batchSize?: number;
		};
	};
	/** Configure the soft-delete behavior for different data types */
	softDelete?: {
		/** The fallback number of days to retain deleted data. If left blank, this will fallback to 30 days. */
		defaultRetentionDays?: number;
		/** Define retention days for specific data types */
		retentionDays?: {
			/** Days to retain locales that don't exist in your lucid.config */
			locales?: number;
			/** Days to retain users */
			users?: number;
			/** Days to retain media */
			media?: number;
			/** Days to retain collections that don't exist in your lucid.config */
			collections?: number;
			/** Days to retain documents */
			documents?: number;
		};
	};
	/** Hooks to register. Allows you to register custom hooks to run before or after certain events. */
	hooks?: Array<AllHooks>;
	/** A list of collections instances to register. These can be imported from `@lucidcms/core`. */
	collections?: CollectionBuilder[];
	/** A list of Lucid plugins to register. Plugins simply merge their own config with the Lucid config. */
	plugins?: LucidPlugin[];
	/** Compiler options. */
	compilerOptions?: {
		paths?: {
			/** The output directory. */
			outDir?: string;
			/** The path to the email templates directory. This can be used to override or extend the default templates. */
			emailTemplates?: string;
		};
		/** Extend Vites config, this is used to build the SPA. */
		vite?: InlineConfig;
		watch?: {
			/** The files to ignore. */
			ignore?: string[];
		};
	};
}

export interface Config extends z.infer<typeof ConfigSchema> {
	db: DatabaseAdapter;
	kv?: KVAdapter;
	email?: {
		identifier?: string;
		from?: {
			email: string;
			name: string;
		};
		strategy?: EmailStrategy;
		simulate?: boolean;
	};
	disableOpenAPI: boolean;
	localization: {
		locales: {
			label: string;
			code: string;
		}[];
		defaultLocale: string;
	};
	media: {
		adapter?:
			| MediaAdapter
			| MediaAdapterInstance
			| Promise<MediaAdapterInstance>;
		storageLimit: number;
		maxFileSize: number;
		processedImageLimit: number;
		storeProcessedImages: boolean;
		fallbackImage: string | undefined;
		strategy?: MediaStrategy;
		imageProcessor?: ImageProcessor;
		onDemandFormats: boolean;
		imagePresets: Record<
			string,
			{
				width?: number;
				height?: number;
				format?: "webp" | "avif" | "jpeg" | "png";
				quality?: number;
			}
		>;
		urlStrategy?: UrlStrategy;
	};
	hono: {
		middleware: Array<
			(app: Hono<LucidHonoGeneric>, config: Config) => Promise<void>
		>;
		extensions: Array<
			(app: Hono<LucidHonoGeneric>, config: Config) => Promise<void>
		>;
	};
	queue: {
		adapter?: QueueAdapter;
		defaultJobOptions: {
			maxAttempts: number;
		};
		processing: {
			concurrentLimit: number;
			batchSize: number;
		};
	};
	softDelete: {
		defaultRetentionDays: number;
		retentionDays?: {
			locales?: number;
			users?: number;
			media?: number;
			collections?: number;
			documents?: number;
		};
	};
	hooks: Array<AllHooks>;
	collections: CollectionBuilder[];
	plugins: Array<LucidPlugin>;
	compilerOptions: {
		paths: {
			outDir: string;
			emailTemplates: string;
		};
		vite?: InlineConfig;
		watch: {
			ignore: string[];
		};
	};
}
