import type { Context } from "hono";
import type { Config } from "../types.js";

export type LucidHonoVariables = {
	config: Config;
};

export type LucidHonoGeneric = {
	Variables: LucidHonoVariables;
};

export type LucidHonoContext = Context<LucidHonoGeneric>;
