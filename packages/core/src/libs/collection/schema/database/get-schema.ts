import Repository from "../../../repositories/index.js";
import { getSchema as getCachedSchema } from "./cache.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import type { CollectionSchema } from "../types.js";

const getSchema: ServiceFn<
	[
		{
			collectionKey: string;
		},
	],
	CollectionSchema
> = async (context, data) => {
	const cachedSchema = getCachedSchema(data.collectionKey);
	if (cachedSchema)
		return {
			data: cachedSchema,
			error: undefined,
		};

	const Collections = Repository.get(
		"collections",
		context.db,
		context.config.db,
	);

	const result = await Collections.selectSingle({
		select: ["schema"],
		where: [{ key: "key", operator: "=", value: data.collectionKey }],
		validation: { enabled: true },
	});
	if (result.error) return result;

	return {
		data: result.data.schema,
		error: undefined,
	};
};

export default getSchema;
