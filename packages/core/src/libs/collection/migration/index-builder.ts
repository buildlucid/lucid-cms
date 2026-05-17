import constants from "../../../constants/constants.js";
import logger from "../../../libs/logger/index.js";
import type { ServiceContext } from "../../../types.js";
import type { CollectionSchemaIndex } from "../schema/types.js";

export const addIndex = async (
	context: ServiceContext,
	tableName: string,
	index: CollectionSchemaIndex,
) => {
	let query = context.db.client.schema
		.createIndex(index.name)
		.on(tableName)
		.columns(index.columns);

	if (index.unique) query = query.unique();

	await query.execute();
	logger.debug({
		message: `Operation of type 'add' ran on index '${index.name}' for table '${tableName}'`,
		scope: constants.logScopes.migrations,
	});
};

export const dropIndex = async (
	context: ServiceContext,
	tableName: string,
	indexName: string,
) => {
	await context.db.client.schema.dropIndex(indexName).ifExists().execute();
	logger.debug({
		message: `Operation of type 'remove' ran on index '${indexName}' for table '${tableName}'`,
		scope: constants.logScopes.migrations,
	});
};
