import type { ServiceFn } from "../../types.js";

/**
 * Infers collection schemas, works out the difference between the current collection schema and then migrates collections tables and data
 * - lucid_collection_{key}
 * - lucid_collection_{key}_versions
 * - lucid_collection_{key}_fields
 * - lucid_collection_{key}_{brick-key} * all potential bricks
 * - lucid_collection_{key}_{brick-key}_{repeater-field-key} * for each repeater for a single brick
 */
const migrateCollections: ServiceFn<[undefined], undefined> = async (
	context,
	data,
) => {
	return {
		data: undefined,
		error: undefined,
	};
};

export default migrateCollections;
