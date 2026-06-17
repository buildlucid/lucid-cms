import {
	createDatabaseAdapterFactory,
	type DatabaseAdapterFactory,
} from "@lucidcms/core/db";
import { LibSQLAdapter } from "../index.js";
import type { LibsqlDialectConfig } from "../lib/kysely-libsql.js";
import type { LibSQLAdapterOptionsFactory } from "../types.js";
import getDefaultLibSQLConfig from "../utils/get-default-config.js";

const createLibSQLAdapter = (
	config?: LibsqlDialectConfig | LibSQLAdapterOptionsFactory,
): LibSQLAdapter | DatabaseAdapterFactory<LibSQLAdapter> => {
	if (config === undefined) {
		return createDatabaseAdapterFactory({
			adapter: "libsql",
			resolve: (env) => new LibSQLAdapter(getDefaultLibSQLConfig(env)),
		});
	}

	if (typeof config === "function") {
		return createDatabaseAdapterFactory({
			adapter: "libsql",
			resolve: async (env) => new LibSQLAdapter(await config(env)),
		});
	}

	return new LibSQLAdapter(config);
};

export default createLibSQLAdapter;
