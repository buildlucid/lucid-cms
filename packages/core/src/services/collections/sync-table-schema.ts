import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import getSingleInstance from "./get-single-instance.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { CollectionBuilder } from "../../builders.js";
import type { CollectionSchema } from "../collection-migrator/schema/types.js";

const syncTableSchema: ServiceFn<
	[
		{
			key: string;
			instance?: CollectionBuilder;
		},
	],
	CollectionSchema
> = async (context, data) => {
	const Collection = Repository.get(
		"collections",
		context.db,
		context.config.db,
	);

	const collectionInstance = getSingleInstance(context, data);
	if (collectionInstance.error) return collectionInstance;

	if (collectionInstance.data.dbTableSchema) {
		return {
			error: undefined,
			data: collectionInstance.data.dbTableSchema,
		};
	}

	const schemaRes = await Collection.selectSingle({
		select: ["schema"],
		where: [
			{
				key: "key",
				operator: "=",
				value: data.key,
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (schemaRes.error) return schemaRes;

	collectionInstance.data.dbTableSchema = schemaRes.data.schema;

	return {
		error: undefined,
		data: schemaRes.data.schema,
	};
};

export default syncTableSchema;
