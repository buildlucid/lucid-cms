import type { ClientFieldTypeGenerator } from "../custom-fields/types.js";
import { stringLiteral } from "./helpers.js";

/**
 * Creates a static client field type generator for leaf field values.
 */
export const createValueFieldTypeGenerator =
	<TFieldType extends import("../custom-fields/types.js").FieldTypes>(
		valueType: string,
	): ClientFieldTypeGenerator<TFieldType> =>
	() => ({
		valueType,
	});

/**
 * Creates the collection-aware client value type for relation fields.
 */
export const createRelationValueFieldTypeGenerator =
	(): ClientFieldTypeGenerator<"relation"> =>
	({ field }) => ({
		valueType: `Array<RelationFieldValue<${renderDocumentCollectionKeys(
			field.collection,
		)}>>`,
	});

const renderDocumentCollectionKeys = (
	collection: string | string[],
): string => {
	const collectionKeys = Array.isArray(collection) ? collection : [collection];
	const uniqueKeys = Array.from(new Set(collectionKeys));

	if (uniqueKeys.length === 0) return "never";
	return uniqueKeys.map((key) => stringLiteral(key)).join(" | ");
};
