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

export type MediaStrategyStream = (key: string) => ServiceResponse<{
	contentLength: number | undefined;
	contentType: string | undefined;
	body: Readable;
}>;

export type MediaStrategyUploadSingle = (props: {
	key: string;
	data: Readable | Buffer;
	meta: Omit<
		MediaKitMeta,
		| "blurHash"
		| "averageColour"
		| "isDark"
		| "isLight"
		| "tempPath"
		| "name"
		| "key"
		| "etag"
	>;
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
		storage?: number;
		/** The maximum file size in bytes. */
		maxSize?: number;
		/** The processed image settings. */
		processed?: {
			/** The total amount of processed images allow for a single image media item. */
			limit?: number;
			/** If the processed images should be stored using the uploadSingle media strategy. If false, processed images are generated on request. */
			store?: boolean;
		};
		/** The fallback image to use if an image cannot be found.
		 *  - If false or underfined, images will return a 404 status code.
		 *  - If a string is passed, it will attempt to stream the url as the response.
		 *  - If true, the default fallback image will be used.
		 **/
		fallbackImage?: string | boolean | undefined;
		/** The media strategy services to use. These determine how media is stored, retrieved and deleted. */
		strategy?: MediaStrategy;
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
	localisation: {
		locales: {
			label: string;
			code: string;
		}[];
		defaultLocale: string;
	};
	media: {
		storage: number;
		maxSize: number;
		processed: {
			limit: number;
			store: boolean;
		};
		fallbackImage: string | boolean | undefined;
		strategy?: MediaStrategy;
	};
	fastifyExtensions: Array<(fastify: FastifyInstance) => Promise<void>>;
	hooks: Array<AllHooks>;
	collections: CollectionBuilder[];
	plugins: Array<LucidPlugin>;
	vite?: InlineConfig;
}
