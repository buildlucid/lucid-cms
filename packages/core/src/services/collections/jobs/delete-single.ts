import { CollectionsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Deletes a single collection
 */
const deleteCollection: ServiceFn<
	[
		{
			collectionKey: string;
		},
	],
	undefined
> = async (context, data) => {
	const Collections = new CollectionsRepository(context.db, context.config.db);

	const deleteRes = await Collections.deleteSingle({
		where: [
			{
				key: "key",
				operator: "=",
				value: data.collectionKey,
			},
		],
		returning: ["key"],
		validation: {
			enabled: true,
		},
	});
	if (deleteRes.error) return deleteRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteCollection;
