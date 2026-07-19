import constants from "../../../constants/constants.js";
import logger from "../../../libs/logger/index.js";
import type { ServiceFn } from "../../../types.js";
import { copy } from "../../i18n/index.js";
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
		await context.db.client.schema
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
				message: copy(
					"server:core.collections.migration.table.remove.failed.message",
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

export default removeTableQuery;
