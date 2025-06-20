import type z from "zod/v4";
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
export type MiddlewareHandler = (
	app: Hono<LucidHonoGeneric>,
	config: Config,
) => Promise<void>;

export type LucidAdapterResponse = z.infer<typeof LucidAdapterSchema>;
