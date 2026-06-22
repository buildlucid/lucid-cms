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
			`Cloudflare D1 database adapter requires a D1 binding named "${binding}". The binding was not present in the runtime environment; configure the D1 binding in the Cloudflare runtime or pass explicit database options.`,
		);
	}

	return {
		database,
	};
};

export default getDefaultD1Config;
