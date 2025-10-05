import type { Context } from "hono";
import type {
	Config,
	EnvironmentVariables,
	LocalesResponse,
	UserPermissionsResponse,
} from "../types.js";
import type { QueueAdapterInstance } from "../libs/queues/types.js";

export type LucidAuth = {
	id: number;
	username: string;
	email: string;
	superAdmin: boolean;
	permissions: UserPermissionsResponse["permissions"] | undefined;
	exp: number;
	iat: number;
	nonce: string;
};

export type LucidClientIntegrationAuth = {
	id: number;
	key: string;
};

export type LucidLocale = {
	code: LocalesResponse["code"];
};

export type LucidHonoVariables = {
	config: Config;
	queue: QueueAdapterInstance;
	auth: LucidAuth;
	clientIntegrationAuth: LucidClientIntegrationAuth;
	locale: LucidLocale;
	env: EnvironmentVariables | null;
};

export type LucidHonoGeneric = {
	Variables: LucidHonoVariables;
};

export type LucidHonoContext = Context<LucidHonoGeneric>;
