import { type CollectionBuilder, LucidError } from "@lucidcms/core";
import { copy, translate } from "@lucidcms/core/plugin";
import type { CFConfig } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../../constants.js";
import type { CollectionConfig } from "../../types/types.js";

const segmentFieldTypes = new Set(["text", "textarea", "select", "number"]);

/** Validates generated route segment relations and their target fields. */
const checkRouteSegments = (data: {
	collection: CollectionBuilder;
	collections: CollectionBuilder[];
	config: CollectionConfig;
}) => {
	const seenRelations = new Set<string>();

	for (const segment of data.config.segments) {
		if (seenRelations.has(segment.relation)) {
			// Each relation key can contribute only one ordered route segment.
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: translate(
					copy("server:plugin.pages.config.segment.relation.duplicate", {
						defaultMessage:
							"Pages collection '{{collection}}' has duplicate route segment relation '{{relation}}'.",
						data: {
							collection: data.collection.key,
							relation: segment.relation,
						},
					}),
				),
			});
		}
		seenRelations.add(segment.relation);

		const relation = data.collection.fields.get(segment.relation);
		const relationConfig =
			relation?.type === "relation"
				? (relation.config as CFConfig<"relation">)
				: null;
		if (
			!relationConfig ||
			relation?.treeParent !== null ||
			relation?.structuralParent !== null ||
			relationConfig.multiple === true ||
			relation?.localizedEnabled ||
			relationConfig.collection.length !== 1 ||
			relationConfig.collection[0] !== segment.collection
		) {
			// The plugin must own a non-localized single relation for the segment.
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: translate(
					copy("server:plugin.pages.config.segment.relation.invalid", {
						defaultMessage:
							"Pages route segment '{{relation}}' was not registered correctly on '{{collection}}'.",
						data: {
							collection: data.collection.key,
							relation: segment.relation,
						},
					}),
				),
			});
		}

		const targetCollection = data.collections.find(
			(collection) => collection.key === segment.collection,
		);
		if (!targetCollection) {
			// Segment collections must resolve to a configured collection.
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: translate(
					copy("server:plugin.pages.config.segment.collection.not.found", {
						defaultMessage:
							"Pages route segment '{{relation}}' references unknown collection '{{targetCollection}}'.",
						data: {
							relation: segment.relation,
							targetCollection: segment.collection,
						},
					}),
				),
			});
		}

		const field = targetCollection.fields.get(segment.field);
		if (
			!field ||
			field.treeParent !== null ||
			field.structuralParent !== null ||
			!segmentFieldTypes.has(field.type)
		) {
			// Segment values must come from a directly stored scalar field.
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: translate(
					copy("server:plugin.pages.config.segment.field.invalid", {
						defaultMessage:
							"Pages route segment field '{{field}}' must be a top-level text, textarea, select, or number field on '{{targetCollection}}'.",
						data: {
							field: segment.field,
							targetCollection: segment.collection,
						},
					}),
				),
			});
		}
	}
};

export default checkRouteSegments;
