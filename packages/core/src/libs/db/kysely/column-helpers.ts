import { type ColumnDefinitionBuilder, sql } from "kysely";
import { AdapterType, type ColumnTypes } from "../types.js";

export const defaultTimestamp = (
	col: ColumnDefinitionBuilder,
	adapter: AdapterType,
) => {
	switch (adapter) {
		case AdapterType.SQLITE:
			return col.defaultTo(sql`CURRENT_TIMESTAMP`);
		case AdapterType.POSTGRES:
			return col.defaultTo(sql`NOW()`);
		case AdapterType.LIBSQL:
			return col.defaultTo(sql`CURRENT_TIMESTAMP`);
	}
};

export const defaultTimestampSimple = (adapter: AdapterType) => {
	switch (adapter) {
		case AdapterType.SQLITE:
			return "CURRENT_TIMESTAMP";
		case AdapterType.POSTGRES:
			return "NOW()";
		case AdapterType.LIBSQL:
			return "CURRENT_TIMESTAMP";
	}
};

export const typeLookup = (
	type: "serial" | "integer" | "boolean" | "jsonb" | "text" | "timestamp",
	adapter: AdapterType,
): ColumnTypes => {
	switch (adapter) {
		case AdapterType.SQLITE:
			switch (type) {
				case "serial":
					return "integer";
				case "jsonb":
					return "json";
				case "boolean":
					return "integer";
				default:
					return type;
			}
		case AdapterType.POSTGRES:
			return type;
		case AdapterType.LIBSQL:
			switch (type) {
				case "serial":
					return "integer";
				case "jsonb":
					return "json";
				case "boolean":
					return "integer";
				default:
					return type;
			}
	}
};

export const primaryKeyColumn = (
	col: ColumnDefinitionBuilder,
	adapter: AdapterType,
) => {
	switch (adapter) {
		case AdapterType.SQLITE:
			return col.primaryKey().autoIncrement();
		case AdapterType.POSTGRES:
			return col.primaryKey();
		case AdapterType.LIBSQL:
			return col.primaryKey().autoIncrement();
	}
};
