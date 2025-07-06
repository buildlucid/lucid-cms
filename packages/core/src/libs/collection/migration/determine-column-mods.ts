import foreignKeysEqual from "../helpers/foreign-keys-equal.js";
import defaultValuesEqual from "../helpers/default-values-equal.js";
import type { InferredColumn } from "../../../types.js";
import type { CollectionSchemaColumn } from "../../../libs/collection/schema/types.js";
import type { ModifyColumnOperation } from "./types.js";

/**
 * Determines the modifications required to convert an existing column to a new column
 */
const determineColumnMods = (
	collectionInfCol: CollectionSchemaColumn,
	dbInfCol: CollectionSchemaColumn | InferredColumn,
): ModifyColumnOperation | null => {
	const changes: ModifyColumnOperation["changes"] = {};

	if (collectionInfCol.type !== dbInfCol.type) {
		changes.type = {
			from: dbInfCol.type,
			to: collectionInfCol.type,
		};
	}

	if (collectionInfCol.nullable !== dbInfCol.nullable) {
		changes.nullable = {
			from: dbInfCol.nullable,
			to: collectionInfCol.nullable,
		};
	}

	if (!defaultValuesEqual(collectionInfCol.default, dbInfCol.default)) {
		changes.default = {
			from: dbInfCol.default,
			to: collectionInfCol.default,
		};
	}

	if (!foreignKeysEqual(collectionInfCol.foreignKey, dbInfCol.foreignKey)) {
		changes.foreignKey = {
			from: dbInfCol.foreignKey,
			to: collectionInfCol.foreignKey,
		};
	}

	if (collectionInfCol.unique !== dbInfCol.unique) {
		changes.unique = {
			from: dbInfCol.unique,
			to: collectionInfCol.unique,
		};
	}

	return Object.keys(changes).length > 0
		? {
				type: "modify",
				column: collectionInfCol,
				changes,
			}
		: null;
};

export default determineColumnMods;
