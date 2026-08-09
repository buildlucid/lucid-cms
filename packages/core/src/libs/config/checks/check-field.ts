import type { Config } from "../../../types.js";
import type CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import { normalizeRelationCollections } from "../../collection/custom-fields/fields/relation/utils/normalize-relation-collections.js";
import type {
	CFConfig,
	FieldTypes,
} from "../../collection/custom-fields/types.js";
import { translate } from "../../i18n/index.js";
import checkRichTextField from "./check-rich-text-field.js";

// TODO: Handle this within the custom field class

/** Validates custom-field config that depends on other registered resources. */
const checkField = (
	field: CFConfig<FieldTypes>,
	config: Config,
	collection: CollectionBuilder,
) => {
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
		case "rich-text": {
			checkRichTextField(field, config, collection);
			break;
		}
		default: {
			return;
		}
	}
};

export default checkField;
