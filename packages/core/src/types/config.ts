import type z from "zod";
import type CollectionBuilder from "../libs/builders/collection-builder/index.js";
import type DatabaseAdapter from "../libs/db/adapter.js";
import type ConfigSchema from "../libs/config/config-schema.js";
import type { Readable } from "node:stream";
import type { MediaKitMeta } from "../libs/media-kit/index.js";
import type { AllHooks } from "./hooks.js";
import type { ServiceResponse } from "../utils/services/types.js";
import type { FastifyInstance } from "fastify";
import type { InlineConfig } from "vite";
import type { LogLevel } from "../utils/logging/index.js";
import type { MediaResponse } from "../types.js";

export type LucidPlugin = (config: Config) => Promise<{
	key: string;
	lucid: string;
	config: Config;
}>;

export type LucidPluginOptions<T> = (
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
		hash: string;
	},
) => Promise<{
	success: boolean;
	message: string;
}>;

export type MediaStrategyGetPresignedUrl = (
	key: string,
	meta: {
		host: string;
		mimeType: string;
		extension?: string;
	},
) => ServiceResponse<{
	url: string;
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
	meta: Omit<MediaKitMeta, "tempPath" | "name" | "key" | "etag">;
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

export type UrlStrategy = (media: {
	key: string;
}) => string;

// the version of config that is used in the lucid.config.ts file
export interface LucidConfig {
	/** A Postgres, SQLite or LibSQL database adapter instance. These can be imported from `@lucidcms/core/adapters`. */
	db: DatabaseAdapter;
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
	/** The log level to use. */
	logLevel?: LogLevel;
	/** Disables the swagger documentation site. */
	disableSwagger?: boolean;
	/** Localisation settings. */
	localisation?: {
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
	/** Paths to static assets. */
	paths?: {
		/** The path to the email templates directory. This can be used to override or extend the default templates. */
		emailTemplates?: string;
	};
	/** Email settings. */
	email?: {
		/** The email from settings. */
		from: {
			/** The email address to send emails from. */
			email: string;
			/** The name to send emails from. */
			name: string;
		};
		/** The email strategy services to use. These determine how emails are sent. */
		strategy: EmailStrategy;
	};
	/** Media settings. */
	media?: {
		/** The storage limit in bytes. */
		storageLimit?: number;
		/** The maximum file size in bytes. */
		maxFileSize?: number;
		/** The fallback image to use if an image cannot be found.
		 *  - If false or underfined, images will return a 404 status code.
		 *  - If a string is passed, it will attempt to stream the url as the response.
		 *  - If true, the default fallback image will be used.
		 **/
		fallbackImage?: string | boolean | undefined;
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
	/** Fastify extensions to register. Allows you to register custom routes, middleware, and more. */
	fastifyExtensions?: Array<(fastify: FastifyInstance) => Promise<void>>;
	/** Hooks to register. Allows you to register custom hooks to run before or after certain events. */
	hooks?: Array<AllHooks>;
	/** A list of collections instances to register. These can be imported from `@lucidcms/core/builders`. */
	collections?: CollectionBuilder[];
	/** A list of Lucid plugins to register. Plugins simply merge their own config with the Lucid config. */
	plugins?: LucidPlugin[];
	/** Extend Vites config */
	vite?: InlineConfig;
}

export interface Config extends z.infer<typeof ConfigSchema> {
	db: DatabaseAdapter;
	email?: {
		from: {
			email: string;
			name: string;
		};
		strategy: EmailStrategy;
	};
	disableSwagger: boolean;
	localisation: {
		locales: {
			label: string;
			code: string;
		}[];
		defaultLocale: string;
	};
	media: {
		storageLimit: number;
		maxFileSize: number;
		processedImageLimit: number;
		storeProcessedImages: boolean;
		fallbackImage: string | boolean | undefined;
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
	fastifyExtensions: Array<(fastify: FastifyInstance) => Promise<void>>;
	hooks: Array<AllHooks>;
	collections: CollectionBuilder[];
	plugins: Array<LucidPlugin>;
	vite?: InlineConfig;
}
