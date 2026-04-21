import type { ClientFieldTypeGenerator } from "../custom-fields/types.js";

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
 * Creates the collection-aware client value type for document relation fields.
 */
export const createDocumentValueFieldTypeGenerator =
	(): ClientFieldTypeGenerator<"document"> =>
	({ field }) => ({
		valueType: `Array<DocumentRelationValue<${JSON.stringify(field.collection)}>>`,
	});
