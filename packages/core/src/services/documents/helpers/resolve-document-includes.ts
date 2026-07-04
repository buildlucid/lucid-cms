import registeredFields, {
	registeredFieldTypes,
} from "../../../libs/collection/custom-fields/registered-fields.js";
import type { FieldTypes } from "../../../types.js";

type DocumentRefInclude = "refs" | `refs.${string}`;
type DocumentInclude = "bricks" | "meta" | DocumentRefInclude;

export type ResolvedDocumentIncludes = {
	bricks: boolean;
	refs: boolean;
	meta: boolean;
	refTypes?: FieldTypes[];
};

const refsPrefix = "refs.";

/**
 * Returns true when a typed ref include maps to a registered custom field that
 * can both fetch and format hydrated reference data.
 */
const isSupportedRefFieldType = (value: string): value is FieldTypes => {
	if (!registeredFieldTypes.includes(value as FieldTypes)) return false;

	const field = registeredFields[value as FieldTypes];
	return field.fetchRefs !== null && field.formatRef !== null;
};

/**
 * Matches the generic typed ref include syntax, such as `refs.relation` or a
 * future custom field include like `refs.product`.
 */
const isTypedRefInclude = (value: string): value is `refs.${string}` => {
	return value.startsWith(refsPrefix) && value.length > refsPrefix.length;
};

/**
 * Normalizes document include query values into service flags.
 *
 * `refs` fetches every supported ref-capable custom field, while `refs.<type>`
 * enables refs but narrows fetching to registered ref-capable field types only.
 * Unknown typed ref includes are accepted by the query layer but resolve to an
 * empty type list, so no ref rows are fetched for unsupported custom fields.
 */
const resolveDocumentIncludes = (
	include?: DocumentInclude[] | string[],
): ResolvedDocumentIncludes => {
	const includeValues = include ?? [];
	const includesAllRefs = includeValues.includes("refs");
	const requestedRefTypes = new Set<FieldTypes>();
	let hasTypedRefInclude = false;

	for (const includeValue of includeValues) {
		if (!isTypedRefInclude(includeValue)) continue;

		hasTypedRefInclude = true;
		const fieldType = includeValue.slice(refsPrefix.length);
		if (isSupportedRefFieldType(fieldType)) {
			requestedRefTypes.add(fieldType);
		}
	}

	return {
		bricks: includeValues.includes("bricks"),
		refs: includesAllRefs || hasTypedRefInclude,
		meta: includeValues.includes("meta"),
		refTypes: includesAllRefs
			? undefined
			: hasTypedRefInclude
				? [...requestedRefTypes]
				: undefined,
	};
};

export default resolveDocumentIncludes;
