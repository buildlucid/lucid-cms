import type z from "zod";
import type { AuthProvider } from "../libs/auth-providers/types.js";
import type CollectionBuilder from "../libs/collection/builders/collection-builder/index.js";
import type ConfigSchema from "../libs/config/config-schema.js";
import type DatabaseAdapter from "../libs/db/adapter-base.js";
import type { TableDefinition } from "../libs/db/client/table/definition.js";
import type { MigrationSource } from "../libs/db/types.js";
import type {
	EmailAdapter,
	EmailAdapterInstance,
} from "../libs/email/types.js";
import type { AllHooks } from "../libs/hooks/types.js";
import type {
	HttpExtension,
	LucidRouteDefinition,
} from "../libs/http/types.js";
import type {
	InterfaceDirection,
	LocaleDirection,
	TranslationSource,
} from "../libs/i18n/types.js";
import type { KVAdapter, KVAdapterInstance } from "../libs/kv/types.js";
import type { LogLevel, LogTransport } from "../libs/logger/types.js";
import type {
	MediaDeliveryAdapter,
	MediaDeliveryAdapterInstance,
} from "../libs/media-delivery/types.js";
import type {
	MediaStorageAdapter,
	MediaStorageAdapterInstance,
} from "../libs/media-storage/types.js";
import type { LucidPluginResponse } from "../libs/plugins/types.js";
import type {
	QueueAdapter,
	QueueAdapterInstance,
} from "../libs/queue/types.js";
import type { SeedSource } from "../libs/seed/types.js";

export type CopyPublicEntry =
	| string
	| {
			input: string;
			output?: string;
	  };

export type LocalizationConfig = {
	/**
	 * A list of locales you want to write content in.
	 */
	locales: {
		/**
		 * The label of the locale. Eg. `English`, `French`, `German` etc.
		 */
		label: string;
		/**
		 * The code of the locale. Eg. `en`, `fr`, `de` etc.
		 */
		code: string;
		/**
		 * The text direction for content written in this locale.
		 */
		direction?: LocaleDirection;
	}[];
	/**
	 * The default content locale code. Eg. `en`.
	 */
	defaultLocale: string;
};

export type I18nConfig = {
	/**
	 * A list of locales supported by the Lucid CMS interface.
	 */
	locales: {
		/**
		 * The label of the locale. Eg. `English`, `French`, `German` etc.
		 */
		label: string;
		/**
		 * The code of the locale. Eg. `en`, `fr`, `de` etc.
		 */
		code: string;
		/**
		 * The text direction for the locale.
		 */
		direction?: InterfaceDirection;
	}[];
	/**
	 * The default CMS interface locale code. Eg. `en`.
	 */
	defaultLocale: string;
	/**
	 * Translation files or directories to load for the CMS interface and API
	 * messages. Plugins should register package-local sources with exported
	 * package subpaths such as `@scope/plugin/translations`.
	 */
	sources?: TranslationSource[];
};

export type SecurityContentSecurityPolicy = {
	defaultSrc?: string[];
	baseUri?: string[];
	childSrc?: string[];
	connectSrc?: string[];
	fontSrc?: string[];
	formAction?: string[];
	frameAncestors?: string[];
	frameSrc?: string[];
	imgSrc?: string[];
	manifestSrc?: string[];
	mediaSrc?: string[];
	objectSrc?: string[];
	sandbox?: string[];
	scriptSrc?: string[];
	scriptSrcAttr?: string[];
	scriptSrcElem?: string[];
	styleSrc?: string[];
	styleSrcAttr?: string[];
	styleSrcElem?: string[];
	upgradeInsecureRequests?: string[];
	workerSrc?: string[];
	requireTrustedTypesFor?: string[];
	trustedTypes?: string[];
};

export type HttpSecurityConfig = {
	/**
	 * Whether proxy-forwarded protocol headers should be trusted when
	 * determining secure request context.
	 */
	trustProxyHeaders?: boolean;
	/**
	 * The CORS configuration.
	 */
	cors?: {
		/**
		 * Allowed origins.
		 */
		origin?: string[];
		/**
		 * Allowed headers.
		 */
		allowHeaders?: string[];
	};
	/**
	 * The secure headers configuration.
	 */
	headers?: {
		/**
		 * Content-Security-Policy directives.
		 */
		contentSecurityPolicy?: SecurityContentSecurityPolicy;
		strictTransportSecurity?: boolean | string;
		xFrameOptions?: boolean | string;
		referrerPolicy?: boolean | string;
		crossOriginResourcePolicy?: boolean | string;
		crossOriginOpenerPolicy?: boolean | string;
		crossOriginEmbedderPolicy?: boolean | string;
	};
};

export type HttpConfig = {
	/**
	 * HTTP transport and response security settings.
	 */
	security?: HttpSecurityConfig;
	/**
	 * OpenAPI documentation settings.
	 */
	openAPI?: {
		/**
		 * Whether the OpenAPI documentation site is enabled.
		 */
		enabled?: boolean;
	};
	/**
	 * Custom HTTP routes to register after Lucid's core routes.
	 */
	routes?: LucidRouteDefinition[];
	/**
	 * Low-level HTTP app extensions.
	 */
	extensions?: HttpExtension[];
};

export type AiFeatureConfig = {
	/* Enables AI Image generation */
	imageGeneration?: boolean;
	/* Enables AI alt text generation */
	altGeneration?: boolean;
	/* Enables AI custom field value generation */
	customFieldGeneration?: boolean;
};

export type SecretConfig = {
	/**
	 * Used to encrypt user secrets and API keys. Must be `64 characters` long.
	 */
	encryption: string;
	/**
	 * Used to sign cookies. Must be `64 characters` long.
	 */
	cookie: string;
	/**
	 * Used to sign the access token JWT. Must be `64 characters` long.
	 */
	accessToken: string;
	/**
	 * Used to sign the refresh token JWT. Must be `64 characters` long.
	 */
	refreshToken: string;
};

// the version of config that is used in the lucid.config.ts file
export interface LucidConfig {
	/**
	 * Describes custom tables that already exist in the database, allowing
	 * `context.db` to format and validate their queries. This does not create or
	 * migrate the tables.
	 */
	tables?: readonly TableDefinition[];
	/**
	 * KV storage settings.
	 */
	kv?: {
		/**
		 * The KV adapter to use. If not provided, Lucid will use the passthrough KV adapter.
		 */
		adapter?: KVAdapter | KVAdapterInstance | Promise<KVAdapterInstance>;
		/**
		 * Prefix keys with a non-empty namespace. Set to false to disable namespacing for the default KV adapter.
		 */
		namespace?: string | false;
	};
	/**
	 * HTTP transport configuration.
	 */
	http?: HttpConfig;
	/**
	 * The public host of the Lucid instance. If not provided, the request URL will be used.
	 * Values without a protocol are treated as HTTPS.
	 */
	host?: string;
	/**
	 * A single `64 character` root secret, or separate `64 character` secrets
	 * to encrypt and sign data.
	 */
	secrets: string | SecretConfig;
	/**
	 * Whether Lucid may send anonymous technical telemetry. Telemetry is enabled
	 * by default and can also be disabled with `LUCID_TELEMETRY_DISABLED=1`.
	 */
	telemetry?: boolean;
	/**
	 * Process-level logger configuration.
	 */
	logger?: {
		/**
		 * The log level to use.
		 */
		level?: LogLevel;
		/**
		 * Custom log transport. If not provided, logs default to console output.
		 */
		transport?: LogTransport;
	};
	/**
	 * The authentication configuration
	 */
	auth?: {
		/**
		 * Password authentication configuration
		 */
		password?: {
			/**
			 * Whether password authentication is enabled.
			 */
			enabled?: boolean;
		};
		/**
		 * The authentication providers to use.
		 */
		providers?: AuthProvider[];
	};
	/**
	 * AI feature availability.
	 */
	ai?: {
		/**
		 * Whether AI features are available in the admin UI and backend feature endpoints.
		 */
		enabled?: boolean;
		/**
		 * Per-feature AI availability. Omitted features default to enabled.
		 */
		features?: AiFeatureConfig;
	};
	/**
	 * Content localization settings.
	 */
	localization?: LocalizationConfig;
	/**
	 * Internationalisation settings for the admin UI and API messages.
	 */
	i18n?: I18nConfig;
	/**
	 * Custom database migration settings.
	 */
	migrations?: {
		/**
		 * Migration files, directories or inline `{ name, migration }` entries to
		 * run after Lucid's core migrations, generated collection migrations and
		 * collection sync. Migrations are created with the `defineMigration` helper
		 * and names must start with a 13 digit timestamp, eg.
		 * `1751400000000-example`.
		 */
		sources?: MigrationSource[];
	};
	/**
	 * Repeatable data seed settings.
	 */
	seeds?: {
		/**
		 * Seed files, directories, package subpaths, file URLs or inline
		 * `{ name, seed }` entries. Plugin seed names should use a namespace such
		 * as `pages:example` to avoid collisions without imposing one in code.
		 */
		sources?: SeedSource[];
	};
	/**
	 * Email settings.
	 */
	email?: {
		/**
		 * The email from settings.
		 */
		from?: {
			/**
			 * The email address to send emails from.
			 */
			email?: string;
			/**
			 * The name to send emails from.
			 */
			name?: string;
		};
		/**
		 * The email adapter to use. Determines how emails are sent.
		 */
		adapter?:
			| EmailAdapter
			| EmailAdapterInstance
			| Promise<EmailAdapterInstance>;
		/**
		 * When set to true, the plugin will not send emails but will still return as a success
		 */
		simulate?: boolean;
		/**
		 * Number of days an email can be resent for after it was created.
		 */
		resendWindowDays?: number;
		/**
		 * Email template settings.
		 */
		templates?: {
			/**
			 * The path to the email templates directory. Files ending in .mustache and .html can be used to override or extend the default templates.
			 */
			directory?: string;
			/**
			 * Pre-rendered Mustache templates to use at runtime.
			 */
			rendered?: Record<string, string>;
		};
	};
	/**
	 * Media settings.
	 */
	media?: {
		/**
		 * The storage adapter used to store, retrieve and delete media files.
		 */
		storage?:
			| MediaStorageAdapter
			| MediaStorageAdapterInstance
			| Promise<MediaStorageAdapterInstance>;
		/**
		 * The delivery adapter used to resolve media URLs and optional transformations.
		 */
		delivery?:
			| MediaDeliveryAdapter
			| MediaDeliveryAdapterInstance
			| Promise<MediaDeliveryAdapterInstance>;
		limits?: {
			/**
			 * The storage limit in bytes.
			 */
			storageBytes?: number | false;
			/**
			 * The maximum upload size in bytes.
			 */
			uploadBytes?: number;
		};
		/**
		 * Image settings.
		 */
		images?: {
			/**
			 * Named image variants exposed by the configured delivery adapter.
			 */
			presets?: Record<
				string,
				{
					width?: number;
					height?: number;
					fit?: "cover" | "contain" | "fill" | "inside" | "outside";
					format?: "webp" | "avif" | "jpeg" | "png";
					quality?: number;
					rotate?: 0 | 90 | 180 | 270;
				}
			>;
			/** Lucid CDN caching for locally processed image variants. */
			cache?: {
				/** Store processed variants in the configured media storage. */
				enabled?: boolean;
				/** Maximum number of cached variants for each source file. */
				maxVariantsPerFile?: number;
			};
			/**
			 * If true, the format query parameter will be allowed on the CDN route. If enabled, there is a higher potential for abuse.
			 */
			allowFormatQuery?: boolean;
			/**
			 * The fallback image URL to redirect to when an image cannot be found.
			 */
			fallbackUrl?: string;
		};
		video?: {
			/**
			 * The fallback video URL to redirect to when a video cannot be found.
			 */
			fallbackUrl?: string;
		};
	};
	/**
	 * Queue configuration for background job processing.
	 */
	queue?: {
		/**
		 * The queue adapter to use. If not provided, Lucid will use the passthrough queue adapter.
		 */
		adapter?:
			| QueueAdapter
			| QueueAdapterInstance
			| Promise<QueueAdapterInstance>;
	};
	/**
	 * Configure the purge behavior for retained deleted data.
	 */
	retention?: {
		/**
		 * The fallback number of days to retain deleted data before purging. If left blank, this will fallback to 30 days.
		 */
		defaultPurgeAfterDays?: number;
		/**
		 * Define purge windows for specific retained data types.
		 */
		purgeAfterDays?: {
			/**
			 * Days to retain locales that don't exist in your lucid.config
			 */
			removedLocales?: number;
			/**
			 * Days to retain users
			 */
			deletedUsers?: number;
			/**
			 * Days to retain media
			 */
			deletedMedia?: number;
			/**
			 * Days to retain collections that don't exist in your lucid.config
			 */
			removedCollections?: number;
			/**
			 * Days to retain documents
			 */
			deletedDocuments?: number;
		};
	};
	/**
	 * Hooks to register. Allows you to register custom hooks to run before or after certain events.
	 */
	hooks?: Array<AllHooks>;
	/**
	 * A list of collections instances to register. These can be imported from `@lucidcms/core`.
	 */
	collections?: CollectionBuilder[];
	/**
	 * A list of Lucid plugins to register. Plugins simply merge their own config with the Lucid config.
	 */
	plugins?: LucidPluginResponse[];
	/**
	 * Build options.
	 */
	build?: {
		paths?: {
			/**
			 * The output directory.
			 */
			outDir?: string;
			/**
			 * Additional files or directories to copy into the public output directory.
			 */
			copyPublic?: CopyPublicEntry[];
		};
		watch?: {
			/**
			 * The files to ignore.
			 */
			ignore?: string[];
		};
	};
	/**
	 * Brand configuration for white-labelling your Lucid CMS instance.
	 * These values are used in emails and, in future, the admin interface.
	 */
	brand?: {
		/**
		 * The name of your application or organisation.
		 */
		name?: string;
	};
}

export interface Config extends z.infer<typeof ConfigSchema> {
	db: DatabaseAdapter;
	tables: TableDefinition[];
	migrations: {
		sources: MigrationSource[];
	};
	seeds: {
		sources: SeedSource[];
	};
	secrets: SecretConfig;
	telemetry: boolean;
	kv?: {
		adapter?: KVAdapter | KVAdapterInstance | Promise<KVAdapterInstance>;
		/**
		 * Prefix keys with a non-empty namespace. Set to false to disable namespacing for the default KV adapter.
		 */
		namespace?: string | false;
	};
	auth: {
		password: {
			enabled: boolean;
		};
		providers: AuthProvider[];
	};
	email: {
		from?: {
			email: string;
			name: string;
		};
		adapter?:
			| EmailAdapter
			| EmailAdapterInstance
			| Promise<EmailAdapterInstance>;
		simulate: boolean;
		resendWindowDays: number;
		templates: {
			directory: string;
			rendered?: Record<string, string>;
		};
	};
	http: {
		security: HttpSecurityConfig & {
			trustProxyHeaders: boolean;
		};
		openAPI: {
			enabled: boolean;
		};
		routes: LucidRouteDefinition[];
		extensions: HttpExtension[];
	};
	ai: {
		enabled: boolean;
		features: Required<AiFeatureConfig>;
	};
	localization: LocalizationConfig;
	i18n: Required<I18nConfig>;
	media: {
		storage?:
			| MediaStorageAdapter
			| MediaStorageAdapterInstance
			| Promise<MediaStorageAdapterInstance>;
		delivery?:
			| MediaDeliveryAdapter
			| MediaDeliveryAdapterInstance
			| Promise<MediaDeliveryAdapterInstance>;
		limits: {
			storageBytes: number | false;
			uploadBytes: number;
		};
		images: {
			presets: Record<
				string,
				{
					width?: number;
					height?: number;
					fit?: "cover" | "contain" | "fill" | "inside" | "outside";
					format?: "webp" | "avif" | "jpeg" | "png";
					quality?: number;
					rotate?: 0 | 90 | 180 | 270;
				}
			>;
			cache: {
				enabled: boolean;
				maxVariantsPerFile: number;
			};
			allowFormatQuery: boolean;
			fallbackUrl?: string;
		};
		video: {
			fallbackUrl?: string;
		};
	};
	queue?: {
		adapter?:
			| QueueAdapter
			| QueueAdapterInstance
			| Promise<QueueAdapterInstance>;
	};
	retention: {
		defaultPurgeAfterDays: number;
		purgeAfterDays?: {
			removedLocales?: number;
			deletedUsers?: number;
			deletedMedia?: number;
			removedCollections?: number;
			deletedDocuments?: number;
		};
	};
	hooks: Array<AllHooks>;
	collections: CollectionBuilder[];
	plugins: Array<LucidPluginResponse>;
	brand: {
		name: string;
	};
	build: {
		paths: {
			outDir: string;
			copyPublic: CopyPublicEntry[];
		};
		watch: {
			ignore: string[];
		};
	};
}
