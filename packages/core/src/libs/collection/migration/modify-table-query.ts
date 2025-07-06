import { addColumn, modifyColumn, dropColumn } from "./column-builder.js";
import logger from "../../../libs/logger/index.js";
import constants from "../../../constants/constants.js";
import type { ServiceFn } from "../../../types.js";
import type { TableMigration } from "./types.js";
import type { AlterTableColumnAlteringBuilder } from "kysely";

/**
 * Executes table modifications, handling databases with and without multiple ALTER TABLE support
 */
const modifyTableQuery: ServiceFn<
	[
		{
			migration: TableMigration;
		},
	],
	undefined
> = async (context, data) => {
	try {
		const supportsMultipleAlter =
			context.config.db.supports("multipleAlterTables") ?? false;
		let altered = false;

		//* for db that support multiple ALTER TABLE operations (postgres)
		if (supportsMultipleAlter) {
			let query = context.db.schema.alterTable(
				data.migration.tableName,
			) as unknown as AlterTableColumnAlteringBuilder;

			for (const operation of data.migration.columnOperations) {
				switch (operation.type) {
					case "add":
						query = addColumn(query, operation, context.config.db);
						altered = true;
						logger.debug({
							message: `Operation of type 'add' ran on column '${operation.column.name}' for table '${data.migration.tableName}'`,
							scope: constants.logScopes.migrations,
						});
						break;
					case "modify":
						query = modifyColumn(query, operation, context.config.db);
						altered = true;
						logger.debug({
							message: `Operation of type 'modify' ran on column '${operation.column.name}' for table '${data.migration.tableName}'`,
							scope: constants.logScopes.migrations,
						});
						break;
					case "remove":
						query = dropColumn(query, operation, context.config.db);
						altered = true;
						logger.debug({
							message: `Operation of type 'remove' ran on column '${operation.columnName}' for table '${data.migration.tableName}'`,
							scope: constants.logScopes.migrations,
						});
						break;
				}
			}

			if (altered) {
				await query.execute();
			}

			return {
				data: undefined,
				error: undefined,
			};
		}

		//* for dbs that dont support multiple ALTER TABLE ops (sqlite)
		const queries = [];
		for (const operation of data.migration.columnOperations) {
			let query = context.db.schema.alterTable(
				data.migration.tableName,
			) as unknown as AlterTableColumnAlteringBuilder;

			switch (operation.type) {
				case "add":
					query = addColumn(query, operation, context.config.db);
					altered = true;
					logger.debug({
						message: `Operation of type 'add' ran on column '${operation.column.name}' for table '${data.migration.tableName}'`,
						scope: constants.logScopes.migrations,
					});
					break;
				case "modify":
					query = modifyColumn(query, operation, context.config.db);
					altered = true;
					logger.debug({
						message: `Operation of type 'modify' ran on column '${operation.column.name}' for table '${data.migration.tableName}'`,
						scope: constants.logScopes.migrations,
					});
					break;
				case "remove":
					query = dropColumn(query, operation, context.config.db);
					altered = true;
					logger.debug({
						message: `Operation of type 'remove' ran on column '${operation.columnName}' for table '${data.migration.tableName}'`,
						scope: constants.logScopes.migrations,
					});
					break;
			}
			if (altered) {
				queries.push(query.execute());
				altered = false;
			}
		}

		await Promise.all(queries);

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
