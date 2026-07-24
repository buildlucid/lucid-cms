import {
	createDatabaseAdapterFactory,
	type DatabaseAdapterFactory,
} from "@lucidcms/core/db";
import { LibSQLAdapter } from "../index.js";
import type { LibsqlDialectConfig } from "../lib/kysely-libsql.js";
import type { LibSQLAdapterOptionsFactory } from "../types.js";

const createLibSQLAdapter = (
	config?: LibsqlDialectConfig | LibSQLAdapterOptionsFactory,
): LibSQLAdapter | DatabaseAdapterFactory<LibSQLAdapter> => {
	if (config === undefined) {
		return createDatabaseAdapterFactory({
			adapter: "libsql",
			resolve: () => new LibSQLAdapter(),
		});
	}

	if (typeof config === "function") {
		return createDatabaseAdapterFactory({
			adapter: "libsql",
			resolve: () => new LibSQLAdapter(config),
		});
	}

	return new LibSQLAdapter(config);
};

export default createLibSQLAdapter;
