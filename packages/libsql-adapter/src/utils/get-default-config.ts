import type { EnvironmentVariables } from "@lucidcms/core/types";
import type { LibsqlDialectConfig } from "../lib/kysely-libsql.js";

const getDefaultLibSQLConfig = (
	env: EnvironmentVariables,
): LibsqlDialectConfig => {
	if (typeof env.LIBSQL_URL !== "string" || env.LIBSQL_URL.length === 0) {
		throw new Error(
			"LibSQL adapter requires LIBSQL_URL when using `db: libsql` or `db: libsql()`. Set LIBSQL_URL, or pass explicit options with `libsql({ url, authToken })` or `libsql((env) => ({ ... }))`.",
		);
	}

	return {
		url: env.LIBSQL_URL,
		authToken:
			typeof env.LIBSQL_AUTH_TOKEN === "string"
				? env.LIBSQL_AUTH_TOKEN
				: undefined,
	};
};

export default getDefaultLibSQLConfig;
