import type CollectionDefinition from "../../collection/definitions/collection/index.js";
import { getFieldSetState } from "../../collection/definitions/fields/index.js";
import { translate } from "../../i18n/index.js";

const routingFieldTypes = new Set(["text", "textarea", "number"]);

/** Validates collection routing and its use by the default preview URL. */
const checkCollectionRouting = (collection: CollectionDefinition) => {
	const routing = collection.getData.routing;
	if (!routing) {
		const preview = collection.resolvedPreviewConfig;
		if (preview?.enabled && preview.url === undefined) {
			throw new Error(
				translate("server:core.config.collection.preview.routing.required", {
					data: { collection: collection.key },
				}),
			);
		}
		return;
	}

	const field = getFieldSetState(collection).fields.get(routing.field);
	if (
		field &&
		field.treeParent === null &&
		field.structuralParent === null &&
		routingFieldTypes.has(field.type)
	) {
		return;
	}

	throw new Error(
		translate("server:core.config.collection.routing.field.invalid", {
			data: {
				field: routing.field,
				collection: collection.key,
			},
		}),
	);
};

export default checkCollectionRouting;
