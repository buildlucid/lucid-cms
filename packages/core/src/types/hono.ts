import type { Context } from "hono";
import type {
	EnvironmentVariables,
	Locale,
	ResolvedLucidConfig,
	UserPermission,
} from "../exports/types.js";
import type LucidDatabase from "../libs/db/client/lucid-database.js";
import type { EmailAdapterInstance } from "../libs/email/types.js";
import type { TranslationStore } from "../libs/i18n/types.js";
import type { KVAdapterInstance } from "../libs/kv/types.js";
import type { MediaDeliveryAdapterInstance } from "../libs/media-delivery/types.js";
import type { MediaStorageAdapterInstance } from "../libs/media-storage/types.js";
import type { ExternalScope } from "../libs/permission/external-scopes.js";
import type { QueueAdapterInstance } from "../libs/queue/types.js";
import type { AdapterRuntimeContext } from "../libs/runtime/types.js";

/** Authenticated admin identity and permissions set by authenticateMiddleware. */
export type LucidUser = {
	id: number;
	username: string;
	email: string;
	superAdmin: boolean;
	permissions: UserPermission["permissions"] | undefined;
};

/** Admin identity with the verified access token metadata. */
export type LucidAuth = LucidUser & {
	exp: number;
	iat: number;
	nonce: string;
};

export type LucidAccessToken = Pick<LucidAuth, "id" | "exp" | "iat" | "nonce">;

type LucidExternalAuthBase = {
	scopes: ExternalScope[];
};

export type LucidApiKeyExternalAuth = LucidExternalAuthBase & {
	credential: {
		type: "api-key";
		integrationId: number;
	};
	principal:
		| {
				type: "system";
		  }
		| {
				type: "user";
				userId: number;
		  };
};

export type LucidOAuthExternalAuth = LucidExternalAuthBase & {
	credential: {
		type: "oauth";
		grantId: number;
		clientId: string;
	};
	principal:
		| {
				type: "system";
		  }
		| {
				type: "user";
				userId: number;
		  };
};

/** External credential, scopes and principal set by externalAuthenticationMiddleware. */
export type LucidExternalAuth =
	| LucidApiKeyExternalAuth
	| LucidOAuthExternalAuth;

export type LucidLocale = {
	code: Locale["code"];
};

export type LucidExecutionContext = {
	waitUntil: (promise: Promise<unknown>) => void;
	passThroughOnException?: () => void;
};

export type LucidHonoVariables = {
	config: ResolvedLucidConfig;
	db: LucidDatabase;
	translationStore: TranslationStore;
	runtimeContext: AdapterRuntimeContext;
	queue: QueueAdapterInstance;
	kv: KVAdapterInstance;
	mediaStorage: MediaStorageAdapterInstance | null;
	mediaDelivery: MediaDeliveryAdapterInstance;
	email: EmailAdapterInstance;
	requestId: string;
	auth: LucidAuth;
	externalAuth: LucidExternalAuth;
	externalUserId: number;
	locale: LucidLocale;
	env: EnvironmentVariables | null;
	cf: unknown | null;
	caches: CacheStorage | null;
	ctx: LucidExecutionContext | null;
};

export type LucidHonoGeneric = {
	Variables: LucidHonoVariables;
};

/** Hono request context carrying Lucid variables. Prefer defineRoute or createMiddleware for direct access to service helpers. */
export type LucidHonoContext = Context<LucidHonoGeneric>;
