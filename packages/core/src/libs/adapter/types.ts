import type z from "zod";
import type LucidAdapterSchema from "./schema.js";
import type { Config } from "../../types/config.js";
import type { LucidHonoGeneric } from "../../types/hono.js";
import type { Hono } from "hono";

export type ServeHandler = (config: Config) => Promise<() => Promise<void>>;
export type BuildHandler = (
	config: Config,
	options: {
		configPath: string;
		outputPath: string;
	},
) => Promise<void>;
export type MiddlewareHandler = (app: Hono<LucidHonoGeneric>) => Promise<void>;

export type LucidAdapterResponse = z.infer<typeof LucidAdapterSchema>;
