import type { Context } from "hono";
import type { Config, UserPermissionsResponse } from "../types.js";

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

export type LucidHonoVariables = {
	config: Config;
	auth: LucidAuth;
};

export type LucidHonoGeneric = {
	Variables: LucidHonoVariables;
};

export type LucidHonoContext = Context<LucidHonoGeneric>;
