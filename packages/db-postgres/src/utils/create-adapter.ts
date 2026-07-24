import {
	createDatabaseAdapterFactory,
	type DatabaseAdapterFactory,
} from "@lucidcms/core/db";
import { PostgresAdapter } from "../index.js";
import type {
	PostgresAdapterOptions,
	PostgresAdapterOptionsFactory,
} from "../types.js";

const createPostgresAdapter = (
	config?: PostgresAdapterOptions | PostgresAdapterOptionsFactory,
): PostgresAdapter | DatabaseAdapterFactory<PostgresAdapter> => {
	if (config === undefined) {
		return createDatabaseAdapterFactory({
			adapter: "postgres",
			resolve: () => new PostgresAdapter(),
		});
	}

	if (typeof config === "function") {
		return createDatabaseAdapterFactory({
			adapter: "postgres",
			resolve: () => new PostgresAdapter(config),
		});
	}

	return new PostgresAdapter(config);
};

export default createPostgresAdapter;
