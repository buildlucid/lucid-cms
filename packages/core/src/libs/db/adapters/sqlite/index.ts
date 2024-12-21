import DatabaseAdapter from "../../adapter.js";
import {
	SqliteDialect,
	type SqliteDialectConfig,
	ParseJSONResultsPlugin,
} from "kysely";
import { AdapterType, type DatabaseConfig } from "../../types.js";
import { jsonArrayFrom } from "kysely/helpers/sqlite";

export default class SqliteAdapter extends DatabaseAdapter {
	constructor(config: SqliteDialectConfig) {
		super({
			adapter: AdapterType.SQLITE,
			dialect: new SqliteDialect(config),
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
