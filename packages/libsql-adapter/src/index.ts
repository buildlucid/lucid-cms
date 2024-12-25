import { DatabaseAdapter } from "@lucidcms/core";
import type { DatabaseConfig } from "@lucidcms/core/types";
import { LibsqlDialect, type LibsqlDialectConfig } from "@libsql/kysely-libsql";
import { ParseJSONResultsPlugin } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/sqlite";

class LibSQLAdapter extends DatabaseAdapter {
	constructor(config: LibsqlDialectConfig) {
		super({
			adapter: "libsql",
			dialect: new LibsqlDialect(config),
			plugins: [new ParseJSONResultsPlugin()],
		});
	}
	// Getters
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
			fuzzOperator: "like",
		};
	}
	formatDefaultValue(value: unknown): unknown {
		if (typeof value === "object" && value !== null) {
			return JSON.stringify(value);
		}
		return value;
	}
}

export default LibSQLAdapter;
