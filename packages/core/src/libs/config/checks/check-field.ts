import T from "../../../translations/index.js";
import type { CFConfig, FieldTypes } from "../../custom-fields/types.js";
import type { Config } from "../../../types.js";

// TODO: Handle this within the custom field class

const checkField = (field: CFConfig<FieldTypes>, config: Config) => {
	switch (field.type) {
		case "document": {
			const allMultipleCollections = config.collections
				.filter((collection) => collection.getData.mode === "multiple")
				.map((collection) => collection.key);

			if (!allMultipleCollections.includes(field.collection)) {
				throw new Error(
					T("field_document_collection_not_found", {
						collection: field.collection,
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
