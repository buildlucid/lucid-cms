import type {
	DatabaseAdapterCreator,
	DatabaseAdapterFactory,
	DatabaseAdapterOptionsFactory,
} from "@lucidcms/core/db";
import type postgresClient from "postgres";
import type { PostgresAdapter } from "./index.js";

export type PostgresClientOptions = Omit<
	NonNullable<Parameters<typeof postgresClient>[1]>,
	"onnotice"
>;

export type PostgresAdapterOptions = PostgresClientOptions & {
	url: string;
};

export type PostgresAdapterOptionsFactory =
	DatabaseAdapterOptionsFactory<PostgresAdapterOptions>;

export type PostgresAdapterCreator = {
	(): DatabaseAdapterFactory<PostgresAdapter>;
	(config: PostgresAdapterOptions): PostgresAdapter;
	(
		config: PostgresAdapterOptionsFactory,
	): DatabaseAdapterFactory<PostgresAdapter>;
} & DatabaseAdapterCreator<PostgresAdapter>;
