import { addColumn, modifyColumn, dropColumn } from "./column-builder.js";
import type { ServiceFn } from "../../../types.js";
import type { TableMigration } from "./types.js";
import type {
	AlterTableColumnAlteringBuilder,
	AlterTableBuilder,
} from "kysely";

const modifyTableQuery: ServiceFn<
	[
		{
			migration: TableMigration;
		},
	],
	undefined
> = async (context, data) => {
	try {
		//* execute doesnt exist on AlterTableBuilder, after column add/modify/drop the type is AlterTableColumnAlteringBuilder
		let query = context.db.schema.alterTable(
			data.migration.tableName,
		) as unknown as AlterTableColumnAlteringBuilder;
		let altered = false;

		for (const operation of data.migration.columnOperations) {
			switch (operation.type) {
				case "add":
					query = addColumn(query, operation, context.config.db);
					altered = true;
					break;
				case "modify":
					query = modifyColumn(query, operation, context.config.db);
					altered = true;
					break;
				case "remove":
					query = dropColumn(query, operation, context.config.db);
					altered = true;
					break;
			}
		}

		if (altered) await query.execute();

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
						: "An error occurred while modifying a collection table",
			},
		};
	}
};

export default modifyTableQuery;
