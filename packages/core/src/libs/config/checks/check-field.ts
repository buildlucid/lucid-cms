import T from "../../../translations/index.js";
import type { Config } from "../../../types.js";
import { normalizeDocumentCollections } from "../../collection/custom-fields/fields/document/utils/normalize-document-collections.js";
import type {
	CFConfig,
	FieldTypes,
} from "../../collection/custom-fields/types.js";

// TODO: Handle this within the custom field class

const checkField = (field: CFConfig<FieldTypes>, config: Config) => {
	switch (field.type) {
		case "document": {
			const allMultipleCollections = config.collections
				.filter((collection) => collection.getData.mode === "multiple")
				.map((collection) => collection.key);

			for (const collectionKey of normalizeDocumentCollections(
				field.collection,
			)) {
				if (allMultipleCollections.includes(collectionKey)) {
					continue;
				}

				throw new Error(
					T("field_document_collection_not_found", {
						collection: collectionKey,
						field: field.key,
					}),
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
