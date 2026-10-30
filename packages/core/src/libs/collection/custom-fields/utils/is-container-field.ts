import type registeredFields from "../registered-fields.js";
import { fieldHooks } from "../registered-fields.js";
import type { FieldConfig, FieldTypes } from "../types.js";

/** Field types whose `contentChildren` hook places other fields in content values instead of holding a value. */
export type ContainerFieldType = {
	[TType in FieldTypes]: (typeof registeredFields)[TType] extends {
		contentChildren: unknown;
	}
		? TType
		: never;
}[FieldTypes];

/** Whether a field holds other fields in content values rather than a value, as its `contentChildren` hook declares. */
const isContainerField = (
	field: FieldConfig<FieldTypes>,
): field is FieldConfig<ContainerFieldType> =>
	fieldHooks[field.type].contentChildren !== undefined;

export default isContainerField;
