import { POSTGRES_URL_ENV } from "../services/services.ts";
import libsqlDriver from "./libsql.ts";
import pgliteDriver from "./pglite.ts";
import postgresDriver from "./postgres.ts";
import sqliteDriver from "./sqlite.ts";
import type { DatabaseDriver, DatabaseKey } from "./types.ts";

const drivers = [sqliteDriver, libsqlDriver, pgliteDriver, postgresDriver];

/** Finds the driver that made a template, by its key. */
export const getDriver = (key: string): DatabaseDriver => {
	const driver = drivers.find((candidate) => candidate.key === key);
	if (!driver) {
		throw new Error(`No database driver is registered as "${key}".`);
	}
	return driver;
};

/**
 * Picks the driver for the database a setup asks for.
 * Postgres uses a real server when one is available, and falls back to PGlite in memory.
 */
export const resolveDriver = (database: DatabaseKey): DatabaseDriver => {
	if (database === "postgres") {
		return getDriver(process.env[POSTGRES_URL_ENV] ? "postgres" : "pglite");
	}
	return getDriver(database);
};
