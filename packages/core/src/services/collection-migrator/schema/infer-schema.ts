import type { CollectionSchema } from "./types.js";
import type { ServiceResponse } from "../../../types.js";
import type { CollectionBuilder } from "../../../builders.js";

/**
 * Infers the collection schema from a given CollectionBuilder instance
 */
const inferSchema = async (
	collection: CollectionBuilder,
): ServiceResponse<CollectionSchema> => {
	return {
		data: {
			key: collection.key,
		},
		error: undefined,
	};
};
