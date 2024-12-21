import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../types.js";
import inferSchema from "./schema/infer-schema.js";
import type { CollectionSchema } from "./schema/types.js";
import { inspect } from "node:util";

/**
 * Infers collection schemas, works out the difference between the current collection schema and then migrates collections tables and data
 * - lucid_collection_{key}
 * - lucid_collection_{key}_versions
 * - lucid_collection_{key}_fields
 * - lucid_collection_{key}_{brick-key} * all potential bricks
 * - lucid_collection_{key}_{brick-key}_{repeater-field-key} * for each repeater for a single brick
 */
const migrateCollections: ServiceFn<[], undefined> = async (context) => {
	const SchemaRepo = Repository.get("collection-schema", context.db);

	const inferedSchemas: Array<CollectionSchema> = [];
	// for (const [_, collection] of context.config.collections.entries()) {
	// 	const res = inferSchema(collection, {
	// 		dbAdapter: context.config.db.adapter,
	// 	});
	// 	if (res.error) return res;
	// 	inferedSchemas.push(res.data);
	// }

	// @ts-expect-error
	const res = inferSchema(context.config.collections.at(0), context.config.db);
	if (res.error) return res;
	inferedSchemas.push(res.data);

	// gen checksum on schemas, use migratio details to update db
	console.log(
		inspect(inferedSchemas, {
			depth: Number.POSITIVE_INFINITY,
			colors: true,
			numericSeparator: true,
		}),
	);

	const latestSchemas = await SchemaRepo.selectLatest({
		select: ["collection_key", "schema", "checksum"],
	});
	console.log(latestSchemas[0]?.schema);

	return {
		data: undefined,
		error: undefined,
	};
};

export default migrateCollections;
