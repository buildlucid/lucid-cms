import { crc32 } from "node:zlib";
import type { CreateTableBuilder } from "kysely";
import constants from "../../../constants/constants.js";
import type { ServiceFn } from "../../../exports/types.js";
import logger from "../../../libs/logger/index.js";
import { copy } from "../../i18n/index.js";
import { addColumn } from "./column-builder.js";
import { addIndex } from "./index-builder.js";
import type { TableMigration } from "./types.js";

const createTableQuery: ServiceFn<
	[
		{
			migration: TableMigration;
		},
	],
	undefined
> = async (context, data) => {
	try {
		let query: CreateTableBuilder<string, string> =
			context.db.kysely.schema.createTable(data.migration.tableName);

		for (const op of data.migration.columnOperations) {
			if (op.type !== "add") continue; //* if its a new table, only columns can be added

			query = addColumn(query, op, context.config.db);
			logger.debug({
				message: `Operation of type 'add' ran on column '${op.column.name}' for table '${data.migration.tableName}'`,
				scope: constants.logScopes.migrations,
			});
		}

		for (const [index, foreignKey] of (
			data.migration.foreignKeys ?? []
		).entries()) {
			query = query.addForeignKeyConstraint(
				`fk_composite_${crc32(data.migration.tableName).toString(16)}_${index}`,
				foreignKey.columns,
				foreignKey.table,
				foreignKey.references,
				(constraint) => {
					let configured = constraint;
					if (foreignKey.onDelete)
						configured = configured.onDelete(foreignKey.onDelete);
					if (foreignKey.onUpdate)
						configured = configured.onUpdate(foreignKey.onUpdate);
					return configured;
				},
			);
		}

		await query.execute();

		await Promise.all(
			data.migration.indexOperations
				.filter((op) => op.type === "add")
				.map((op) => addIndex(context, data.migration.tableName, op.index)),
		);

		return {
			data: undefined,
			error: undefined,
		};
	} catch (err) {
		return {
			data: undefined,
			error: {
				message: copy(
					"server:core.collections.migration.table.create.failed.message",
					{
						data: {
							tableName: data.migration.tableName,
							errorMessage: err instanceof Error ? err.message : String(err),
						},
					},
				),
			},
		};
	}
};

export default createTableQuery;
