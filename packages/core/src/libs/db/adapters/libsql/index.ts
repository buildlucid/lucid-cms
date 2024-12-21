import { LibsqlDialect, type LibsqlDialectConfig } from "@libsql/kysely-libsql";
import { ParseJSONResultsPlugin } from "kysely";
import DatabaseAdapter from "../../adapter.js";
import { AdapterType, type DatabaseConfig } from "../../types.js";
import { jsonArrayFrom } from "kysely/helpers/sqlite";

export default class LibsqlAdapter extends DatabaseAdapter {
	constructor(config: LibsqlDialectConfig) {
		super({
			adapter: AdapterType.LIBSQL,
			dialect: new LibsqlDialect(config),
			plugins: [new ParseJSONResultsPlugin()],
		});
	}
	// Getters
	get jsonArrayFrom() {
		return jsonArrayFrom;
	}
	get fuzzOperator() {
		return "like" as const;
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
		};
	}
}
