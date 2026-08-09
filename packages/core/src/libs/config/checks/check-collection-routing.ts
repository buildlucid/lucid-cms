import type CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import { translate } from "../../i18n/index.js";

const routingFieldTypes = new Set(["text", "textarea", "number"]);

/** Validates that a collection's routing field can expose a public path. */
const checkCollectionRouting = (collection: CollectionBuilder) => {
	const routing = collection.getData.routing;
	if (!routing) return;

	const field = collection.fields.get(routing.field);
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
