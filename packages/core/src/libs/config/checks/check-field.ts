import type { Config } from "../../../types.js";
import { normalizeRelationCollections } from "../../collection/custom-fields/fields/relation/utils/normalize-relation-collections.js";
import type {
	CFConfig,
	FieldTypes,
} from "../../collection/custom-fields/types.js";
import { translate } from "../../i18n/index.js";

// TODO: Handle this within the custom field class

const checkField = (field: CFConfig<FieldTypes>, config: Config) => {
	switch (field.type) {
		case "relation": {
			const allMultipleCollections = config.collections
				.filter((collection) => collection.getData.mode === "multiple")
				.map((collection) => collection.key);

			for (const collectionKey of normalizeRelationCollections(
				field.collection,
			)) {
				if (allMultipleCollections.includes(collectionKey)) {
					continue;
				}

				throw new Error(
					translate(
						"server:core.fields.relation.validation.collection.not.found",
						{
							data: {
								collection: collectionKey,
								field: field.key,
							},
						},
					),
				);
			}

			break;
		}
		default: {
			return;
		}
	}
};

export default checkField;
