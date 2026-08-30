import { createDatabaseAdapterFactory } from "@lucidcms/core/extension";
import type { DatabaseAdapterFactory } from "@lucidcms/core/types";
import { SQLiteAdapter } from "../index.js";
import type {
	SQLiteAdapterOptions,
	SQLiteAdapterOptionsFactory,
} from "../types.js";

const createSQLiteAdapter = (
	config?: SQLiteAdapterOptions | SQLiteAdapterOptionsFactory,
): SQLiteAdapter | DatabaseAdapterFactory<SQLiteAdapter> => {
	if (typeof config === "function") {
		return createDatabaseAdapterFactory({
			adapter: "sqlite",
			resolve: () => new SQLiteAdapter(config),
		});
	}

	return new SQLiteAdapter(config);
};

export default createSQLiteAdapter;
