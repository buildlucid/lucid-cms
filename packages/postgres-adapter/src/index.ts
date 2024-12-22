import { DatabaseAdapter } from "@lucidcms/core";
import type { DatabaseConfig } from "@lucidcms/core/types";
import pg from "pg";
import { PostgresDialect } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";

const { Pool } = pg;

class PostgresAdapter extends DatabaseAdapter {
	constructor(config: pg.PoolConfig) {
		super({
			adapter: "postgres",
			dialect: new PostgresDialect({
				pool: new Pool(config),
			}),
		});
	}
	// Getters
	get jsonArrayFrom() {
		return jsonArrayFrom;
	}
	get config(): DatabaseConfig {
		return {
			dataTypes: {
				serial: "serial",
				integer: "integer",
				boolean: "boolean",
				jsonb: "jsonb",
				text: "text",
				timestamp: "timestamp",
				char: (length: number) => `char(${length})`,
				varchar: (length?: number) =>
					length ? `varchar(${length})` : "varchar",
			},
			defaults: {
				timestamp: "NOW()",
				primaryKey: {
					autoIncrement: false,
				},
			},
			fuzzOperator: "%",
		};
	}
}

export default PostgresAdapter;
