import type { Context } from "hono";
import type { TranslationStore } from "../libs/i18n/types.js";
import type { KVAdapterInstance } from "../libs/kv/types.js";
import type { QueueAdapterInstance } from "../libs/queue/types.js";
import type { AdapterRuntimeContext } from "../libs/runtime/types.js";
import type {
	Config,
	EnvironmentVariables,
	Locale,
	UserPermission,
} from "../types.js";

export type LucidAuth = {
	id: number;
	username: string;
	email: string;
	superAdmin: boolean;
	permissions: UserPermission["permissions"] | undefined;
	tenantKeys: string[];
	exp: number;
	iat: number;
	nonce: string;
};

export type LucidAccessToken = Pick<LucidAuth, "id" | "exp" | "iat" | "nonce">;

export type LucidClientIntegrationAuth = {
	id: number;
	key: string;
	scopes: string[];
	tenantKey: string | null;
};

export type LucidLocale = {
	code: Locale["code"];
};

export type LucidTenant = {
	key: string;
};

export type LucidExecutionContext = {
	waitUntil: (promise: Promise<unknown>) => void;
	passThroughOnException?: () => void;
};

export type LucidHonoVariables = {
	config: Config;
	translationStore: TranslationStore;
	runtimeContext: AdapterRuntimeContext;
	queue: QueueAdapterInstance;
	kv: KVAdapterInstance;
	auth: LucidAuth;
	clientIntegrationAuth: LucidClientIntegrationAuth;
	locale: LucidLocale;
	tenant: LucidTenant | null;
	env: EnvironmentVariables | null;
	cf: unknown | null;
	caches: CacheStorage | null;
	ctx: LucidExecutionContext | null;
};

export type LucidHonoGeneric = {
	Variables: LucidHonoVariables;
};

export type LucidHonoContext = Context<LucidHonoGeneric>;
