import deepMerge from "../../../utils/helpers/deep-merge.js";
import type { FieldSnapshot } from "../builders/field-builder/types.js";
import type CustomField from "./custom-field.js";
import type { FieldTypes } from "./types.js";

/** Copies field data for inspection without exposing its internal instance. */
const createFieldSnapshot = <T extends FieldTypes>(
	field: CustomField<T>,
): FieldSnapshot<T> => ({
	key: field.key,
	type: field.type,
	config: deepMerge({}, field.config),
	treeParent: field.treeParent,
	tabParent: field.tabParent,
	structuralParent: field.structuralParent,
});

export default createFieldSnapshot;
