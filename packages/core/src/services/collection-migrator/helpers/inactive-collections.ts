import constants from "../../../constants/constants.js";
import logger from "../../../utils/logging/index.js";
import { collectionTableParts } from "./build-table-name.js";
import type { InferredTable } from "../../../types.js";
import type { CollectionBuilder } from "../../../builders.js";

/**
 * Works out the inactive collections tables based on the current db schema and available collections
 */
const getInactiveCollections = (props: {
	collections: CollectionBuilder[];
	dbSchema: InferredTable[];
}) => {
	const tablePrefix = `${constants.db.prefix}${collectionTableParts.document}${constants.db.collectionKeysJoin}`;
	const inactiveTables: Array<{
		collection: string;
		tables: string[];
	}> = [];

	for (const table of props.dbSchema) {
		if (!table.name.startsWith(tablePrefix)) continue;

		const collectionKey = table.name
			.split(tablePrefix)[1]
			?.split(constants.db.collectionKeysJoin)[0];
		if (!collectionKey) continue;

		const collectionExists =
			props.collections.findIndex((c) => c.key === collectionKey) !== -1;
		if (!collectionExists) {
			const existingCollection = inactiveTables.find(
				(t) => t.collection === collectionKey,
			);
			if (existingCollection) {
				existingCollection.tables.push(table.name);
			} else {
				inactiveTables.push({
					collection: collectionKey,
					tables: [table.name],
				});
			}
		}
	}

	if (inactiveTables.length > 0) {
		logger("debug", {
			message: `Found ${inactiveTables.length} inactive collections with ${inactiveTables.reduce(
				(acc, curr) => acc + curr.tables.length,
				0,
			)} total tables: ${inactiveTables
				.map((t) => `${t.collection} (${t.tables.length} tables)`)
				.join(", ")}`,
			scope: constants.logScopes.migrations,
		});
	}

	return inactiveTables;
};

export default getInactiveCollections;
