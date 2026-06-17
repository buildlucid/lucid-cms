import type { EnvironmentVariables } from "@lucidcms/core/types";
import type { PostgresAdapterOptions } from "../types.js";

const getDefaultPostgresConfig = (
	env: EnvironmentVariables,
): PostgresAdapterOptions => {
	if (typeof env.DATABASE_URL !== "string" || env.DATABASE_URL.length === 0) {
		throw new Error(
			"Postgres adapter requires DATABASE_URL when using `db: postgres` or `db: postgres()`. Set DATABASE_URL, or pass explicit options with `postgres({ url })` or `postgres((env) => ({ ... }))`.",
		);
	}

	return {
		url: env.DATABASE_URL,
	};
};

export default getDefaultPostgresConfig;
