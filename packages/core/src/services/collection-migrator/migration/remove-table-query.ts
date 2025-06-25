import logger from "../../../libs/logger/index.js";
import constants from "../../../constants/constants.js";
import type { ServiceFn } from "../../../types.js";
import type { TableMigration } from "./types.js";

const removeTableQuery: ServiceFn<
	[
		{
			migration: TableMigration;
		},
	],
	undefined
> = async (context, data) => {
	try {
		await context.db.schema
			.dropTable(data.migration.tableName)
			.ifExists()
			.execute();

		logger.debug({
			message: `Table with the name of '${data.migration.tableName}' has been dropped`,
			scope: constants.logScopes.migrations,
		});

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
						: "An error occurred while removing a collection table",
			},
		};
	}
};

export default removeTableQuery;
