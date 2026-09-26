import type { AdminConfig } from "@lucidcms/admin/types";
import type { AgentDefinition } from "../libs/agent/types.js";
import type { AuthProvider } from "../libs/auth-providers/types.js";
import type CollectionBuilder from "../libs/collection/builders/collection-builder/index.js";
import type DatabaseAdapter from "../libs/db/adapter-base.js";
import type { TableDefinition } from "../libs/db/client/table/definition.js";
import type { MigrationDefinition } from "../libs/db/types.js";
import type {
	EmailAdapter,
	EmailAdapterInstance,
} from "../libs/email/types.js";
import type { AllHooks } from "../libs/hooks/types.js";
import type {
	HttpExtension,
	LucidCustomRouteDefinition,
} from "../libs/http/types.js";
import type {
	InterfaceDirection,
	LocaleDirection,
} from "../libs/i18n/types.js";
import type { AnyJobDefinition } from "../libs/jobs/types.js";
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
import type { AccessGroup } from "../libs/permission/access-config.js";
import type { LucidPluginDefinition } from "../libs/plugins/types.js";
import type {
	QueueAdapter,
	QueueAdapterInstance,
} from "../libs/queue/types.js";
import type {
	ResourceDirectories,
	ResourceSources,
} from "../libs/resources/types.js";
import type { SeedDefinition } from "../libs/seed/types.js";
import type { SkillDefinition } from "../libs/skills/types.js";
import type { McpToolDefinition } from "../libs/tools/types.js";

/** Content languages available to editors. Omit localization to keep content unassigned. */
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
	 * The default language for content, or null when no locales are configured.
	 */
	defaultLocale: string | null;
};

/** Languages offered for the admin interface and server messages. Defaults to English. */
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
};

/** Content Security Policy directives. Use CSP source expressions such as `"'self'"` or an HTTPS origin. */
export type SecurityContentSecurityPolicy = {
	/** Fallback sources for directives without their own source list. */
	defaultSrc?: string[];
	/** Allowed document base URLs. */
	baseUri?: string[];
	/** Allowed child browsing contexts. */
	childSrc?: string[];
	/** Allowed fetch, WebSocket and other connection destinations. */
	connectSrc?: string[];
	/** Allowed font sources. */
	fontSrc?: string[];
	/** Allowed form submission destinations. */
	formAction?: string[];
	/** Origins allowed to embed the app. */
	frameAncestors?: string[];
	/** Allowed iframe sources. */
	frameSrc?: string[];
	/** Allowed image sources. */
	imgSrc?: string[];
	/** Allowed web app manifest sources. */
	manifestSrc?: string[];
	/** Allowed audio and video sources. */
	mediaSrc?: string[];
	/** Allowed embedded object sources. */
	objectSrc?: string[];
	/** Sandbox restrictions to enable. */
	sandbox?: string[];
	/** Allowed script sources. */
	scriptSrc?: string[];
	/** Allowed inline script attributes. */
	scriptSrcAttr?: string[];
	/** Allowed script element sources. */
	scriptSrcElem?: string[];
	/** Allowed style sources. */
	styleSrc?: string[];
	/** Allowed inline style attributes. */
	styleSrcAttr?: string[];
	/** Allowed stylesheet element sources. */
	styleSrcElem?: string[];
	/** Use an empty array to request HTTPS upgrades for insecure resources. */
	upgradeInsecureRequests?: string[];
	/** Allowed worker sources. */
	workerSrc?: string[];
	/** Trusted Types enforcement targets. */
	requireTrustedTypesFor?: string[];
	/** Allowed Trusted Types policy names. */
	trustedTypes?: string[];
};

/** Proxy trust, cross-origin access and response headers for the HTTP app. */
export type HttpSecurityConfig = {
	/**
	 * Whether proxy-forwarded protocol headers should be trusted when
	 * determining secure request context. Defaults to false.
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
	 * Response security headers. Use true for the standard header value, false to omit it, or a string for an explicit value.
	 */
	headers?: {
		/**
		 * Content-Security-Policy directives.
		 */
		contentSecurityPolicy?: SecurityContentSecurityPolicy;
		/** HTTPS transport policy. */
		strictTransportSecurity?: boolean | string;
		/** Embedding policy. */
		xFrameOptions?: boolean | string;
		/** Referrer information sent to other origins. */
		referrerPolicy?: boolean | string;
		/** Who may load this app's resources. */
		crossOriginResourcePolicy?: boolean | string;
		/** Cross-origin browsing context isolation. */
		crossOriginOpenerPolicy?: boolean | string;
		/** Requirements for cross-origin embedded resources. */
		crossOriginEmbedderPolicy?: boolean | string;
	};
};

/** Routes, app extensions and HTTP security settings. */
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
		 * Serve the OpenAPI documentation site. Defaults to false.
		 */
		enabled?: boolean;
	};
	/**
	 * Custom HTTP routes to register after Lucid's core routes.
	 */
	routes?: LucidCustomRouteDefinition[];
	/**
	 * Low-level HTTP app extensions.
	 */
	extensions?: HttpExtension[];
};

/** Choose which AI features are available when `ai.enabled` is true. */
export type AiFeatureConfig = {
	/** Allow image generation. Defaults to true. */
	imageGeneration?: boolean;
	/** Allow media alt text generation. Defaults to true. */
	altGeneration?: boolean;
	/** Allow field value generation. Defaults to true. */
	customFieldGeneration?: boolean;
};

/** Separate secrets for encryption and signing. Keep these stable between deployments. */
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

/** Project settings returned by `defineConfig`'s `config` callback. Omitted options use Lucid or plugin defaults. */
export interface LucidConfig {
	/** Custom permission and integration scope groups. */
	access?: AccessGroup[];
	/** Resource directories relative to lucid.config. Defaults to ./lucid/<resource>, except public uses ./public. Set false to disable one. */
	directories?: ResourceDirectories;
	/** Additional resource files, directories, package exports or file URLs. These remain enabled when a project directory is disabled. */
	sources?: ResourceSources;
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
		 * Minimum severity to write. Defaults to "info".
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
			 * Allow sign-in with a password. Defaults to true.
			 */
			enabled?: boolean;
		};
		/**
		 * The authentication providers to use.
		 */
		providers?: AuthProvider[];
	};
	/**
	 * AI feature availability. Pass a boolean to toggle every AI feature at once.
	 */
	ai?:
		| boolean
		| {
				/**
				 * Allow AI features, including MCP, in the admin and API. Defaults to true.
				 */
				enabled?: boolean;
				/**
				 * Per-feature AI availability. Omitted features default to enabled.
				 */
				features?: AiFeatureConfig;
				/** Serve tools and skills over MCP at `/lucid/mcp`. Disabled unless configured. */
				mcp?: {
					/** Defaults to true once `mcp` is configured. */
					enabled?: boolean;
					/** Additional MCP tools. Lucid's content tools are always available. */
					tools?: McpToolDefinition[];
					skills?: SkillDefinition[];
				};
				/** Agents available in the admin, created with `defineAgent`. Requires a connected Lucid AI account. */
				agents?: AgentDefinition[];
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
		 * Named migration definitions to
		 * run after Lucid's core migrations, generated collection migrations and
		 * collection sync. Migrations are created with the `defineMigration` helper
		 * and names must start with a 13 digit timestamp, eg.
		 * `1751400000000-example`.
		 */
		definitions?: MigrationDefinition[];
	};
	/**
	 * Repeatable data seed settings.
	 */
	seeds?: {
		/**
		 * Named seed definitions. Plugin seed names should use a namespace such
		 * as `pages:example` to avoid collisions without imposing one in code.
		 */
		definitions?: SeedDefinition[];
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
		 * Report successful email sends without contacting the email provider. Defaults to false.
		 */
		simulate?: boolean;
		/**
		 * Days after creation during which an email may be resent. Defaults to 7.
		 */
		resendWindowDays?: number;
		/**
		 * Mustache template contents keyed by template name, available without reading files at runtime.
		 */
		templates?: Record<string, string>;
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
		/** Upload and total storage limits. */
		limits?: {
			/**
			 * Total storage limit in bytes. Defaults to false, with no limit.
			 */
			storageBytes?: number | false;
			/**
			 * Maximum upload size in bytes. Defaults to 16 MiB.
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
					/** Target width in pixels. */
					width?: number;
					/** Target height in pixels. */
					height?: number;
					/** How the image fits the requested dimensions. Support depends on the delivery adapter. */
					fit?: "cover" | "contain" | "fill" | "inside" | "outside";
					/** Output image format. */
					format?: "webp" | "avif" | "jpeg" | "png";
					/** Output quality from 1 to 100. */
					quality?: number;
					/** Clockwise rotation in degrees. */
					rotate?: 0 | 90 | 180 | 270;
				}
			>;
			/** Lucid CDN caching for locally processed image variants. */
			cache?: {
				/** Store processed variants in the configured media storage. Defaults to true. */
				enabled?: boolean;
				/** Maximum cached variants per source file. Defaults to 10. */
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
		/** Fallback delivery for missing videos. */
		video?: {
			/**
			 * The fallback video URL to redirect to when a video cannot be found.
			 */
			fallbackUrl?: string;
		};
	};
	/**
	 * Queue configuration for durable job delivery.
	 */
	queue?: {
		/**
		 * The queue adapter to use. If omitted, Lucid executes durable jobs inline.
		 */
		adapter?:
			| QueueAdapter
			| QueueAdapterInstance
			| Promise<QueueAdapterInstance>;
	};
	/**
	 * Durable job definitions and retention settings.
	 */
	jobs?: {
		/** Job definitions registered by the project and its plugins. */
		definitions?: AnyJobDefinition[];
		/** How long terminal jobs and their schedule history remain visible. */
		retention?: {
			/** Non-negative number of days to retain completed jobs. Defaults to 7. */
			completedDays?: number;
			/** Non-negative number of days to retain failed and cancelled jobs. Defaults to 30. */
			failedDays?: number;
		};
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
		 * Override retention for specific data types with a positive whole number of days.
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
	 * CollectionBuilder instances to register.
	 */
	collections?: CollectionBuilder[];
	/** Browser components and assets. Modules are imported only by the admin build. */
	admin?: AdminConfig;
	/**
	 * Plugins to register. Their defaults provide fallbacks; explicit project settings win.
	 * Plugin configure callbacks run afterwards, then the project configure callback runs last.
	 */
	plugins?: LucidPluginDefinition[];
	/**
	 * Build options.
	 */
	build?: {
		/** The output directory. Defaults to "dist". */
		outDir?: string;
		/** Files excluded from development rebuilds. */
		watch?: {
			/**
			 * The files to ignore.
			 */
			ignore?: string[];
		};
	};
	/**
	 * Brand configuration for white-labelling your Lucid CMS instance.
	 * The name is used in outgoing emails.
	 */
	brand?: {
		/**
		 * The name of your application or organisation.
		 */
		name?: string;
	};
}

/** Runtime configuration after defaults, plugin contributions and configure callbacks have been applied. */
export interface ResolvedLucidConfig {
	access: AccessGroup[];
	host?: string;
	logger: {
		level: LogLevel;
		transport?: LogTransport;
	};
	directories: Required<ResourceDirectories>;
	sources: ResourceSources;
	db: DatabaseAdapter;
	tables: TableDefinition[];
	migrations: {
		definitions: MigrationDefinition[];
	};
	seeds: {
		definitions: SeedDefinition[];
	};
	secrets: SecretConfig;
	telemetry: boolean;
	kv?: {
		adapter?: KVAdapter | KVAdapterInstance | Promise<KVAdapterInstance>;
	};
	auth: {
		password: {
			enabled: boolean;
		};
		providers: AuthProvider[];
	};
	email: {
		from?: {
			email?: string;
			name?: string;
		};
		adapter?:
			| EmailAdapter
			| EmailAdapterInstance
			| Promise<EmailAdapterInstance>;
		simulate: boolean;
		resendWindowDays: number;
		templates?: Record<string, string>;
	};
	http: {
		security: HttpSecurityConfig & {
			trustProxyHeaders: boolean;
		};
		openAPI: {
			enabled: boolean;
		};
		routes: LucidCustomRouteDefinition[];
		extensions: HttpExtension[];
	};
	ai: {
		enabled: boolean;
		features: Required<AiFeatureConfig>;
		mcp: {
			enabled: boolean;
			tools: McpToolDefinition[];
			skills: SkillDefinition[];
		};
		agents: AgentDefinition[];
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
	queue: {
		adapter?:
			| QueueAdapter
			| QueueAdapterInstance
			| Promise<QueueAdapterInstance>;
	};
	jobs: {
		definitions: AnyJobDefinition[];
		retention: {
			completedDays: number;
			failedDays: number;
		};
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
	admin: Required<AdminConfig>;
	plugins: Array<LucidPluginDefinition>;
	brand: {
		name: string;
	};
	build: {
		outDir: string;
		watch: {
			ignore: string[];
		};
	};
}
