import { type ColumnDefinitionBuilder, sql } from "kysely";
import { AdapterType } from "../types.js";

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

export const primaryKeyColumnType = (adapter: AdapterType) => {
	switch (adapter) {
		case AdapterType.SQLITE:
			return "integer";
		case AdapterType.POSTGRES:
			return "serial";
		case AdapterType.LIBSQL:
			return "integer";
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
