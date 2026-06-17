import {
	createDatabaseAdapterFactory,
	type DatabaseAdapterFactory,
} from "@lucidcms/core/db";
import { PostgresAdapter } from "../index.js";
import type {
	PostgresAdapterOptions,
	PostgresAdapterOptionsFactory,
} from "../types.js";
import getDefaultPostgresConfig from "./get-default-config.js";

const createPostgresAdapter = (
	config?: PostgresAdapterOptions | PostgresAdapterOptionsFactory,
): PostgresAdapter | DatabaseAdapterFactory<PostgresAdapter> => {
	if (config === undefined) {
		return createDatabaseAdapterFactory({
			adapter: "postgres",
			resolve: (env) => new PostgresAdapter(getDefaultPostgresConfig(env)),
		});
	}

	if (typeof config === "function") {
		return createDatabaseAdapterFactory({
			adapter: "postgres",
			resolve: async (env) => new PostgresAdapter(await config(env)),
		});
	}

	return new PostgresAdapter(config);
};

export default createPostgresAdapter;
