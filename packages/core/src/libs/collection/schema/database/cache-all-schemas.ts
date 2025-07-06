import Repository from "../../../repositories/index.js";
import { schemaCache, setSchema } from "./cache.js";
import type { ServiceFn } from "../../../../utils/services/types.js";

const cacheAllSchemas: ServiceFn<
	[
		{
			collectionKeys?: string[];
		},
	],
	undefined
> = async (context, data) => {
	const keys =
		data.collectionKeys ?? context.config.collections.map((c) => c.key);
	const nonCachedKeys = keys.filter((k) => !schemaCache.has(k));

	if (nonCachedKeys.length === 0) {
		return {
			data: undefined,
			error: undefined,
		};
	}

	const Collections = Repository.get(
		"collections",
		context.db,
		context.config.db,
	);

	const collectionsRes = await Collections.selectMultiple({
		select: ["key", "schema"],
		where: [
			{
				key: "key",
				operator: "in",
				value: nonCachedKeys,
			},
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
		],
		validation: { enabled: true },
	});
	if (collectionsRes.error) return collectionsRes;

	for (const collection of collectionsRes.data) {
		if (collection.schema) {
			setSchema(collection.key, collection.schema);
		}
	}

	return {
		data: undefined,
		error: undefined,
	};
};

export default cacheAllSchemas;
