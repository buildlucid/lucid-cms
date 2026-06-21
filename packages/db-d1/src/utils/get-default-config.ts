/// <reference types="@cloudflare/workers-types" />

import type { EnvironmentVariables } from "@lucidcms/core/types";
import { DEFAULT_D1_BINDING } from "../constants.js";
import type { D1DialectConfig } from "../lib/kysely-d1.js";

const isD1Binding = (value: unknown): value is D1Database | D1DatabaseSession =>
	typeof value === "object" &&
	value !== null &&
	"prepare" in value &&
	typeof value.prepare === "function" &&
	"batch" in value &&
	typeof value.batch === "function";

const getDefaultD1Config = (
	env: EnvironmentVariables,
	binding = DEFAULT_D1_BINDING,
): D1DialectConfig => {
	const database = env[binding];
	if (!isD1Binding(database)) {
		throw new Error(
			`Cloudflare D1 database adapter requires a D1 binding named "${binding}". Enable it with \`cloudflare({ wrangler: { bindings: { d1: true } } })\`, pass a matching binding with \`d1({ binding: "${binding}" })\`, or pass explicit options with \`d1({ database })\` / \`d1((env) => ({ database: env.${binding} }))\`.`,
		);
	}

	return {
		database,
	};
};

export default getDefaultD1Config;
