import { DatabaseAdapter } from "@lucidcms/core";
import type { DatabaseConfig } from "@lucidcms/core/types";
import {
	SqliteDialect,
	ParseJSONResultsPlugin,
	type SqliteDialectConfig,
} from "kysely";
import { jsonArrayFrom } from "kysely/helpers/sqlite";

class SQLiteAdapter extends DatabaseAdapter {
	constructor(config: SqliteDialectConfig) {
		super({
			adapter: "sqlite",
			dialect: new SqliteDialect(config),
			plugins: [new ParseJSONResultsPlugin()],
		});
	}
	get jsonArrayFrom() {
		return jsonArrayFrom;
	}
	get config(): DatabaseConfig {
		return {
			dataTypes: {
				serial: "integer",
				integer: "integer",
				boolean: "integer",
				jsonb: "json",
				text: "text",
				timestamp: "timestamp",
				char: "text",
				varchar: "text",
			},
			defaults: {
				timestamp: "CURRENT_TIMESTAMP",
				primaryKey: {
					autoIncrement: true,
				},
			},
			fuzzOperator: "like" as const,
		};
	}
	formatDefaultValue(value: unknown): unknown {
		if (typeof value === "object" && value !== null) {
			return JSON.stringify(value);
		}
		return value;
	}
}

export default SQLiteAdapter;
