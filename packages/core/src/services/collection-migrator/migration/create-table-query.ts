import type { ServiceFn } from "../../../types.js";
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
		let query = context.db.schema.createTable(data.migration.tableName);

		for (const op of data.migration.columnOperations) {
			if (op.type !== "add") continue; //* if its a new table, only columns can be added

			query = query.addColumn(op.column.name, op.column.type, (column) => {
				let columnBuilder = column;

				if (op.column.primary) {
					columnBuilder =
						context.config.db.createPrimaryKeyColumn(columnBuilder);
				}

				if (op.column.nullable === false) {
					columnBuilder = columnBuilder.notNull();
				}

				if (op.column.default !== undefined) {
					// TODO: default value need parsing, if json for instance it needs stringifying (at least for sqlite, need further testing on postgres - might require an update to the databaseadapter class)
					columnBuilder = columnBuilder.defaultTo(op.column.default);
				}

				if (op.column.foreignKey) {
					columnBuilder = columnBuilder.references(
						`${op.column.foreignKey.table}.${op.column.foreignKey.column}`,
					);

					if (op.column.foreignKey.onDelete) {
						columnBuilder = columnBuilder.onDelete(
							op.column.foreignKey.onDelete,
						);
					}

					if (op.column.foreignKey.onUpdate) {
						columnBuilder = columnBuilder.onUpdate(
							op.column.foreignKey.onUpdate,
						);
					}
				}

				return columnBuilder;
			});
		}

		await query.execute();

		return {
			data: undefined,
			error: undefined,
		};
	} catch (err) {
		return {
			data: undefined,
			error: {
				message:
					err instanceof Error
						? err.message
						: "An error occurred while creating a collection table",
			},
		};
	}
};

export default createTableQuery;
