import type { DatabaseKey } from "../databases/types.ts";
import type { Service } from "./types.ts";

export const POSTGRES_URL_ENV = "HARNESS_POSTGRES_URL";
export const LIBSQL_URL_ENV = "HARNESS_LIBSQL_URL";
export const LIBSQL_ADMIN_URL_ENV = "HARNESS_LIBSQL_ADMIN_URL";

/** The service behind each database that needs one. Ports match `docker-compose.yml`. */
const services: Partial<Record<DatabaseKey, Service>> = {
	postgres: {
		name: "postgres",
		env: {
			[POSTGRES_URL_ENV]:
				"postgres://postgres:postgres@127.0.0.1:54329/postgres",
		},
	},
	libsql: {
		name: "libsql",
		env: {
			[LIBSQL_URL_ENV]: "http://localhost:58080",
			[LIBSQL_ADMIN_URL_ENV]: "http://localhost:59090",
		},
		healthUrl: "http://localhost:58080/health",
	},
};

export default services;
