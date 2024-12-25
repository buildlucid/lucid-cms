import { addColumn } from "./column-builder.js";
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

			query = addColumn(query, op, context.config.db);
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
