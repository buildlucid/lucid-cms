import type { ResolvedLucidConfig } from "../../../exports/types.js";
import { normalizeRelationCollections } from "../../collection/custom-fields/fields/relation/utils/normalize-relation-collections.js";
import type {
	FieldConfig,
	FieldTypes,
} from "../../collection/custom-fields/types.js";
import type CollectionDefinition from "../../collection/definitions/collection/index.js";
import { translate } from "../../i18n/index.js";
import checkRichTextField from "./check-rich-text-field.js";

// TODO: Handle this within the custom field class

/** Validates custom-field config that depends on other registered resources. */
const checkField = (
	field: FieldConfig<FieldTypes>,
	config: ResolvedLucidConfig,
	collection: CollectionDefinition,
) => {
	switch (field.type) {
		case "relation": {
			const collectionKeys = config.collections.map(
				(collection) => collection.key,
			);

			for (const collectionKey of normalizeRelationCollections(
				field.collection,
			)) {
				if (collectionKeys.includes(collectionKey)) {
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
