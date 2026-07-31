import type { Context } from "hono";
import type { DatabaseConnection } from "../libs/db/types.js";
import type { EmailAdapterInstance } from "../libs/email/types.js";
import type { TranslationStore } from "../libs/i18n/types.js";
import type { KVAdapterInstance } from "../libs/kv/types.js";
import type { MediaAdapterInstance } from "../libs/media/types.js";
import type { ExternalScope } from "../libs/permission/external-scopes.js";
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
	config: Config;
	database: DatabaseConnection;
	translationStore: TranslationStore;
	runtimeContext: AdapterRuntimeContext;
	queue: QueueAdapterInstance;
	kv: KVAdapterInstance;
	media: MediaAdapterInstance | null;
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

export type LucidHonoContext = Context<LucidHonoGeneric>;
