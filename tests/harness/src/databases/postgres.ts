import postgres from "postgres";
import { POSTGRES_URL_ENV } from "../services/services.ts";
import defineDriver from "./define-driver.ts";

type PostgresState = { database: string };

const getServerUrl = (): string => {
	const url = process.env[POSTGRES_URL_ENV];
	if (!url) {
		throw new Error(`${POSTGRES_URL_ENV} is not set.`);
	}
	return url;
};

/** Runs statements on the server's own database, then disconnects. */
const withServer = async <Result>(
	run: (sql: postgres.Sql) => Promise<Result>,
): Promise<Result> => {
	const sql = postgres(getServerUrl(), { max: 1, onnotice: () => {} });
	try {
		return await run(sql);
	} finally {
		await sql.end();
	}
};

const urlFor = (database: string): string => {
	const url = new URL(getServerUrl());
	url.pathname = `/${database}`;
	return url.href;
};

const drop = (database: string) =>
	withServer((sql) =>
		sql`DROP DATABASE IF EXISTS ${sql(database)} WITH (FORCE)`.then(
			() => undefined,
		),
	);

/** A real Postgres server, where each copy is a database created from a template database. */
const postgresDriver = defineDriver<PostgresState>({
	key: "postgres",
	capabilities: { add: ["database.concurrentWrites"] },
	createTemplate: async (location) => {
		const database = location.name;
		await withServer((sql) => sql`CREATE DATABASE ${sql(database)}`);

		return {
			url: urlFor(database),
			//* Postgres only copies a template nothing is connected to, which holds once its writers exit
			seal: async () => ({ database }),
			discard: () => drop(database),
		};
	},
	clone: async (state, location) => {
		const database = location.name;
		await withServer(
			(sql) =>
				sql`CREATE DATABASE ${sql(database)} TEMPLATE ${sql(state.database)}`,
		);

		return { url: urlFor(database), destroy: () => drop(database) };
	},
	destroyTemplate: (state) => drop(state.database),
	sweep: async (prefix) => {
		const left = await withServer(
			(sql) =>
				sql<
					{ datname: string }[]
				>`SELECT datname FROM pg_database WHERE starts_with(datname, ${prefix})`,
		);
		for (const { datname } of left) {
			await drop(datname);
		}
	},
});

export default postgresDriver;
